"""SD ENTERPRISES — Courier Billing API entry point."""
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import client, CORS_ORIGINS
from routes import router, public_router
from routes_auth import auth_router
from auth import seed_admin, ensure_indexes

app = FastAPI(title="SD Enterprises Courier Billing")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(public_router) # public health check
app.include_router(auth_router)   # public (no auth required)
app.include_router(router)         # all other /api/* — protected via dependency

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def _startup():
    await ensure_indexes()
    await seed_admin()
    logger.info("Startup complete: indexes ensured + admin seeded.")


@app.on_event("shutdown")
async def _shutdown():
    client.close()
