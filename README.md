# ShopManager

A full-stack web application for small shop owners to manage their business — products, stock, sales, and reports — with per-owner data isolation. Built for any retail category: groceries, clothing, electronics, general stores, and more.

**Backend:** Java 21, Spring Boot 4.1, Spring Security (JWT), Spring Data JPA, Bean Validation, Lombok, PostgreSQL (Supabase)
**Frontend:** React 19, Vite, React Router v7, Tailwind CSS v4

## Features

- Open registration (username + email) — every user is a shop owner; login works with **username or email**
- Per-owner data isolation: each owner sees only their own categories, products, stock history, sales, and reports
- Role-based access (`USER` / `ADMIN`): an admin panel to manage users (create, edit role/status, delete) and view platform-wide analytics; the first registered user is promoted to admin automatically
- Cookie-based JWT sessions: `HttpOnly` cookie named `access_token` (24h expiry by default), CSRF-protected, BCrypt-hashed passwords, stateless API
- Brute-force protection: in-memory sliding-window rate limiting (5 attempts / 15 minutes → HTTP 429) on login (per user + IP), registration (per IP), and password change (per user)
- Product management: name, category, brand, SKU, unit, purchase/selling price, MRP, quantity, minimum stock level; deletes are soft (archive/restore via `active` flag)
- Inventory tracking: stock-in, adjustments, full movement history, automatic stock status (in stock / low / out of stock)
- Sales: multi-item checkout with atomic stock deduction and validation, per-sale totals and profit
- Live dashboard: today's revenue, sale count, low-stock alerts, popular products, recent sales, and an SVG revenue chart
- Reports: date-range summaries (revenue, profit, sales, per-category breakdown)
- Account settings: change password and change email
- Frontend niceties: relative `/api` calls through the Vite dev proxy, in-memory GET response cache (30s TTL) with request de-duplication, auto-retry on CSRF expiry, route guards for auth and admin pages

## Quick Start

Prerequisites: Java 21, Node.js 20+, and a PostgreSQL database (project is configured for Supabase).

1. Configure the backend — create `backend/.env`:
   ```
   DB_URL=jdbc:postgresql://<host>:5432/postgres
   DB_USERNAME=<user>
   DB_PASSWORD=<password>
   JWT_SECRET=<any long random string>
   ```
   Optional variables:
   ```
   PORT=8081                  # server port (default 8081)
   JWT_EXPIRATION=86400000    # token lifetime in ms (default 24h)
   COOKIE_SECURE=false        # set true behind HTTPS (adds Secure + SameSite=None)
   FRONTEND_URL=http://localhost:5173   # allowed CORS origin
   ADMIN_USERNAME=            # bootstrap an admin account at startup instead
   ADMIN_PASSWORD=            #   of promoting the first registered user
   ADMIN_EMAIL=
   ```
   The app **refuses to start** with the default `JWT_SECRET` — you must set your own.
2. Start the backend (port 8081):
   ```
   cd backend
   .\mvnw.cmd spring-boot:run
   ```
3. Start the frontend (port 5173):
   ```
   cd frontend
   npm install
   npm run dev
   ```
4. Open http://localhost:5173 and register an account.

Hibernate auto-creates tables on startup (`ddl-auto=update`) — no manual SQL needed.

## Project Structure

```
backend/    Spring Boot REST API
            controller/   REST controllers (Auth, Admin, Products, Inventory, Sales, ...)
            service/      Business logic, scoped to the authenticated owner
            repository/   Spring Data JPA repositories
            entity/       JPA entities (User, Category, Product, StockMovement, Sale, SaleItem)
            security/     JWT filter/service, cookie handling, rate limiter, config
            exception/    Global error handler + typed exceptions (ApiError JSON)
            dto/          Request/response records grouped per area
            config/       SecurityConfig, AdminBootstrap (first-user promotion)

frontend/   React SPA
            src/pages/        Dashboard, Products, ProductForm, Inventory, Sales,
                              SaleDetail, NewSale, Reports, Settings, Auth, Admin
            src/services/     api.js (fetch wrapper, CSRF, cache) + per-area modules
            src/components/   Layout (sidebar), ProtectedRoute/AdminRoute, RevenueChart
            vercel.json       SPA fallback + /api rewrite to the deployed backend
```

## API Overview

Base URL: `http://localhost:8081/api`. In development the frontend proxies `/api/*` to the backend automatically.

Auth is cookie-based: login sets an `HttpOnly` JWT cookie (`access_token`); state-changing requests must send the `X-XSRF-TOKEN` header (seeded from `GET /auth/csrf`). No token is stored in `localStorage`.

| Area | Endpoints |
|---|---|
| Health (public) | `GET /health` |
| Auth (public) | `GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` |
| Auth (logged in) | `GET /auth/me` |
| Dashboard | `GET /dashboard/summary` |
| Categories | `GET/POST /categories` |
| Products | `GET/POST /products`, `GET /products/popular`, `GET/PUT/DELETE /products/{id}` |
| Inventory | `POST /inventory/stock-in`, `POST /inventory/adjustment`, `GET /inventory/movements` |
| Sales | `GET/POST /sales`, `GET /sales/{id}` |
| Reports | `GET /reports/summary?from=&to=` |
| Settings | `POST /settings/password`, `POST /settings/email` |
| Admin (role ADMIN) | `GET/POST /admin/users`, `PATCH/DELETE /admin/users/{id}`, `GET /admin/analytics` |

Errors are returned as consistent JSON: `{ timestamp, status, error, message, path }` plus `fieldErrors` on validation failures — e.g. 400 (validation / insufficient stock), 401 (bad credentials), 403 (CSRF or forbidden), 404 (missing resource), 409 (duplicate), 429 (rate limited), 500 (internal).

## How Multi-Tenant Isolation Works

Every table carries an `owner_id`. A JWT filter identifies the caller from their session cookie, services scope every query by the current owner, and cross-owner lookups return 404 — so one shared database safely serves many independent shops. Admin endpoints bypass owner scoping but require the `ROLE_ADMIN` authority.

## Security Notes

- Cookies are `HttpOnly`; `SameSite=Lax` locally, and when `COOKIE_SECURE=true` the `Secure` flag is added with `SameSite=None` (required when the SPA and API are on different domains, e.g. Vercel + Render).
- `JWT_SECRET` is mandatory — startup fails if it's missing or still the built-in default.
- Rate limiting is in-memory (5 attempts / 15-minute sliding window): login keyed by username **and** IP, registration by IP, password changes by user. Swap in a Redis-backed limiter before running multiple server instances.
- The API also accepts `Authorization: Bearer <token>` as a fallback for external API clients.
- CSRF uses Spring's `CookieCsrfTokenRepository` (readable cookie); the frontend re-seeds and retries once if a request is rejected with 403.

## Testing

82 backend tests across 15 files (services, controllers, security, entities, rate limiting, bootstrap) run on an in-memory H2 database in PostgreSQL mode — no live database needed:

```
cd backend
.\mvnw.cmd test
```

Frontend: `npm run build` and `npm run lint` (oxlint) in `frontend/`.

## Deployment

The reference deployment runs the SPA on Vercel and the API on Render with Supabase Postgres:

- `frontend/vercel.json` rewrites `/api/:path*` to the backend URL and serves `index.html` for all other routes (SPA routing).
- On the backend host, set `COOKIE_SECURE=true`, `FRONTEND_URL=https://<your-vercel-domain>`, and the production `DB_*` / `JWT_SECRET` values.
- CORS is restricted to the single `FRONTEND_URL` origin.

## License

Private project — not open-sourced.
