"""Backend API tests for SD ENTERPRISES Courier Billing."""
import io
import os
from datetime import date

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"


# --- Fixtures ---
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    return s


def _fy():
    d = date.today()
    if d.month >= 4:
        s, e = d.year, d.year + 1
    else:
        s, e = d.year - 1, d.year
    return f"{s}-{str(e)[-2:]}"


# --- Health ---
def test_health(client):
    r = client.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# --- Company ---
def test_company_get_default(client):
    r = client.get(f"{API}/company")
    assert r.status_code == 200
    data = r.json()
    assert "name" in data
    assert data.get("invoice_prefix") in ("SDE", data.get("invoice_prefix"))


def test_company_update(client):
    payload = {
        "name": "SD ENTERPRISES",
        "address": "123 Test Rd",
        "state": "Maharashtra",
        "state_code": "27",
        "gstin": "27ABCDE1234F1Z5",
        "pan": "ABCDE1234F",
        "bank_name": "HDFC",
        "bank_account": "1234567890",
        "bank_ifsc": "HDFC0000123",
        "bank_branch": "Andheri",
        "invoice_prefix": "SDE",
        "default_tax_rate": 18.0,
        "default_terms": "Payment within 30 days",
    }
    r = client.put(f"{API}/company", json=payload)
    assert r.status_code == 200
    data = r.json()
    for k, v in payload.items():
        assert data.get(k) == v, f"Mismatch {k}: {data.get(k)} != {v}"

    # persistence: GET again
    r2 = client.get(f"{API}/company")
    assert r2.json().get("gstin") == "27ABCDE1234F1Z5"


# --- Asset upload ---
PNG_BYTES = None  # set at import time below

def _make_png():
    global PNG_BYTES
    import base64
    # 1x1 red PNG (valid, verified via PIL)
    PNG_BYTES = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    )
_make_png()


def test_upload_logo_valid_png(client):
    files = {"file": ("logo.png", PNG_BYTES, "image/png")}
    r = client.post(f"{API}/company/assets/logo", files=files)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("logo") and data["logo"].get("filename") and data["logo"].get("mime") == "image/png"


def test_upload_logo_reject_non_image(client):
    files = {"file": ("bad.txt", b"hello", "text/plain")}
    r = client.post(f"{API}/company/assets/logo", files=files)
    assert r.status_code == 400


def test_upload_logo_reject_too_large(client):
    big = b"\x89PNG" + b"0" * (2 * 1024 * 1024 + 100)
    files = {"file": ("big.png", big, "image/png")}
    r = client.post(f"{API}/company/assets/logo", files=files)
    assert r.status_code == 400


def test_get_asset_file(client):
    r = client.get(f"{API}/company/assets/logo/file")
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("image/")


def test_upload_signature_and_stamp(client):
    for asset in ("signature", "stamp"):
        files = {"file": (f"{asset}.png", PNG_BYTES, "image/png")}
        r = client.post(f"{API}/company/assets/{asset}", files=files)
        assert r.status_code == 200, r.text


def test_delete_asset(client):
    r = client.delete(f"{API}/company/assets/stamp")
    assert r.status_code == 200
    assert r.json().get("stamp") is None


# --- Customers ---
@pytest.fixture(scope="module")
def customer_intra(client):
    payload = {"name": "TEST_CUST_Intra", "state": "Maharashtra", "state_code": "27",
               "gstin": "27AAAPL1234C1Z1", "city": "Mumbai"}
    r = client.post(f"{API}/customers", json=payload)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def customer_inter(client):
    payload = {"name": "TEST_CUST_Inter", "state": "Karnataka", "state_code": "29",
               "gstin": "29AAAPL1234C1Z1", "city": "Bengaluru"}
    r = client.post(f"{API}/customers", json=payload)
    assert r.status_code == 200
    return r.json()


def test_customer_crud(client, customer_intra):
    cid = customer_intra["id"]
    # list
    r = client.get(f"{API}/customers")
    assert r.status_code == 200
    assert any(c["id"] == cid for c in r.json())
    # update
    r = client.put(f"{API}/customers/{cid}", json={"name": "TEST_CUST_Intra_Updated",
                                                     "state_code": "27"})
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_CUST_Intra_Updated"
    # get
    assert client.get(f"{API}/customers/{cid}").json()["name"] == "TEST_CUST_Intra_Updated"


def test_customer_delete(client):
    r = client.post(f"{API}/customers", json={"name": "TEST_CUST_Del"})
    cid = r.json()["id"]
    d = client.delete(f"{API}/customers/{cid}")
    assert d.status_code == 200
    assert client.get(f"{API}/customers/{cid}").status_code == 404


# --- Partners ---
@pytest.fixture(scope="module")
def partner(client):
    r = client.post(f"{API}/partners", json={"name": "TEST_PARTNER_DTDC", "code": "DTDC"})
    assert r.status_code == 200
    return r.json()


def test_partner_crud(client, partner):
    pid = partner["id"]
    r = client.get(f"{API}/partners")
    assert any(p["id"] == pid for p in r.json())
    r = client.put(f"{API}/partners/{pid}", json={"name": "TEST_PARTNER_DTDC_U", "code": "DTDC"})
    assert r.json()["name"] == "TEST_PARTNER_DTDC_U"


# --- Invoice next number (idempotent) ---
def test_next_number_idempotent(client):
    r1 = client.get(f"{API}/invoices/next-number")
    r2 = client.get(f"{API}/invoices/next-number")
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["next_number"] == r2.json()["next_number"]
    n = r1.json()["next_number"]
    parts = n.split("/")
    assert len(parts) == 3 and parts[0] == "SDE"
    assert parts[2].isdigit() and len(parts[2]) == 4


# --- Invoice creation with GST math ---
def test_create_invoice_cgst_sgst(client, customer_intra, partner):
    payload = {
        "customer_id": customer_intra["id"],
        "items": [
            {"docket_no": "D1", "destination": "Delhi", "partner_id": partner["id"],
             "mode": "Surface", "weight": 1, "pieces": 1, "amount": 500.0}
        ],
        "gst_type": "cgst_sgst",
        "tax_rate": 18.0,
    }
    r = client.post(f"{API}/invoices", json=payload)
    assert r.status_code == 200, r.text
    inv = r.json()
    assert inv["subtotal"] == 500.0
    assert inv["cgst"] == 45.0
    assert inv["sgst"] == 45.0
    assert inv["igst"] == 0.0
    assert inv["total"] == 590.0
    assert inv["invoice_number"].startswith("SDE/") and _fy() in inv["invoice_number"]
    assert inv["items"][0].get("partner_name")  # hydrated
    return inv


def test_create_invoice_igst(client, customer_inter):
    payload = {
        "customer_id": customer_inter["id"],
        "items": [{"docket_no": "D2", "amount": 1000.0, "pieces": 1}],
        "gst_type": "igst",
        "tax_rate": 18.0,
    }
    r = client.post(f"{API}/invoices", json=payload)
    assert r.status_code == 200
    inv = r.json()
    assert inv["igst"] == 180.0
    assert inv["cgst"] == 0 and inv["sgst"] == 0
    assert inv["total"] == 1180.0


def test_create_invoice_non_gst(client, customer_intra):
    payload = {
        "customer_id": customer_intra["id"],
        "items": [{"amount": 250.0}],
        "gst_type": "none",
    }
    r = client.post(f"{API}/invoices", json=payload)
    assert r.status_code == 200
    inv = r.json()
    assert inv["total_tax"] == 0
    assert inv["total"] == 250.0


def test_invoice_number_increments(client, customer_intra):
    # create two, verify seq increments
    p = {"customer_id": customer_intra["id"], "items": [{"amount": 100.0}], "gst_type": "none"}
    a = client.post(f"{API}/invoices", json=p).json()
    b = client.post(f"{API}/invoices", json=p).json()
    seq_a = int(a["invoice_number"].split("/")[-1])
    seq_b = int(b["invoice_number"].split("/")[-1])
    assert seq_b == seq_a + 1


def test_invoice_update_and_delete(client, customer_intra):
    p = {"customer_id": customer_intra["id"], "items": [{"amount": 200.0}], "gst_type": "none"}
    inv = client.post(f"{API}/invoices", json=p).json()
    iid = inv["id"]
    # update
    update = {**p, "gst_type": "cgst_sgst", "tax_rate": 18.0,
              "items": [{"amount": 200.0}], "payment_status": "paid", "status": "issued"}
    r = client.put(f"{API}/invoices/{iid}", json=update)
    assert r.status_code == 200
    upd = r.json()
    assert upd["cgst"] == 18.0 and upd["sgst"] == 18.0
    assert upd["payment_status"] == "paid"
    # delete
    d = client.delete(f"{API}/invoices/{iid}")
    assert d.status_code == 200
    assert client.get(f"{API}/invoices/{iid}").status_code == 404


def test_invoice_pdf(client, customer_intra):
    p = {"customer_id": customer_intra["id"], "items": [{"amount": 300.0}], "gst_type": "cgst_sgst", "tax_rate": 18.0}
    inv = client.post(f"{API}/invoices", json=p).json()
    r = client.get(f"{API}/invoices/{inv['id']}/pdf")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert len(r.content) > 500


def test_invoice_bad_customer(client):
    r = client.post(f"{API}/invoices", json={"customer_id": "nonexistent",
                                             "items": [{"amount": 100}], "gst_type": "none"})
    assert r.status_code == 400


# --- Reports ---
def test_reports_summary(client):
    r = client.get(f"{API}/reports/summary")
    assert r.status_code == 200
    d = r.json()
    for k in ("totals", "gst", "top_customers", "top_partners", "monthly"):
        assert k in d
    for k in ("invoices", "gross", "taxable", "tax", "paid", "unpaid"):
        assert k in d["totals"]
    for k in ("cgst", "sgst", "igst"):
        assert k in d["gst"]


def test_reports_date_filter(client):
    r = client.get(f"{API}/reports/summary", params={"start": "2099-01-01", "end": "2099-12-31"})
    assert r.status_code == 200
    assert r.json()["totals"]["invoices"] == 0
