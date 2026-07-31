# SD ENTERPRISES — Courier Billing Software (Version 1.0)

## Status: **Production-ready** · 30/30 backend pytest · 100% frontend flows

## Default Admin Credentials
- Email: `admin@sdenterprises.in`
- Password: `admin123`
- Change via `/app/backend/.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) or in-app "Change password"

## Architecture

### Backend (`/app/backend/`)
- `server.py` — FastAPI entry; startup: seed admin + indexes; mounts public health, auth, and protected routers
- `db.py` — Mongo client + upload paths + constants
- `models.py` — Pydantic models (Company, Customer, CourierPartner, Invoice, InvoiceItem)
- `auth.py` — bcrypt hashing, JWT (HS256, 12h), `get_current_user` dep, admin seeder
- `routes_auth.py` — `/api/auth/*` (login, logout, me, change/forgot/reset password) with email-keyed brute-force lockout (5 attempts / 15 min)
- `routes.py` — Protected routes for company, customers, partners, invoices, reports, monthly-excel export
- `pdf_service.py` — Blue/white A4 invoice PDF (page-level painter for multi-page)

### Frontend (`/app/frontend/src/`)
- `context/AuthContext.jsx`, `context/CompanyContext.jsx`
- `lib/api.js` — axios + tokenStore + 401 interceptor + all API modules
- `components/` — Sidebar (collapsible), TopBar (avatar + change-password + logout), Layout, ProtectedRoute, AssetUpload, BrandMark
- `pages/` — Login, ForgotPassword, ResetPassword, Dashboard, InvoicesList, InvoiceForm, InvoiceDetail, Customers, CourierPartners, Reports, CompanySettings

## Modules
| Module | State |
| --- | --- |
| Authentication (JWT single admin, login/logout/change/forgot/reset) | ✅ |
| My Company Settings (logo + signature + stamp + GST + PAN + bank + invoice prefix + defaults) | ✅ |
| Customer Master (full CRUD) | ✅ |
| Courier Partner Master (full CRUD) | ✅ |
| Billing Module (GST + Non-GST, auto invoice #, live totals, GST auto-suggest) | ✅ |
| Invoice List (search + 4 filters + sortable columns + pagination + row actions + kebab menu) | ✅ |
| Invoice View / Print / PDF / Duplicate / Delete | ✅ |
| Blue/white premium invoice preview + matching PDF | ✅ |
| Reports (totals + GST + top customers/partners + monthly bar) | ✅ |
| Monthly Excel Export (styled xlsx with header + rows + totals) | ✅ |

## Production State (verified after final cleanup)
- Only the seeded admin user in `users` collection
- `company` doc auto-created with defaults on first read (name = "SD ENTERPRISES", no assets)
- `customers`, `partners`, `invoices`, `counters` are all empty
- Upload directory `/app/backend/uploads/company/` is empty
- Next invoice number will be `SDE/2026-27/0001` on the very first invoice
- No dummy/demo data anywhere

## Env variables (`/app/backend/.env`)
- `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS` (protected — do not touch)
- `JWT_SECRET` — 64-char hex secret for signing tokens
- `ADMIN_EMAIL` — seeded admin email
- `ADMIN_PASSWORD` — seeded admin password (re-hashed on every backend start if changed)
- `ADMIN_NAME` — display name

## To deploy / GitHub push
Use the **"Save to GitHub"** button in the Emergent UI (top-right). The coding agent cannot push directly.
