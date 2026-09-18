# StoreLedger Frontend

React + Vite + TypeScript app for the General Store / Kiryana SaaS POS.

## Requirements

- Node.js 20+
- Backend API running (default `http://localhost:4000/api`)

## Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:4000/api` |

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview production build
- `npm run lint` — run oxlint

## Features

- Auth (login, register, forgot/reset password) with JWT refresh
- Store onboarding
- Role-based navigation (OWNER / MANAGER / CASHIER)
- Dashboard with charts and stock alerts
- Full POS (barcode, hold/resume, payments, 80mm receipt print)
- Products, categories, inventory adjustments
- Purchases & purchase returns
- Sales history & sales returns
- Customers / suppliers with payments
- Expenses & cash sessions
- Reports (sales, purchases, inventory, expenses, P&L)
- Store settings & user management
- Light / dark mode

## Stack

Vite, React 19, TypeScript, Tailwind CSS v4, TanStack Query, React Router, React Hook Form, Zod, Axios, Recharts, Framer Motion, Lucide.
