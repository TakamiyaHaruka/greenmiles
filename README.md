# GreenMiles ✈️🌱

**Turn miles flown into a greener journey.** Explore eco-friendly rewards with spare miles, calculate a flight's carbon footprint, and keep track of the choices you make.

[![CI](https://github.com/TakamiyaHaruka/greenmiles/actions/workflows/ci.yml/badge.svg)](https://github.com/TakamiyaHaruka/greenmiles/actions/workflows/ci.yml)
[![E2E: Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) | [简体中文](README.zh-CN.md)

> [!NOTE]
> GreenMiles is a **demo / proof of concept**. It runs locally, uses seeded data, and does not connect to real payments, real airlines, or real user accounts. The UI is currently in Chinese.

## The idea

Airline frequent-flyer miles have two well-known problems:

- **Idle small balances** — redeeming a ticket takes far more miles than most people have, so balances sit unused.
- **Carbon awareness without action** — travelers increasingly care about their footprint, but lack a tool that turns awareness into something concrete.

GreenMiles explores one answer: a small eco-mall where a flight's carbon emission becomes visible, and idle miles become green products and carbon offsets.

The core experience journey: **Reveal** (see the emission) → **Offset** (take action with miles) → **Proof** (carry a voucher as proof of action).

## Experience

The home page leads with a member miles card and available green products. Guests can browse featured items before signing in; members see their actual balance and personal activity. Every page shares the same light, green-tinted design system and a saved appearance toggle for switching between glass and standard surfaces, including authentication and the admin console.

## Screenshots

**Guest home — discover products before signing in:**

![Guest home](docs/screenshots/landing.png)

**Member home — the balance and personal activity come from the database (no mock numbers):**

![Member home](docs/screenshots/dashboard.png)

**Authentication — responsive, accessible login and registration forms:**

![Login](docs/screenshots/login.png)

![Register](docs/screenshots/register.png)

**Carbon calculator:**

![Carbon calculator](docs/screenshots/calculator.png)

**Miles mall:**

![Mall](docs/screenshots/mall.png)

**Footprint page — monthly trend, quarterly report, 10-year projection and downloadable certificates:**

![Footprint](docs/screenshots/footprint.png)

**Personal impact — a shareable summary of the member's greener choices:**

![Personal impact](docs/screenshots/impact.png)

**Orders — redemption history, cancellation, and the miles ledger:**

![Orders](docs/screenshots/orders.png)

![Orders balance tab](docs/screenshots/orders-balance.png)

**Admin console** (`/admin`, gated by `ADMIN_PASSWORD`) — product CRUD and order fulfilment:

![Admin console](docs/screenshots/admin.png)

![Admin orders](docs/screenshots/admin-orders.png)

## Features

- 🔐 **Auth** — register / login / logout with JWT (httpOnly cookie) and bcrypt password hashing
- ✨ **Site-wide appearance** — one persistent glass / standard material preference across every public, member, and admin route, with reduced-transparency and reduced-motion fallbacks
- 🧮 **Carbon calculator** — import by flight number (seeded demo data) or pick departure/arrival airports and the great-circle distance is computed locally from built-in airport coordinates; combine with aircraft type and cabin class to get CO₂ plus a relatable analogy ("a tree's X days of absorption"); save flights to your carbon-footprint history (the server recomputes the value before persisting it)
- 🛒 **Miles mall** — 4 product types (physical goods, vouchers, carbon offsets, donations) with stock, cart dialog, multi-quantity settlement (1–10 per order) and a shipping-address form for physical goods
- 🎫 **Voucher proof** — each redemption produces a voucher code with QR code; physical orders go to a `pending` (awaiting shipment) state; vouchers and tree certificates can be downloaded as share posters (Canvas → PNG with QR, zero extra runtime deps)
- 📒 **Miles ledger** — every grant / redeem / refund is a row in `miles_transactions`; the orders page has a balance tab with the last 50 entries (income in green, spending in red); databases created before the ledger existed are backfilled idempotently on startup
- ↩️ **Order cancellation** — pending orders can be cancelled by their owner in one transaction: miles refunded, stock restored, a `refund` ledger row written; issued vouchers are intentionally irreversible
- 🚚 **Fulfilment state machine** — `pending → shipped → completed`, driven from the admin console's order tab; illegal transitions are rejected with 400; cancelled orders are excluded from every stat
- 🌍 **Offset credibility** — carbon products carry a project name, certification standard and vintage (editable in admin, seeded for the tree product); the footprint page projects 10 years of fixation (22 kg/tree/year)
- 📊 **Order history & live KPI dashboard** — past orders plus platform stats from `/api/stats`: total CO₂ offset (22 kg per redeemed tree), miles conversion rate, redemption count, and your personal flight footprint
- 📈 **Footprint page** — `/footprint` with monthly emission trend chart, latest-quarter report card, standing-tree count and the last 50 flight records
- 🌿 **Personal impact** — `/impact` turns member activity into an evidence-backed, shareable summary without inventing data while loading, empty, or unavailable
- 🛠️ **Admin console** — `/admin` with product CRUD (including offset-project fields) and order management, gated by an `ADMIN_PASSWORD` session separate from member accounts; products with existing orders cannot be deleted
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

- **Unit (Vitest + Testing Library)** — covers the carbon engine, airport coordinates & distance, flight provider, auth helpers, Zod schemas, API routes, ledger migration, poster/footprint helpers, route guards, appearance preferences, and Zustand stores. Run `npm test`.
- **E2E (Playwright)** — exercises the persistent site-wide appearance toggle, reduced-transparency/motion fallbacks, narrow auth/admin flows, mall and calculator, registration and login, redemption and voucher QR codes, order cancellation and refunds, admin fulfilment, footprint and impact reports, and route guards against a production build with an isolated, freshly seeded SQLite database. First run needs `npx playwright install chromium`; then run `npm run test:e2e`.

## Project structure

```
src/
├── app/
│   ├── (pages)/        # home, calculator, mall, orders, footprint, impact, admin, login, register
│   └── api/            # auth, products, orders (+ cancel), miles, carbon, stats, admin route handlers
├── components/         # feature components (incl. SharePoster) + shadcn/ui primitives
├── lib/                # db, auth, carbon engine, airport coords, flight provider, poster/footprint helpers, zod schemas
├── stores/             # zustand stores (user, cart, carbon, appearance)
└── proxy.ts            # JWT route protection (Next.js 16 proxy convention)
```

## Contributing

Issues and pull requests are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Released under the [MIT License](LICENSE).
