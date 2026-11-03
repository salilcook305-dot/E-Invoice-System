# Electronic Invoicing System (EIS)
**AI Samrat Project • Secure, Tamper-Proof Invoicing Platform**

An automated, tamper-proof electronic invoicing system built with **Django REST Framework (DRF)**, **React + Vite + Tailwind CSS**, and an **SQLite** database. Designed to automate invoice creation, cryptographic PDF delivery, and payment tracking with built-in fraud and tamper prevention.

---

## 🏛️ System Architecture Flow

```
         USER
          │
          ▼
      FRONTEND
  React + Vite + Tailwind (Presentation: Displays Data Only)
          │  JSON over HTTP (JWT in Authorization Header)
          ▼
       REST API
   Django REST Framework (Logic: Auth, Validation, Calculations, PDF)
          │
    ┌─────┼───────────┐
    ▼     ▼           ▼
  AUTH  BUSINESS    SECURITY
        LOGIC
    │     │           │
    │     ├── Customers
    │     ├── Products
    │     ├── Invoices
    │     ├── Payments
    │     └── PDF & Email
    │                 │
    └────────┬────────┘
             ▼
          SQLITE
         DATABASE (Customers, Invoices, Payments, Simple-History Audit)
```

> **Core Philosophy**: *"React shows, Django decides. Never trust the client. Never delete financial records. Log every change."*

---

## 📂 Project Directory Structure

```
Electronic-Invoicing-System/
├── frontend/                     # React + Vite + Tailwind CSS Frontend
│   ├── dashboard/                # KPI cards, metrics, monthly billing trend chart
│   ├── authentication/           # JWT login screen with role recognition & quick-fill
│   ├── customers/                # Customer directory, GSTIN/PAN validations, soft-delete
│   ├── products/                 # Product catalog, SKU, unit rates, statutory GST selector
│   ├── invoices/                 # Invoice list, line item creator, PDF/Email/Void detail view
│   ├── payments/                 # Payments ledger, overpayment prevention banner
│   └── verification/             # Public/Staff SHA-256 tamper verification engine
├── backend/                      # Django REST Framework Backend
│   ├── api/                      # Central API routers & endpoint registrations
│   ├── authentication/           # Custom User model (Admin/Staff), JWT serializers
│   ├── customers/                # Customer models, serializers, and soft-delete viewset
│   ├── products/                 # Product catalog models and views
│   ├── invoices/                 # Nested line items, status machine, issue/void endpoints
│   ├── payments/                 # Payment transaction records & balance updates
│   ├── pdf_generation/           # xhtml2pdf binary rendering & SHA-256 header injection
│   ├── email/                    # Automated transactional invoice email service
│   ├── validation/               # Server-side math calculation engine (subtotal, GST, balance)
│   └── audit_log/                # Immutable audit log recorder and read-only viewset
├── database/                     # Database schemas & fixtures
│   ├── schema/                   # SQL DDL schemas for all tables
│   │   ├── customers/            # Customers SQL table definition
│   │   ├── products/             # Products SQL table definition
│   │   ├── invoices/             # Invoices & Line Items SQL table definitions
│   │   ├── payments/             # Payments SQL table definition
│   │   └── audit_history/        # Audit Log SQL table definition
│   └── seed_data/                # Database seed runner with realistic initial data
├── security/                     # Security & Integrity Modules
│   ├── jwt_authentication/       # Short-lived JWT access tokens with embedded role claims
│   ├── role_based_access/        # IsAdminRole, IsStaffOrAdmin, CanVoidInvoice permissions
│   ├── pdf_hashing/              # SHA-256 cryptographic digest computation & check
│   ├── data_immutability/        # Enforces invoice immutability on finalized records
│   └── input_validation/         # GSTIN, PAN, phone, and decimal format validators
├── utilities/                    # Standalone utility modules
│   ├── pdf_generator/            # HTML-to-PDF template & xhtml2pdf generation
│   ├── email_service/            # Transactional email sender with PDF attachments
│   └── sha256_verification/      # Document verification service
├── config/                       # Project configuration
│   ├── settings/                 # Django settings (base.py)
│   └── environment_variables/    # .env and .env.example
├── tests/                        # Automated unit & security test suite
├── requirements.txt              # Python dependencies
└── README.md                     # Documentation
```

---

## 🔒 Security & Fraud Prevention Features

1. **Backend-Only Calculations**:
   - Subtotal, GST (0%, 5%, 12%, 18%, 28%), line item totals, discount deductions, and remaining balances are calculated exclusively by Django. The frontend cannot manipulate financial figures.
2. **SHA-256 PDF Tamper Protection**:
   - When an invoice is issued, its binary representation is digested into a 64-character SHA-256 cryptographic fingerprint (`pdf_hash`).
   - Any modification of invoice values (even 1 cent or a single letter) produces a completely different hash, failing verification.
3. **Overpayment Blocking**:
   - The system validates that incoming payments never exceed the remaining balance (`total_amount - sum(payments)`). Payments exceeding the balance are rejected with HTTP 400.
4. **Data Immutability & Soft Deletion**:
   - Invoices in `ISSUED`, `PARTIALLY_PAID`, `PAID`, or `OVERDUE` states cannot have line items, rates, or customers edited.
   - Deletions are implemented as soft deletes (`is_deleted=True`), preserving the entire financial paper trail and audit history.
5. **Role-Based Access Control (RBAC)**:
   - **ADMIN**: Full access, user creation, voiding/cancelling finalized invoices with audit reasons, viewing full audit trails.
   - **STAFF**: Operational access (creating customers, products, creating and issuing draft invoices, recording payments, downloading PDFs, verifying documents).
6. **Immutable Audit Trail**:
   - Every creation, modification, status transition, payment, and security verification is automatically logged with the user, timestamp, IP address, and payload diff.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**

### 2. Backend Setup

```bash
# Install or update Python dependencies
python -m pip install --upgrade -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Seed database with realistic demo accounts, customers, products, and invoices
python database/seed_data/seed_runner.py

# Start Django development server
python manage.py runserver 127.0.0.1:8000
```

### 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies (already installed)
npm install

# Start Vite development server
npm run dev
```

The frontend will run at `http://localhost:5173` (proxied to backend at `http://127.0.0.1:8000`).

---

## 🔑 Test Credentials

| Role | Username | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin` | `Admin@12345` | Full administrative access, voiding invoices, user management, audit logs |
| **Staff** | `staff` | `Staff@12345` | Operational billing, invoice creation, payment recording, PDF export |

*(Quick 1-click test credentials are also available directly on the login screen).*

---

## 🧪 Running Security & System Tests

To run the comprehensive automated test suite verifying calculation accuracy, overpayment prevention, immutability, and SHA-256 tamper verification:

```bash
python manage.py test tests
```

---

## 📡 API Reference Overview

| Endpoint | Method | Description | Permission |
|---|---|---|---|
| `/api/auth/login/` | `POST` | Authenticate user & obtain JWT tokens | Public |
| `/api/auth/token/refresh/` | `POST` | Refresh expired access token | Public |
| `/api/auth/me/` | `GET` | Get current user profile and permissions | Authenticated |
| `/api/customers/` | `GET`, `POST` | List and create client organizations | Staff or Admin |
| `/api/customers/{id}/` | `GET`, `PUT`, `DELETE` | Retrieve, update, soft-delete customer | Staff or Admin |
| `/api/products/` | `GET`, `POST` | List and create catalog products | Staff or Admin |
| `/api/invoices/` | `GET`, `POST` | List invoices and create new draft invoice | Staff or Admin |
| `/api/invoices/{id}/` | `GET`, `PUT`, `DELETE` | Invoice detail, update (draft only), soft-delete | Staff or Admin |
| `/api/invoices/{id}/issue/` | `POST` | Issue draft invoice, generate PDF & SHA-256 hash | Staff or Admin |
| `/api/invoices/{id}/download_pdf/`| `GET` | Stream signed PDF with SHA-256 header | Staff or Admin |
| `/api/invoices/{id}/send_email/` | `POST` | Dispatch invoice PDF via email to customer | Staff or Admin |
| `/api/invoices/{id}/void/` | `POST` | Cancel / void invoice with required reason | Admin Only |
| `/api/invoices/metrics/` | `GET` | Aggregate KPI metrics and monthly trend chart | Staff or Admin |
| `/api/invoices/verify/` | `POST` | Verify PDF or SHA-256 hash against database | Public / Any |
| `/api/payments/` | `GET`, `POST` | List payments and record new settlement | Staff or Admin |
| `/api/audit-logs/` | `GET` | Inspect immutable audit history log | Staff or Admin |

## POWERSHELL COMAMND TO SOFT DELETE INVOICES
$base = "http://127.0.0.1:8000/api"

$login = Invoke-RestMethod -Method Post `
  -Uri "$base/auth/login/" `
  -ContentType "application/json" `
  -Body (@{ username = "YOUR_USERNAME"; password = "YOUR_PASSWORD" } | ConvertTo-Json)

$invoiceId = 123
Invoke-RestMethod -Method Delete `
  -Uri "$base/invoices/$invoiceId/" `
  -Headers @{ Authorization = "Bearer $($login.access)" }
