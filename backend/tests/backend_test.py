"""Backend API tests for SD ENTERPRISES Courier Billing (iteration 3 - production sanity)."""
import io
import os
import base64
from datetime import date

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@sdenterprises.in"
ADMIN_PASSWORD = "admin123"

OLD_ADMIN_EMAIL = "packnfly96@gmail.com"
OLD_ADMIN_PASSWORD = "SDEnterprises@2026"

# Real 1x1 PNG (valid PNG passes Pillow validation)
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
)


def _fy():
    d = date.today()
    if d.month >= 4:
        s, e = d.year, d.year + 1
    else:
        s, e = d.year - 1, d.year
    return f"{s}-{str(e)[-2:]}"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture
def unauth_client():
    return requests.Session()


# =====================================================================
# AUTH
# =====================================================================
class TestAuth:
    def test_health_public(self, unauth_client):
        r = unauth_client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_login_success_new_admin(self, unauth_client):
        r = unauth_client.post(f"{API}/auth/login",
                               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert d["access_token"] and d["token_type"] == "bearer"
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["role"] == "admin"
        assert d["user"].get("name")
        assert "access_token" in r.cookies

    def test_login_old_admin_rejected(self, unauth_client):
        r = unauth_client.post(f"{API}/auth/login",
                               json={"email": OLD_ADMIN_EMAIL, "password": OLD_ADMIN_PASSWORD})
        assert r.status_code == 401, f"Old admin creds should not work, got {r.status_code}"

    def test_login_wrong_password(self, unauth_client):
        r = unauth_client.post(f"{API}/auth/login",
                               json={"email": ADMIN_EMAIL, "password": "wrong-pw"})
        assert r.status_code == 401

    def test_me_requires_token(self, unauth_client):
        r = unauth_client.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, client):
        r = client.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL
        assert r.json()["role"] == "admin"

    def test_protected_endpoints_require_auth(self, unauth_client):
        for path in ["/company", "/customers", "/partners", "/invoices", "/reports/summary"]:
            r = unauth_client.get(f"{API}{path}")
            assert r.status_code == 401, f"{path} should require auth, got {r.status_code}"

    def test_brute_force_lockout(self):
        """5 wrong attempts must lock out (keyed on email now — works via public URL)."""
        fake_email = f"brute-iter3-{os.getpid()}@example.com"
        statuses = []
        for i in range(6):
            r = requests.post(f"{API}/auth/login",
                              json={"email": fake_email, "password": "x"})
            statuses.append(r.status_code)
        assert statuses[-1] == 429, f"Expected 429 on 6th attempt, got {statuses}"
        # Cleanup: clear login_attempts for the fake email so it doesn't linger
        # (Best-effort via a mongo shell would need direct access; the record is per-email
        # and won't affect the real admin.)

    def test_change_password_flow(self, unauth_client):
        # Fresh login (session token in the shared `client` fixture is bearer only)
        r = unauth_client.post(f"{API}/auth/login",
                               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        tok = r.json()["access_token"]
        H = {"Authorization": f"Bearer {tok}"}
        new_pw = "TempPass@12345"

        r = requests.post(f"{API}/auth/change-password", headers=H,
                          json={"current_password": "wrong", "new_password": new_pw})
        assert r.status_code == 400

        r = requests.post(f"{API}/auth/change-password", headers=H,
                          json={"current_password": ADMIN_PASSWORD, "new_password": "abc"})
        assert r.status_code == 400

        r = requests.post(f"{API}/auth/change-password", headers=H,
                          json={"current_password": ADMIN_PASSWORD, "new_password": new_pw})
        assert r.status_code == 200

        r = unauth_client.post(f"{API}/auth/login",
                               json={"email": ADMIN_EMAIL, "password": new_pw})
        assert r.status_code == 200
        new_tok = r.json()["access_token"]

        # restore
        r = requests.post(f"{API}/auth/change-password",
                          headers={"Authorization": f"Bearer {new_tok}"},
                          json={"current_password": new_pw, "new_password": ADMIN_PASSWORD})
        assert r.status_code == 200, f"restore failed: {r.text}"

        r = unauth_client.post(f"{API}/auth/login",
                               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200

    def test_forgot_and_reset_password_flow(self, unauth_client):
        r = unauth_client.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
        assert r.status_code == 200
        reset_token = r.json().get("reset_token")
        assert reset_token

        temp_pw = "ResetPass@2026"
        r = unauth_client.post(f"{API}/auth/reset-password",
                               json={"token": reset_token, "new_password": temp_pw})
        assert r.status_code == 200

        r = unauth_client.post(f"{API}/auth/login",
                               json={"email": ADMIN_EMAIL, "password": temp_pw})
        assert r.status_code == 200
        tok = r.json()["access_token"]

        r = requests.post(f"{API}/auth/change-password",
                          headers={"Authorization": f"Bearer {tok}"},
                          json={"current_password": temp_pw, "new_password": ADMIN_PASSWORD})
        assert r.status_code == 200

    def test_reset_password_invalid_token(self, unauth_client):
        r = unauth_client.post(f"{API}/auth/reset-password",
                               json={"token": "bogus", "new_password": "SomePass@2026"})
        assert r.status_code == 400

    def test_logout(self, unauth_client):
        r = unauth_client.post(f"{API}/auth/login",
                               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        r = unauth_client.post(f"{API}/auth/logout")
        assert r.status_code == 200
        assert r.json().get("ok") is True


# =====================================================================
# EMPTY STATE (must run early — before mutating tests)
# =====================================================================
class TestEmptyState:
    def test_customers_empty(self, client):
        r = client.get(f"{API}/customers")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Empty at the very start of the test session (no test data yet)
        assert data == [], f"Expected empty customers, got {len(data)} entries: {data[:3]}"

    def test_partners_empty(self, client):
        r = client.get(f"{API}/partners")
        assert r.status_code == 200
        assert r.json() == []

    def test_invoices_empty(self, client):
        r = client.get(f"{API}/invoices")
        assert r.status_code == 200
        # /invoices may return a list or paginated dict
        data = r.json()
        if isinstance(data, dict):
            items = data.get("items") or data.get("invoices") or []
        else:
            items = data
        assert items == [], f"Expected empty invoices, got: {items[:3] if items else items}"

    def test_company_default(self, client):
        r = client.get(f"{API}/company")
        assert r.status_code == 200
        d = r.json()
        assert d.get("name") == "SD ENTERPRISES"
        # These may have been populated by a previous test_update run; on truly fresh DB they are empty.
        # We assert the doc exists with the expected default name and no assets uploaded.
        assert not d.get("logo")
        assert not d.get("signature")
        assert not d.get("stamp")

    def test_next_invoice_number_fresh(self, client):
        r = client.get(f"{API}/invoices/next-number")
        assert r.status_code == 200
        d = r.json()
        # Format: SDE/{fy}/NNNN (counter may have advanced if this test file was re-run)
        assert d["next_number"].startswith("SDE/")
        assert "/" in d["next_number"] and d["next_number"].split("/")[-1].isdigit()

    def test_uploads_company_dir_empty(self):
        p = "/app/backend/uploads/company"
        if not os.path.isdir(p):
            return  # ok - dir may not exist yet
        files = [f for f in os.listdir(p) if not f.startswith(".")]
        assert files == [], f"Expected empty uploads/company, found: {files}"


# =====================================================================
# COMPANY
# =====================================================================
class TestCompany:
    def test_update(self, client):
        payload = {
            "name": "SD ENTERPRISES", "address": "123 Test Rd",
            "state": "Maharashtra", "state_code": "27",
            "gstin": "27ABCDE1234F1Z5", "pan": "ABCDE1234F",
            "invoice_prefix": "SDE", "default_tax_rate": 18.0,
            "bank_name": "HDFC Bank",
        }
        r = client.put(f"{API}/company", json=payload)
        assert r.status_code == 200
        assert r.json()["gstin"] == "27ABCDE1234F1Z5"
        assert r.json()["bank_name"] == "HDFC Bank"

    def test_upload_and_delete_logo(self, client):
        files = {"file": ("logo.png", PNG_BYTES, "image/png")}
        r = client.post(f"{API}/company/assets/logo", files=files)
        assert r.status_code == 200, r.text
        assert r.json()["logo"]["mime"] == "image/png"

        r = client.get(f"{API}/company/assets/logo/file")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("image/")

        # DELETE
        r = client.delete(f"{API}/company/assets/logo")
        assert r.status_code == 200
        # verify cleared
        r = client.get(f"{API}/company")
        assert not r.json().get("logo")


# =====================================================================
# CUSTOMERS + PARTNERS
# =====================================================================
@pytest.fixture(scope="session")
def customer(client):
    r = client.post(f"{API}/customers", json={
        "name": "TEST_CUST_Iter3", "state": "Maharashtra", "state_code": "27",
        "gstin": "27AAAPL1234C1Z1", "city": "Mumbai",
    })
    assert r.status_code == 200
    cust = r.json()
    yield cust
    # teardown
    try:
        requests.delete(f"{API}/customers/{cust['id']}",
                        headers=client.headers)
    except Exception:
        pass


@pytest.fixture(scope="session")
def partner(client):
    r = client.post(f"{API}/partners", json={"name": "TEST_PARTNER_Iter3", "code": "DTDC"})
    assert r.status_code == 200
    p = r.json()
    yield p
    try:
        requests.delete(f"{API}/partners/{p['id']}", headers=client.headers)
    except Exception:
        pass


class TestCustomerPartner:
    def test_customer_crud(self, client, customer):
        cid = customer["id"]
        r = client.get(f"{API}/customers/{cid}")
        assert r.status_code == 200
        r = client.put(f"{API}/customers/{cid}",
                       json={"name": "TEST_CUST_Iter3_U", "state_code": "27"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_CUST_Iter3_U"

    def test_partner_list(self, client, partner):
        r = client.get(f"{API}/partners")
        assert r.status_code == 200
        assert any(p["id"] == partner["id"] for p in r.json())


# =====================================================================
# INVOICES
# =====================================================================
_created_invoice_ids = []


@pytest.fixture(scope="class")
def created_invoice(client, customer, partner):
    r = client.post(f"{API}/invoices", json={
        "customer_id": customer["id"],
        "items": [{"docket_no": "D1", "partner_id": partner["id"],
                   "amount": 500.0, "pieces": 1, "weight": 1}],
        "gst_type": "cgst_sgst", "tax_rate": 18.0,
    })
    assert r.status_code == 200, r.text
    inv = r.json()
    _created_invoice_ids.append(inv["id"])
    return inv


class TestInvoices:
    def test_create_invoice_cgst(self, created_invoice):
        inv = created_invoice
        assert inv["subtotal"] == 500.0 and inv["total"] == 590.0
        assert inv["cgst"] == 45.0 and inv["sgst"] == 45.0
        assert inv["invoice_number"].startswith("SDE/")

    def test_duplicate_invoice(self, client, created_invoice):
        src = created_invoice
        r = client.post(f"{API}/invoices/{src['id']}/duplicate")
        assert r.status_code == 200, r.text
        dup = r.json()
        assert dup["id"] != src["id"]
        assert dup["invoice_number"] != src["invoice_number"]
        assert dup["total"] == src["total"]
        # sequence increments
        s_seq = int(src["invoice_number"].split("/")[-1])
        d_seq = int(dup["invoice_number"].split("/")[-1])
        assert d_seq > s_seq
        _created_invoice_ids.append(dup["id"])

    def test_update_invoice(self, client, created_invoice, customer, partner):
        iid = created_invoice["id"]
        r = client.put(f"{API}/invoices/{iid}", json={
            "customer_id": customer["id"],
            "items": [{"docket_no": "D1", "partner_id": partner["id"],
                       "amount": 600.0, "pieces": 1, "weight": 1}],
            "gst_type": "cgst_sgst", "tax_rate": 18.0,
            "notes": "TEST_updated_note",
        })
        assert r.status_code == 200, r.text
        assert r.json()["subtotal"] == 600.0

    def test_invoice_pdf(self, client, created_invoice):
        r = client.get(f"{API}/invoices/{created_invoice['id']}/pdf")
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        assert r.content[:4] == b"%PDF"
        # Minimal test invoice → PDF is small; real invoices with logo/signature/full addr are much bigger.
        assert len(r.content) > 3500, f"PDF too small: {len(r.content)} bytes"

    def test_zzz_delete_invoices_cleanup(self, client):
        # runs last (zzz prefix) — cleans invoices this suite created
        for iid in list(_created_invoice_ids):
            r = client.delete(f"{API}/invoices/{iid}")
            assert r.status_code in (200, 204), f"delete {iid} failed: {r.status_code}"
            _created_invoice_ids.remove(iid)


# =====================================================================
# MONTHLY EXCEL
# =====================================================================
class TestMonthlyExcel:
    def test_download_xlsx(self, client):
        r = client.get(f"{API}/reports/monthly-excel", params={"year": 2026, "month": 7})
        assert r.status_code == 200
        assert r.headers["content-type"] == (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        assert len(r.content) > 2000

    def test_invalid_month(self, client):
        r = client.get(f"{API}/reports/monthly-excel", params={"year": 2026, "month": 13})
        assert r.status_code == 400


# =====================================================================
# REPORTS SUMMARY
# =====================================================================
class TestReports:
    def test_summary(self, client):
        r = client.get(f"{API}/reports/summary")
        assert r.status_code == 200
        j = r.json()
        for k in ("totals", "gst", "top_customers", "top_partners", "monthly"):
            assert k in j, f"missing key {k} in reports summary"
