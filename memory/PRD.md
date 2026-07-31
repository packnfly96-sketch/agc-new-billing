# SD ENTERPRISES — Courier Billing Software

## Original problem statement
Build a production-ready Courier Billing Software for SD ENTERPRISES with:
My Company module (logo + signature + stamp + GST + bank + invoice prefix), Customer Master,
Courier Partner Master, Billing Module (GST + Non-GST), Invoice List, Edit/Delete, Print & PDF,
Reports. All data in MongoDB. Auto invoice numbering. Premium professional invoice design.
Company logo/signature/stamp render dynamically on invoices.

## Users
- Single office user (SD ENTERPRISES admin) — no auth (internal tool)

## Architecture
- Frontend: React 19 + React Router 7 + Shadcn UI + Tailwind + Sonner toasts
- Backend: FastAPI + Motor (async MongoDB) + ReportLab (PDF)
- Storage: MongoDB (`company` singleton, `customers`, `partners`, `invoices`, `counters`)
- Uploads: local filesystem `/app/backend/uploads/company/` (logo, signature, stamp)

### Backend files
- `db.py` — Mongo client, upload paths, constants
- `models.py` — Pydantic models (Company, Customer, CourierPartner, Invoice, InvoiceItem + assets)
- `routes.py` — All `/api/*` routes organized by resource
- `pdf_service.py` — Premium invoice PDF (TAX INVOICE / INVOICE modes, dynamic logo/signature/stamp)
- `server.py` — FastAPI entry point with CORS middleware

### Frontend structure
- `context/CompanyContext.jsx` — global company profile provider
- `lib/api.js` — API client (companyApi, customersApi, partnersApi, invoicesApi, reportsApi)
- `components/AppHeader.jsx` — sticky header w/ dynamic logo + navigation
- `components/BrandMark.jsx` — logo-or-name renderer
- `components/AssetUpload.jsx` — reusable logo/sig/stamp uploader (validation + live preview)
- `components/Layout.jsx` — page shell
- `pages/` — Dashboard, InvoicesList, InvoiceForm, InvoiceDetail, Customers, CourierPartners, Reports, CompanySettings

## Implemented (Feb 2026)

### My Company Settings ✅
- Legal name, address, city, state, state_code, pincode, phone, email, website
- Tax: GSTIN, PAN
- Bank: bank name, account, IFSC, branch
- Invoice defaults: prefix, default tax rate, default terms & conditions
- 3 uploadable assets (Logo, Signature, Stamp) — JPG/PNG/SVG · max 2 MB
- Live preview before saving · Replace · Remove
- Persisted in MongoDB `company` singleton (`_id: "primary"`)
- Header logo, invoice preview, printed invoice, and PDF invoice all read the same asset

### Customer Master ✅
- Full CRUD via modal dialog
- Fields: name, contact person, address, city, state, state_code, pincode, phone, email, GSTIN, PAN
- Table with hover, edit, delete actions

### Courier Partner Master ✅
- Full CRUD via modal dialog
- Fields: name, code, contact person, phone, email, address

### Billing Module (Invoice Form) ✅
- Auto-generated invoice number (`{PREFIX}/{FY}/{NNNN}`) — atomic counter per prefix+FY
- Preview of next number shown in header before create
- Customer dropdown from master
- Consignment line items: docket_no, date, destination, courier partner, mode (Surface/Air/Express/International), weight, pieces, amount
- GST type: Non-GST · CGST+SGST · IGST — auto-suggested from company vs. customer state_code
- Tax rate configurable per invoice (default from company)
- Live totals: subtotal → CGST/SGST/IGST → round off → total
- Status (draft/issued) + payment status (unpaid/partial/paid)
- Notes + Terms & Conditions (defaults from company)

### Invoice List ✅
- Table with invoice #, date, customer, GST type, payment badge, total
- Search by invoice number or customer

### Invoice Detail (Preview) ✅
- Premium layout: company logo + name + full address + GSTIN block
- INVOICE or TAX INVOICE title based on GST type
- Bill To with customer GSTIN + State Code
- Line items table (dark header, striped rows)
- Totals block with CGST/SGST or IGST breakdown, round-off, prominent total
- Bank details block
- Notes + T&C
- Signature + Stamp images with "For SD ENTERPRISES / Authorised Signatory" line
- Toolbar: Print · PDF · Edit · Delete (hidden in print via CSS)
- Print CSS hides header, nav, and toolbar

### PDF Invoice ✅
- ReportLab-based generation (`GET /api/invoices/{id}/pdf`)
- Same premium layout as preview, dynamic logo/sig/stamp from company profile
- Streamed as `application/pdf` inline

### Reports ✅
- Date range filter (from/to)
- Totals: invoices count · gross · taxable · tax · paid · outstanding
- GST summary: CGST, SGST, IGST, total tax
- Top 10 customers by billing
- Top 10 courier partners by consignment amount
- Monthly sales bar chart

## Notes / Constraints
- Indian fiscal year (Apr–Mar) applied to invoice numbering
- Auto GST determination: intra-state (same state_code) → CGST+SGST, else IGST
- SVG logos rendered in browser preview; PDF falls back to company name for SVG (ReportLab limitation)
- No authentication — single-user internal tool
EOF