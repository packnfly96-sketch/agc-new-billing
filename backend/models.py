"""Pydantic models for the courier billing application."""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# --------------------- Company ---------------------
class CompanyAsset(BaseModel):
    """Represents a single uploaded asset (logo/signature/stamp)."""
    filename: str
    mime: str


class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=new_id)
    name: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    state_code: str = ""  # GST state code, e.g., "27" for Maharashtra
    pincode: str = ""
    phone: str = ""
    email: str = ""
    gstin: str = ""
    pan: str = ""
    website: str = ""

    # Bank details
    bank_name: str = ""
    bank_account: str = ""
    bank_ifsc: str = ""
    bank_branch: str = ""

    # Invoice defaults
    invoice_prefix: str = "SDE"
    default_terms: str = ""
    default_tax_rate: float = 18.0

    # Assets
    logo: Optional[CompanyAsset] = None
    signature: Optional[CompanyAsset] = None
    stamp: Optional[CompanyAsset] = None

    updated_at: str = Field(default_factory=now_iso)


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    website: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    invoice_prefix: Optional[str] = None
    default_terms: Optional[str] = None
    default_tax_rate: Optional[float] = None


# --------------------- Customer ---------------------
class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    contact_person: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    state_code: str = ""
    pincode: str = ""
    phone: str = ""
    email: str = ""
    gstin: str = ""
    pan: str = ""
    created_at: str = Field(default_factory=now_iso)


class CustomerCreate(BaseModel):
    name: str
    contact_person: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    state_code: str = ""
    pincode: str = ""
    phone: str = ""
    email: str = ""
    gstin: str = ""
    pan: str = ""


# --------------------- Courier Partner ---------------------
class CourierPartner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    code: str = ""
    contact_person: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    created_at: str = Field(default_factory=now_iso)


class CourierPartnerCreate(BaseModel):
    name: str
    code: str = ""
    contact_person: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""


# --------------------- Invoice ---------------------
class InvoiceItem(BaseModel):
    docket_no: str = ""
    date: str = ""
    destination: str = ""
    partner_id: str = ""
    partner_name: str = ""  # snapshot
    mode: str = "Surface"  # Surface | Air | Express | International
    weight: float = 0
    pieces: int = 1
    amount: float = 0


class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=new_id)
    invoice_number: str
    fiscal_year: str  # e.g., "2025-26"
    invoice_date: str  # YYYY-MM-DD
    due_date: str = ""

    # Customer snapshot at time of invoicing
    customer_id: str
    customer_name: str
    customer_address: str = ""
    customer_city: str = ""
    customer_state: str = ""
    customer_state_code: str = ""
    customer_pincode: str = ""
    customer_gstin: str = ""
    customer_phone: str = ""
    customer_email: str = ""

    items: List[InvoiceItem] = []

    # Tax
    gst_type: str = "none"  # none | cgst_sgst | igst
    tax_rate: float = 18.0

    # Totals (computed & stored)
    subtotal: float = 0
    cgst: float = 0
    sgst: float = 0
    igst: float = 0
    total_tax: float = 0
    round_off: float = 0
    total: float = 0

    notes: str = ""
    terms: str = ""

    status: str = "draft"  # draft | issued
    payment_status: str = "unpaid"  # unpaid | paid | partial

    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class InvoiceCreate(BaseModel):
    invoice_date: Optional[str] = None
    due_date: str = ""
    customer_id: str
    items: List[InvoiceItem] = []
    gst_type: str = "none"
    tax_rate: float = 18.0
    notes: str = ""
    terms: str = ""
    status: str = "draft"
    payment_status: str = "unpaid"
