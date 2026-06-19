# Pharmacy POS - Current Project State

This document reflects the actual implementation state of the codebase. The roadmap should be read together with [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

---

## Summary

- **Phases 1-3**: Fully implemented: foundation, master data, inventory, suppliers, purchases, and stock workflows.
- **Phase 4 (POS)**: Largely complete: search, barcode, cart, multi-unit, retail/wholesale pricing, product-level discounts, POS FOC stock deduction, FEFO checkout, receipt printing, and cash sessions.
- **API layer**: Implemented for Sanctum login/logout, cashier POS, cashier customers, cash sessions, branch switching, receipt settings, and staff purchase creation/list/detail.
- **Phase 5 (Offline/Sync)**: Not started: no Dexie.js, service worker, PWA manifest, `/api/v1/health`, or `/api/v1/sync/*` endpoints.
- **Phase 6 (Financials & Reporting)**: Mostly implemented: expenses, expense categories, returns, sales list, reports, and cash-session reports.
- **Phase 7 (Deployment)**: Not started.

---

## Phase-by-Phase Status

### Phase 1: Core Foundation & UI Framework - Completed

- Laravel + React (Inertia) + Vite + MUI in place.
- Core migrations and Eloquent models are in place.
- High-density MUI theme, night mode, compact layouts, and shared app layouts.
- Auth: login, register, password reset, email verification; multi-role Owner, Manager, Cashier, and Root.
- RBAC: permission middleware, route permissions, role/permission helpers, and seeders.
- Profile: edit profile, update password, profile picture upload.
- Dashboard with stat cards, low-stock and expiry alerts.

### Phase 2: Master Data Management - Completed

- **Branches**: CRUD with `manage_branches`.
- **Categories, Units, Taxes**: CRUD with multi-unit conversion support.
- **Products**: CRUD, image upload, barcode, category/tax, product-level `discount_percentage`, and `product_units` with selling price, wholesale price, conversion factor, and base-unit flag.
- Product tax supports many-to-many `product_tax` pivot in addition to legacy `products.tax_id`.

### Phase 3: Inventory & Supplier Management - Completed

- **Suppliers**: CRUD, balance, credit limit; purchase flow warns when exceeding supplier credit limit.
- **Purchases**: Create, edit, detail page, purchase items, batch creation, expiry, cost, payment amounts, payment status, supplier FOC quantity, and wholesale price updates.
- **Inventory**: `inventories` aggregate stock and `inventory_batches` FEFO stock are both maintained.
- **Stock transfers**: Branch-to-branch transfer workflow with statuses.

### Phase 4: Point of Sale (POS) Module - Mostly Done

- **POS UI** (`resources/js/Pages/POS/Index.jsx`, `PosLayout`):
  - Product search by name, barcode, and generic name.
  - Catalog by category with pagination.
  - Global barcode scan buffer.
  - Cart with multi-unit selection, compact line layout, retail/wholesale toggle, FOC quantity/unit, tax, and automatic product-level discount.
  - Payment dialog with Cash, Card, Mobile, Wallet and Paid, Partial, Due statuses.
  - Cash session open/close and active-session guards.
  - Browser and silent receipt printing support.
- **Backend** (`PosController`):
  - Product, category, catalog, scan, customer, cash session, and checkout endpoints for the web POS.
  - FEFO deduction from inventory batches inside a transaction.
  - Multi-unit conversion via `product_units`.
  - Retail/wholesale price selection.
  - Product `discount_percentage` is the only sale discount source; there is no manual POS sale-wide discount.
  - POS sale FOC deducts additional stock but does not add revenue.
  - Sale and sale item rows store price type, original price, discount percentage, discount amount, and FOC quantities where applicable.
- **Remaining POS gaps**:
  - Prescription upload/link to sales. `Prescription` model/migration exists, but POS/sales UI is not wired.
  - Dedicated customer CRUD page in the web app. Customer endpoints and POS quick-create/search exist.

### API Layer - Implemented for Mobile/Handheld Use

- Public auth:
  - `POST /api/login`
- Protected auth:
  - `GET /api/user`
  - `POST /api/logout`
- Cashier API:
  - `GET /api/cashier/products`
  - Customer CRUD under `/api/cashier/customers`
  - `POST /api/cashier/sales`
  - Cash sessions under `/api/cashier/sessions/*`
  - `GET /api/cashier/receipt-settings`
  - Branch list/switch under `/api/cashier/branches`
- Staff purchase API:
  - `GET /api/staff/suppliers`
  - `GET /api/staff/products`
  - `GET /api/staff/branches`
  - `GET /api/staff/purchases`
  - `POST /api/staff/purchases`
  - `GET /api/staff/purchases/{purchase}`
- See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for request/response details and current limitations.

### Phase 5: Offline-First & Sync Engine - Not Started

- No Dexie.js or IndexedDB usage.
- No service worker or PWA manifest.
- No `/api/v1/health` endpoint.
- No `/api/v1/sync/*` endpoints.
- Current APIs support authenticated cashier/staff clients, but not offline sync conflict handling.

### Phase 6: Financials, Expenses & Reporting - Mostly Done

- **Expenses**: CRUD with expense categories.
- **Returns**: Customer and supplier returns, lookup by sale/purchase, return items, approve/reject flow.
- **Sales list**: Branch, user, customer, and date/payment filters.
- **Reports**: Sales, COGS including FOC stock deduction, returns, gross profit, branch comparison, and cash sessions.

### Phase 7: Deployment & Final Optimization - Not Started

- No explicit SSL, backup, hardware UAT, or production checklist is completed in repo.

---

## Current Implementation Notes

- Product discounts are controlled by `products.discount_percentage`.
- POS does not accept manual sale-wide discounts in the UI or API.
- Retail/wholesale sale mode is a single POS toggle, and API clients send `price_type` per line.
- Purchase FOC adds received stock but does not increase supplier cost.
- Purchase wholesale price updates the selected product unit wholesale price.
- Browser POS and `/api/cashier/sales` support FOC sale quantity/unit stock deduction.
- `inventories` and `inventory_batches` must stay synchronized when adding future stock-affecting flows.

---

## Critical Gaps

1. Add prescription upload/linking to POS or sales.
2. Add a dedicated customer CRUD page in the web app if needed beyond POS quick-create/search.
3. Implement offline-first sync endpoints and conflict rules.
4. Prepare deployment and hardware UAT checklist.
