# GreenMiles ✈️🌱

**An airline green-miles eco-mall demo — see your flight's carbon footprint, then put idle miles to work for the planet.**

[![CI](https://github.com/TakamiyaHaruka/greenmiles/actions/workflows/ci.yml/badge.svg)](https://github.com/TakamiyaHaruka/greenmiles/actions/workflows/ci.yml)
[![E2E: Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) | [简体中文](README.zh-CN.md)

> [!NOTE]
> GreenMiles is a **demo / proof of concept**. It runs locally, uses seeded data, and does not connect to real payments, real airlines, or real user accounts. The UI is currently in Chinese — i18n is tracked as an open question in the PRD.

## The idea

Airline frequent-flyer miles have two well-known problems:

- **Idle small balances** — redeeming a ticket takes far more miles than most people have, so balances sit unused.
- **Carbon awareness without action** — travelers increasingly care about their footprint, but lack a tool that turns awareness into something concrete.

GreenMiles explores one answer: a small eco-mall where a flight's carbon emission becomes visible, and idle miles become green products and carbon offsets.

The core experience journey: **Reveal** (see the emission) → **Offset** (take action with miles) → **Proof** (carry a voucher as proof of action).

## Screenshots

**Member dashboard — every KPI is computed live from the database (no mock numbers):**

![Dashboard](docs/screenshots/dashboard.png)

**Carbon calculator:**

![Carbon calculator](docs/screenshots/calculator.png)

**Miles mall:**

![Mall](docs/screenshots/mall.png)

**Admin console** (`/admin`, gated by `ADMIN_PASSWORD`):

![Admin console](docs/screenshots/admin.png)

## Features

- 🔐 **Auth** — register / login / logout with JWT (httpOnly cookie) and bcrypt password hashing
- 🧮 **Carbon calculator** — import by flight number (seeded demo data) or pick departure/arrival airports and the great-circle distance is computed locally from built-in airport coordinates; combine with aircraft type and cabin class to get CO₂ plus a relatable analogy ("a tree's X days of absorption"); save flights to your carbon-footprint history (the server recomputes the value before persisting it)
- 🛒 **Miles mall** — 4 product types (physical goods, vouchers, carbon offsets, donations) with stock, cart dialog, multi-quantity settlement (1–10 per order) and a shipping-address form for physical goods
- 🎫 **Voucher proof** — each redemption produces a voucher code with QR code; physical orders go to a `pending` (awaiting shipment) state
- 📊 **Order history & live KPI dashboard** — past orders plus platform stats from `/api/stats`: total CO₂ offset (22 kg per redeemed tree), miles conversion rate, redemption count, and your personal flight footprint
- 🛠️ **Admin console** — `/admin` product CRUD gated by an `ADMIN_PASSWORD` session, separate from member accounts; products with existing orders cannot be deleted
- 🗄️ **Zero-config SQLite** — database is created, migrated and seeded automatically on first run

## Tech stack

Next.js 16 · React 19 · Tailwind CSS 4 · shadcn/ui · SQLite (better-sqlite3) · Zustand · Zod · JWT (jose) · Vitest · Testing Library

## Quick start

Prerequisites: **Node.js 20+** and npm.

```bash
# 1. Clone
git clone https://github.com/TakamiyaHaruka/greenmiles.git
cd greenmiles

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# edit .env.local and set JWT_SECRET (e.g. `openssl rand -base64 32`)
# optionally set ADMIN_PASSWORD to enable the /admin product console

# 4. Run
npm run dev
```

Open <http://localhost:3000>. The SQLite database (`greenmiles.db`) is created and seeded on first run — no migration step needed.

**Test account:** `test@greenmiles.com` / `password123` (10,000 miles balance)

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server on <http://localhost:3000> |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Unit tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E journeys — builds the app, resets an isolated SQLite db and starts it on `:3100` |
| `npm run lint` | ESLint |

## Carbon calculation

```
CO₂ (kg) = distance (km) × aircraft coefficient (kg/km) × cabin multiplier
```

| Aircraft type | Coefficient (kg CO₂/km) | | Cabin | Multiplier |
| --- | --- | --- | --- | --- |
| Narrow-body efficient | 0.075 | | Economy | ×1.0 |
| Narrow-body standard | 0.090 | | Premium economy | ×1.5 |
| Wide-body efficient | 0.110 | | Business | ×2.5 |
| Wide-body large | 0.140 | | First | ×4.0 |

These are simplified illustrative factors for demo purposes, not an official methodology. One redeemed tree is credited as **22 kg CO₂ per year**, consistent with the calculator's tree analogy. Flight distance is computed locally from built-in airport coordinates ([`src/lib/airports.ts`](src/lib/airports.ts), haversine great-circle); the flight-number lookup goes through a provider abstraction ([`src/lib/flightInfo.ts`](src/lib/flightInfo.ts)) seeded with demo data — real sources (VariFlight / AeroAPI) are commercial APIs that can be plugged in as adapters. See [`src/lib/carbon.ts`](src/lib/carbon.ts).

## Testing

- **Unit (Vitest + Testing Library)** — 170 tests covering the carbon engine, airport coordinates & distance, the flight provider, auth helpers, Zod schemas, API route handlers (orders, carbon, flight, stats, admin), the proxy route guard and Zustand stores. `npm test`
- **E2E (Playwright)** — 7 journeys against a production build with an isolated, freshly seeded SQLite database: register & login, carbon calculator result, flight-number import prefill, miles redemption with voucher QR code, order history, unauthenticated route guard, and the insufficient-balance settlement guard. First run needs `npx playwright install chromium`, then `npm run test:e2e`

## Project structure

```
src/
├── app/
│   ├── (pages)/        # home, calculator, mall, orders, admin, login, register
│   └── api/            # auth, products, orders, carbon, stats, admin route handlers
├── components/         # feature components + shadcn/ui primitives
├── lib/                # db, auth, carbon engine, airport coords, flight provider, zod schemas
├── stores/             # zustand stores (user, cart, carbon)
└── proxy.ts            # JWT route protection (Next.js 16 proxy convention)
```

## Built with AI agents 🤖

This project was planned and built end-to-end with the **BMad Method v6.7.1** workflow and AI agents: product brief → PRD (19 logged decisions) → architecture → UX design → epics & stories → implementation, with each story tracked to completion.

Per-story implementation artifacts are in [`docs/bmad/`](docs/bmad/), and a full write-up (in Chinese) lives in [`docs/zh-CN/`](docs/zh-CN/).

## Contributing

Issues and pull requests are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Released under the [MIT License](LICENSE).
