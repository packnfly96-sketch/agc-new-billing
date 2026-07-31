# SD ENTERPRISES — Courier Billing Software (production-ready)

## Original problem statement
Full courier billing product with My Company (logo/signature/stamp/GST/bank/invoice prefix),
Customer Master, Courier Partner Master, Billing (GST + Non-GST), Invoice List with row actions,
Invoice Print/PDF, Reports, Monthly Excel Export, Secure JWT auth (single admin), collapsible sidebar,
premium blue/white invoice design, MongoDB persistence, no hardcoded data.

## Architecture

### Backend (`/app/backend/`)
- `server.py` — FastAPI entry, startup seeder + indexes, mounts three routers (public health, auth, protected)
- `db.py` — Mongo client, upload paths, constants
- `models.py` — Pydantic models (Company, Customer, CourierPartner, Invoice, InvoiceItem)
- `auth.py` — bcrypt hashing, JWT (HS256, 12h access token), FastAPI `get_current_user` dep (Bearer or cookie), admin seed
- `routes_auth.py` — /api/auth/* (login/logout/me/change-password/forgot-password/reset-password) with brute-force lockout
- `routes.py` — All resource routes (company/customers/partners/invoices/reports) protected via router dependency
- `pdf_service.py` — Premium blue/white A4 invoice generator using ReportLab with page-level header painter

### Frontend (`/app/frontend/src/`)
- `context/AuthContext.jsx` — JWT session in localStorage + interceptor
- `context/CompanyContext.jsx` — global company profile
- `lib/api.js` — axios instance + all API modules + `tokenStore` + 401 handler
- `components/` — `Sidebar` (collapsible), `TopBar` (user menu + change password dialog + logout),
  `Layout`, `ProtectedRoute`, `AssetUpload`, `BrandMark`
- `pages/` — Login, ForgotPassword, ResetPassword, Dashboard, InvoicesList, InvoiceForm,
  InvoiceDetail, Customers, CourierPartners, Reports, CompanySettings

## Implemented in this iteration (Feb 2026)

### Authentication ✅
- Single admin seeded from env (`ADMIN_EMAIL=packnfly96@gmail.com`, `ADMIN_PASSWORD`)
- JWT access token (12h) via Bearer + httpOnly cookie fallback (same-origin for `<img>`)
- Brute force lockout (5 attempts → 15 min per IP+email)
- Change password (authenticated)
- Forgot password → generates reset token (returned to admin; no email service)
- Reset password (with token, min 8 chars)
- All /api/* except /api/ and /api/auth/* require auth
- ProtectedRoute wraps all app pages; 401 auto-redirects to /login

### Premium blue/white invoice design ✅
- Blue banner header with gradient + subtle grid pattern
- GSTIN / PAN / State Code strip below header
- Bill To + meta grid (Place of Supply / Fiscal Year / Status / Payment)
- Blue-header items table with zebra rows
- Prominent totals card (Grand Total on solid blue bar)
- Bank details + Notes + T&C + Signature/Stamp + "For SD ENTERPRISES / Authorised Signatory"
- **PDF matches preview**: page-level header painter draws same blue band on every page (multi-page invoices supported)
- Print CSS hides all app chrome and preserves blue backgrounds

### Invoice List improvements ✅
- **Row actions**: View, Edit, PDF (inline icons) + kebab menu (Print, Duplicate, Delete)
- **Search** (invoice # or customer name)
- **Filters**: Invoice #, Customer, Date range (from/to), Payment status
- **Pagination** (10/20/50/100 per page, prev/next)
- **Sorting** on Invoice #, Date, Customer, Total (click column header)
- Clear filters button, row count badge
- Auto-print via `?print=1` query param when opened from list

### Monthly Excel Export ✅
- Inline month + year picker + "Export Excel" button on Invoices list
- Backend `/api/reports/monthly-excel?year=YYYY&month=MM`
- openpyxl generates styled xlsx: title band, blue header row, all invoices for month with
  Invoice #, Date, Customer, Courier Partner(s), Pcs, Weight, Amount, GST, Round-off, Grand Total
- Bold totals row at bottom with sums
- Frozen header, professional column widths, INR number format

### Duplicate Invoice ✅
- Backend `POST /api/invoices/{id}/duplicate` creates a copy as draft with new invoice number
- Available from row action menu and invoice detail toolbar
- Routes to /edit for review

### UI overhaul — commercial software look ✅
- Left collapsible dark sidebar with brand block, icons, active-state accent bar
- Sticky white/blur top bar with user avatar + dropdown (name, email, Change password, Sign out)
- Blue primary color throughout, hover states, focus rings, subtle transitions
- IBM Plex Sans body / Outfit headings retained; JetBrains Mono for numbers

### Robustness ✅
- Upload validates image bytes with Pillow.verify() to prevent corrupt files
- PDF asset loader wrapped in try/except → falls back to text if image can't decode
- `_next_invoice_number` uses atomic `find_one_and_update` with `ReturnDocument.AFTER`
- Dialog components have DialogDescription for a11y
- Loading states on Login, InvoiceDetail

## Data Model (Mongo)
- `users` — single admin (email unique index)
- `company` — singleton `_id="primary"` with logo/signature/stamp assets
- `customers`, `partners`, `invoices` — resource collections
- `counters` — atomic invoice sequence `invoice::{PREFIX}::{FY}`
- `login_attempts` — brute-force tracker
- `password_reset_tokens` — TTL indexed on expires_at

## Endpoints (all `/api/`)
### Public
- `GET /` — health
- `POST /auth/login`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`

### Authenticated
- `GET /auth/me`, `POST /auth/change-password`
- `GET/PUT /company`, `POST/DELETE /company/assets/{logo|signature|stamp}`, `GET /company/assets/{type}/file`
- `GET/POST /customers`, `GET/PUT/DELETE /customers/{id}`
- `GET/POST /partners`, `GET/PUT/DELETE /partners/{id}`
- `GET /invoices/next-number`, `GET/POST /invoices`, `GET/PUT/DELETE /invoices/{id}`
- `POST /invoices/{id}/duplicate`, `GET /invoices/{id}/pdf`
- `GET /reports/summary`, `GET /reports/monthly-excel?year=&month=`
