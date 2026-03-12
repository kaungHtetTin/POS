# Pharmacy POS – Current Project State

This document reflects the **actual implementation state** of the codebase (as of review), not the checkbox status in `DEVELOPMENT_PLAN.md`. The roadmap has been updated to match.

---

## Summary

- **Phases 1–3**: Fully implemented (foundation, master data, inventory & suppliers).
- **Phase 4 (POS)**: Largely complete (search, barcode, cart, multi-unit, FEFO checkout). Missing: thermal receipt printing, prescription handling, and a dedicated Customer CRUD/UI.
- **Phase 5 (Offline/Sync)**: Not started (no Dexie.js, service workers, or sync API).
- **Phase 6 (Financials & Reporting)**: Implemented (expenses, expense categories, returns, sales list, reports). Customer CRUD is missing.
- **Phase 7 (Deployment)**: Not started.

---

## Phase-by-Phase Status

### Phase 1: Core Foundation & UI Framework — **Completed**

- Laravel + React (Inertia) + Vite + MUI in place.
- UUID-based schema; 40+ migrations for all core tables.
- High-density MUI theme (`theme.js`), night mode (`ColorModeContext`), 4px radius, dense components.
- `MainLayout` (200px sidebar, 48px header), theme switcher, profile menu.
- Auth: login, register, password reset, email verification; multi-role (Owner, Manager, Cashier, Root).
- RBAC: `EnsureUserHasPermission` middleware, `permission:` on routes, `User::hasRole` / `hasPermission`, role/permission seeders.
- Profile: edit profile, update password, profile picture upload.
- Dashboard with stat cards, low-stock and expiry alert widgets.

### Phase 2: Master Data Management — **Completed**

- **Branches**: Full CRUD, permission `manage_branches`.
- **Categories, Units, Taxes**: Full CRUD, multi-unit with conversion factors, tax default/status.
- **Products**: Full CRUD, image upload, barcode, category/tax, `product_units` with selling price and base unit. Product–tax is many-to-many (pivot) in addition to legacy `tax_id`.
- Models: `Branch`, `Category`, `Unit`, `Tax`, `Product`, `ProductUnit`; migrations and controllers wired.

### Phase 3: Inventory & Supplier Management — **Completed**

- **Suppliers**: CRUD, balance, credit limit; purchase flow warns when exceeding credit limit.
- **Purchases**: Create/edit with purchase items; batch creation with expiry and cost; payment amounts and status.
- **Inventory**: `inventories` (branch–product quantity) and `inventory_batches` (FEFO); adjustments and batch selection; low-stock and expiry alerts on dashboard.
- **Stock transfers**: Branch-to-branch with items; status (Pending/Completed/Cancelled).
- Controllers: `SupplierController`, `PurchaseController`, `InventoryController`, `InventoryAdjustmentController`, `StockTransferController`.
- Models: `Supplier`, `Purchase`, `PurchaseItem`, `Inventory`, `InventoryBatch`, `InventoryAdjustment`, `StockTransfer`, `StockTransferItem`.

### Phase 4: Point of Sale (POS) Module — **Mostly done**

- **POS UI** (`resources/js/Pages/POS/Index.jsx`, `PosLayout`):
  - Product search (name, barcode, generic name) and catalog by category with pagination.
  - Global barcode scan (keydown buffer, Enter = scan).
  - Cart with multi-unit selection, unit price, tax (Exclusive/Inclusive), discount.
  - Checkout: payment method (Cash, Card, Mobile, Wallet), payment status (Paid, Partial, Due), optional `customer_id`.
- **Backend** (`PosController`):
  - `products`, `categories`, `catalog`, `scan`, `checkout`.
  - FEFO: deducts from `inventory_batches` by `expiry_date ASC`, updates `inventories`; atomic transaction.
  - Tax calculation per spec (Exclusive vs Inclusive); multi-unit conversion via `product_units`.
  - Invoice number generation; `Sale` and `SaleItem` creation.
- **Not implemented**:
  - Thermal receipt printing (80mm/58mm) — no print/receipt UI or CSS.
  - Prescription upload/link to sales — `Prescription` model and migration exist; no POS or sales UI.
  - **Customer management**: No `CustomerController`; sidebar “Customers” links to `#`. Customers exist in DB and are used in `checkout` and Sales/Returns; no CRUD or picker.

### Phase 5: Offline-First & Sync Engine — **Not started**

- No Dexie.js or IndexedDB usage.
- No service worker or PWA manifest.
- No `/api/v1/health` or `/api/v1/sync/*` endpoints.
- API routes are minimal (Sanctum user only).

### Phase 6: Financials, Expenses & Reporting — **Mostly done**

- **Expenses**: CRUD with expense categories; permission `view_financial_reports`.
- **Returns**: Customer and supplier returns; lookup by sale/purchase; create return with items; approve/reject via `approve_returns` permission.
- **Sales list**: Index with branch, user, customer, filters.
- **Reports** (`ReportsController`): Date range and branch scope; sales, COGS, returns, gross profit; branch comparison; accessible branches by role.
- **Missing**: Dedicated Customer CRUD (customers only referenced in sales/returns and optional POS checkout).

### Phase 7: Deployment & Final Optimization — **Not started**

- No explicit backup, SSL, or production checklist in repo; hardware UAT not verified.

---

## Deviations / Extras vs spec

- **Inventory**: Uses both `inventories` (aggregate qty per branch/product) and `inventory_batches` (FEFO); spec emphasizes batches — implementation keeps both and syncs them on sale/adjustment.
- **Product tax**: Many-to-many `product_tax` pivot in addition to `products.tax_id` for flexibility.
- **Expense categories**: Implemented (table + CRUD); not in original spec.
- **Branch–user**: `active_branch_id`, `branch_user` pivot for multi-branch access; `currentBranchId()` used in POS and reports.
- **Returns**: Extra `approve_returns` permission and status workflow.
- **Naming**: `PharmacyReturn` / `ReturnEntry` and `ReturnItem` used in code; spec says “Returns / Return Items”.

---

## Critical gaps before considering POS “complete”

1. **Customer management**: Add `CustomerController` and CRUD UI (and optionally a customer picker in POS).
2. **Receipt printing**: Implement thermal receipt (e.g. 80mm) with print layout/CSS and a print action after checkout.
3. **Prescriptions**: Link prescription upload to POS or sales (create/link `Prescription` from sale or POS flow).

After that, the main remaining work is **Phase 5 (offline/sync)** and **Phase 7 (deployment)**.
