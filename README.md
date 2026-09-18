# General Store SaaS

Multi-tenant SaaS for general / kiryana store management — POS, inventory, purchases, sales, customers, suppliers, expenses, cash, and reports.

```text
General Store SaaS/
├── frontend/   # React + Vite + Tailwind
└── backend/    # Express + Prisma + PostgreSQL
```

## Quick start

### 1. Database

Postgres is expected at `DATABASE_URL` (see `backend/.env.example`).

Example Docker:

```bash
docker run -d --name gs-saas-postgres \
  -e POSTGRES_USER=gs_saas \
  -e POSTGRES_PASSWORD=gs_saas_dev \
  -e POSTGRES_DB=general_store_saas \
  -p 5434:5432 postgres:16-alpine
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit DATABASE_URL / JWT secrets
npm install
npx prisma migrate dev
npm run seed
npm run dev            # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev            # http://localhost:5173
```

## Demo logins

Password for all: `Password123!`

| Role    | Email                     |
|---------|---------------------------|
| Owner   | owner@demokiryana.com     |
| Manager | manager@demokiryana.com   |
| Cashier | cashier@demokiryana.com   |

## Features

- Multi-tenant stores with JWT auth and role-based access (Owner / Manager / Cashier)
- Products, categories, units, barcode-ready POS
- Stock movements with weighted-average cost
- Purchases, sales, returns, customer/supplier payments
- Expenses, cash sessions, dashboard charts, reports
- 80mm thermal receipt printing via browser print

See `backend/README.md` and `frontend/README.md` for API and UI details.
# store-ledger-SaaS-sotfware
