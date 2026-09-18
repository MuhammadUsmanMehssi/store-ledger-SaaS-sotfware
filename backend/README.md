# General Store SaaS — Backend

Multi-tenant POS / inventory API for kiryana and general stores. Built with Express, Prisma (PostgreSQL), Zod, and JWT auth.

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Setup

```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

API base URL: `http://localhost:5055/api`  
Health check: `GET /api/health`

## Demo accounts (after seed)

| Role    | Email                     | Password      |
|---------|---------------------------|---------------|
| Owner   | owner@demokiryana.com     | Password123!  |
| Manager | manager@demokiryana.com   | Password123!  |
| Cashier | cashier@demokiryana.com   | Password123!  |

## Auth

1. `POST /api/auth/register` — create account (optional `storeName` to create store immediately)
2. `POST /api/auth/login` — returns `accessToken` + `refreshToken`
3. Send `Authorization: Bearer <accessToken>` on protected routes
4. Users without a store: `POST /api/tenants` to create one (becomes OWNER)

`tenantId` always comes from the JWT (`req.auth.tenantId`), never from the request body.

## Main route groups

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Register, login, refresh, password reset |
| `/api/tenants` | Create store, settings |
| `/api/categories` | Category CRUD |
| `/api/units` | Unit CRUD |
| `/api/products` | Product CRUD, barcode lookup |
| `/api/inventory` | Stock list, movements, adjust |
| `/api/customers` | Customer CRUD + payments |
| `/api/suppliers` | Supplier CRUD + payments |
| `/api/purchases` | Draft/complete purchases |
| `/api/purchase-returns` | Purchase returns |
| `/api/sales` | POS sales, hold/resume |
| `/api/sale-returns` | Sale returns |
| `/api/expenses` | Expenses + categories |
| `/api/cash` | Open/close cash session |
| `/api/dashboard` | Stats with date presets |
| `/api/reports` | Sales, purchases, inventory, P&L |
| `/api/users` | Store users (OWNER creates) |

## Response shape

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm run seed` | Seed demo data |
| `npm run prisma:migrate` | Run migrations |
| `npm run prisma:studio` | Prisma Studio |

## Cash session formula

```
expectedCash = openingCash + cashIn - cashOut
difference   = actualCash - expectedCash
```

Open a cash session (`POST /api/cash/open`) before cash sales, customer/supplier cash payments, or cash expenses.
