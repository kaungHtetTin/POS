# Pharmacy POS System: Development Roadmap & Timeline (Refined)

This document outlines the step-by-step development process for the Pharmacy POS project, including technical milestones and estimated timeframes. **Checkbox status is aligned with actual codebase state** — see [CURRENT_PROJECT_STATE.md](CURRENT_PROJECT_STATE.md) for a detailed implementation summary and gaps.

---

## Phase 1: Core Foundation & UI Framework

**Estimated Duration: 1 Week**

- [x] **Project Initialization**: Laravel 9 + React + Vite + MUI setup.
- [x] **Database Architecture**: Comprehensive UUID-based schema design.
- [x] **Migrations & Models**: Implementation of all 24+ core tables and Eloquent models.
- [x] **UI Foundation**:
    - [x] High-density, compact, and flat MUI theme implementation.
    - [x] Night Mode (Dark Mode) support with theme switcher.
    - [x] Responsive sidebar layout and dashboard structure.
    - [x] UI Component Showcase (Modals, Forms, Tables, Alerts).
- [x] **Authentication & RBAC**:
    - [x] Implement multi-role login (Owner, Manager, Cashier).
    - [x] Setup Middleware to protect routes based on roles.
- [x] **Profile Management**: User profile updates including profile picture upload.

---

## Phase 2: Master Data Management

**Estimated Duration: 2 Weeks**

- [x] **Branch Management**: CRUD operations for pharmacy locations.
- [x] **Category & Unit Setup**:
    - [x] Manage medicine categories.
    - [x] Multi-unit system (Box, Card, Tablet) with conversion factors.
- [x] **Tax Configuration**: Manage different tax types (VAT, Sales Tax) and defaults.
- [x] **Product Management**:
    - [x] Add/Edit medicines with image upload.
    - [x] Barcode generation and SKU tracking.
    - [x] Unit conversion logic (e.g., 1 Box = 10 Cards = 100 Tablets).

---

## Phase 3: Inventory & Supplier Management

**Estimated Duration: 2 Weeks**

- [x] **Supplier Management**: Track supplier details, credit limits, and balances.
- [x] **Purchase Workflow**:
    - [x] Add automatic warning in purchase flow when a new purchase exceeds supplier credit limit.
    - [x] Create purchase orders and receive stock.
    - [x] Automatic batch creation with expiry dates and cost tracking.
- [x] **Inventory Control**:
    - [x] Stock adjustments for damage/returns.
    - [x] Real-time low stock and expiry alerts (Dashboard widgets).
    - [x] Branch-to-branch stock transfers.

---

## Phase 4: Point of Sale (POS) Module

**Estimated Duration: 3 Weeks**

- [x] **POS Interface**:
    - [x] High-speed search and barcode scanner integration.
    - [x] Multi-unit selection at checkout with auto-price adjustment.
    - [x] Cart management, tax calculation, and discounts.
- [x] **Checkout & Payments**:
    - [x] Split payments (Cash, Card, Wallet).
    - [ ] Thermal receipt printing (80mm/58mm).
- [ ] **Prescription Handling**: Upload and link digital prescriptions to sales records.

---

## Phase 5: Offline-First & Sync Engine

**Estimated Duration: 2 Weeks**

- [ ] **Offline Storage**: IndexedDB (Dexie.js) for local data persistence.
- [ ] **PWA Features**: Service workers for offline app availability.
- [ ] **Synchronization**:
    - [ ] Background sync for sales data.
    - [ ] Inventory conflict resolution during sync.

---

## Phase 6: Financials, Expenses & Reporting

**Estimated Duration: 2 Weeks**

- [x] **Expense Tracking**: Manage operational costs (Rent, Salaries, Utilities).
- [x] **Returns & Refunds**: Customer sales returns and supplier purchase returns.
- [x] **Reporting Engine**:
    - [x] Daily/Monthly Sales, Profit, and Tax reports.
    - [x] Inventory valuation and expiry forecasting.
    - [x] Branch performance analytics.

---

## Phase 7: Deployment & Final Optimization

**Estimated Duration: 1 Week**

- [ ] **Hardware UAT**: Testing with scanners and printers in a live environment.
- [ ] **Backup & Security**: Automatic daily DB backups and SSL configuration.
- [ ] **Production Launch**: Optimized VPS/Server setup with monitoring.

---

## **Summary Timeline**

| Phase     | Focus                    | Duration                         |
| :-------- | :----------------------- | :------------------------------- |
| **1**     | Core Foundation & UI     | 1 Week (Ongoing)                 |
| **2**     | Master Data              | 2 Weeks                          |
| **3**     | Inventory & Suppliers    | 2 Weeks                          |
| **4**     | POS Module               | 3 Weeks                          |
| **5**     | Offline Sync             | 2 Weeks                          |
| **6**     | Financials & Reports     | 2 Weeks                          |
| **7**     | Deployment               | 1 Week                           |
| **Total** | **Full Project Release** | **~13 Weeks (Approx. 3 Months)** |
