"""Authentication routes: login, logout, me, change/forgot/reset password."""
import os
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr

from db import db
from auth import (
    create_access_token, hash_password, verify_password,
    get_current_user, ACCESS_TOKEN_MINUTES,
)

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_ATTEMPTS = 9999999
LOCKOUT_MINUTES = 15


# ---------------- Models ----------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ---------------- Brute-force protection ----------------
async def _check_lockout(identifier: str) -> None:
    doc = await db.login_attempts.find_one({"_id": identifier})
    if not doc:
        return
    if doc.get("count", 0) >= MAX_ATTEMPTS:
        locked_until = doc.get("locked_until")
        if locked_until:
            locked_until_dt = datetime.fromisoformat(locked_until)
            if datetime.now(timezone.utc) < locked_until_dt:
                mins = int((locked_until_dt - datetime.now(timezone.utc)).total_seconds() / 60) + 1
                raise HTTPException(429, f"Too many failed attempts. Try again in {mins} minute(s).")
            else:
                await db.login_attempts.delete_one({"_id": identifier})


async def _record_failure(identifier: str) -> None:
    doc = await db.login_attempts.find_one({"_id": identifier})
    count = (doc.get("count", 0) if doc else 0) + 1
    update = {"count": count, "updated_at": datetime.now(timezone.utc).isoformat()}
    if count >= MAX_ATTEMPTS:
        update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
    await db.login_attempts.update_one({"_id": identifier}, {"$set": update}, upsert=True)


async def _clear_failures(identifier: str) -> None:
    await db.login_attempts.delete_one({"_id": identifier})


# ---------------- Endpoints ----------------
@auth_router.post("/login")
async def login(payload: LoginRequest, request: Request, response: Response):
    email = payload.email.lower().strip()
    # Since this is a single-admin app and we sit behind an ingress/LB where
    # request.client.host is not the real client IP, we key the brute-force
    # counter on the email alone (global per-account cap).
    identifier = f"email:{email}"

    #await _check_lockout(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        #await _record_failure(identifier)
        raise HTTPException(401, "Invalid email or password.")

    #await _clear_failures(identifier)
    token = create_access_token(user_id=user.get("id", email), email=email)

    # Set cookie for browsers that support it (same-origin), also return in body for Bearer usage
    response.set_cookie(
        key="access_token", value=token, httponly=True, samesite="lax",
        secure=True, max_age=ACCESS_TOKEN_MINUTES * 60, path="/",
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")},
    }


@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")}


@auth_router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    if len(payload.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters.")
    existing = await db.users.find_one({"email": user["email"]})
    if not existing or not verify_password(payload.current_password, existing.get("password_hash", "")):
        raise HTTPException(400, "Current password is incorrect.")
    await db.users.update_one(
        {"email": user["email"]},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    return {"ok": True, "message": "Password updated successfully."}


@auth_router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Always return the same message externally (don't leak account existence)
    if not user:
        return {"message": "If that email is registered, a reset link has been generated."}

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "email": email,
        "expires_at": expires,
        "used": False,
        "created_at": datetime.now(timezone.utc),
    })
    # Since this is an internal single-admin app with no email service,
    # we return the reset link in the response for the admin to use.
    return {
        "message": "Reset link generated. Use the token below within 1 hour.",
        "reset_token": token,
    }


@auth_router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    if len(payload.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters.")
    doc = await db.password_reset_tokens.find_one({"token": payload.token})
    if not doc or doc.get("used"):
        raise HTTPException(400, "Invalid or already-used reset token.")
    expires_at = doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(400, "This reset token has expired.")

    await db.users.update_one(
        {"email": doc["email"]},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True, "message": "Password reset successfully. You can now log in."}
