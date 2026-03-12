# Settings Module – Development Plan

This document outlines the phased development plan for the Pharmacy POS **Settings** module: what to build, in what order, and how it ties into the existing `settings` table and UI.

---

## Overview

- **Goal**: Make Settings functional end-to-end (read/write from DB, used by POS and other modules).
- **Storage**: Use the existing `settings` table (key-value). Optionally extend with branch-scoped keys (e.g. `branch.{id}.pharmacy_name`) or a separate table for branch-specific display data.
- **Access**: Settings page is already gated by `manage_branches`; keep Owner/Manager-only for global settings; branch-level settings can follow the same or a dedicated permission.

---

## Phase 1: Foundation & General / Branch Settings

**Objective**: Persist “General & Branch” data and load it on the Settings page.

| # | Task | Notes |
|---|------|--------|
| 1.1 | **Settings service / repository** | Central place to get/set keys: `Setting::get('key')`, `Setting::set('key', 'value')`. Handle defaults in code for missing keys. |
| 1.2 | **Seed or migrate default keys** | Ensure keys exist (or are created on first read). Define default values in config or seeder. |
| 1.3 | **General & Branch form – backend** | Endpoint(s) to read and update: pharmacy name, TIN, address, phone, email (per branch or global). Decide scope: one “current branch” vs list of branches. |
| 1.4 | **General & Branch form – frontend** | Replace hardcoded defaults in Settings/Index.jsx with data from props/API; submit updates and show success/error. |
| 1.5 | **Use branch name on POS/receipts** | Where branch name is shown (POS header, future receipt), read from branch record or from settings (e.g. display name override). |

**Deliverable**: General & Branch tab saves and loads from DB; branch display name (and optionally TIN/address) can be used elsewhere in the app.

**Estimated duration**: 3–5 days.

---

## Phase 2: POS Behavior Settings

**Objective**: Store POS preferences in `settings` and apply them in the POS UI.

| # | Task | Notes |
|---|------|--------|
| 2.1 | **Define POS setting keys** | e.g. `pos.receipt_width` (80/58), `pos.auto_print_receipt`, `pos.barcode_focus`, `pos.sound_low_stock`, `pos.show_generic_first`, `pos.default_payment_method`, `pos.default_view` (table/grid). |
| 2.2 | **Backend: read POS settings** | Endpoint or shared Inertia props that return current POS settings (with defaults). Used by POS page and by Settings page. |
| 2.3 | **Backend: update POS settings** | Endpoint to save POS settings (validate keys/values). Called from Settings “POS Behavior” section. |
| 2.4 | **Settings UI – POS Behavior** | Wire switches/selects to real keys; load from backend, save on “Save” or per-control. |
| 2.5 | **POS page – consume settings** | Use `pos.default_view` for initial view; `pos.default_payment_method` for initial payment method; later use `pos.receipt_width` and `pos.auto_print_receipt` when receipt printing exists. |

**Deliverable**: POS Behavior section in Settings is functional; POS interface respects default view and payment method (and other options as implemented).

**Estimated duration**: 2–3 days.

---

## Phase 3: Security & Session Settings

**Objective**: Configurable session timeout and placeholders for 2FA / IP whitelist.

| # | Task | Notes |
|---|------|--------|
| 3.1 | **Session timeout setting** | Key e.g. `security.session_timeout_minutes` (default 30). Middleware or auth logic to invalidate session after inactivity. |
| 3.2 | **Settings UI – Security** | Session timeout: number input + “Save”; optionally enable/disable (0 = no timeout). |
| 3.3 | **2FA (optional / later)** | If 2FA is in scope: add “Enable 2FA” toggle and link to 2FA setup flow; otherwise leave as UI-only “Coming soon” or remove. |
| 3.4 | **IP whitelist (optional)** | Only if required: store list of IPs in settings or table; middleware to check; “Configure” in Settings opens simple list editor. |

**Deliverable**: Session timeout configurable and enforced; Security tab reflects real behavior; 2FA/IP optional.

**Estimated duration**: 2–4 days (longer if 2FA or IP whitelist implemented).

---

## Phase 4: Notifications & Alert Preferences

**Objective**: Low-stock and expiry alert behavior configurable from Settings.

| # | Task | Notes |
|---|------|--------|
| 4.1 | **Alert-related keys** | e.g. `inventory.expiry_alert_days` (90,60,30 or JSON), `inventory.low_stock_sound` (on/off), optional default `inventory.low_stock_default` if not per-product. |
| 4.2 | **Backend: read/update alert settings** | Same pattern as POS: get/set; validate values. |
| 4.3 | **Settings UI – Notifications tab** | Form for expiry windows, “Sound on low stock” toggle; save and feedback. |
| 4.4 | **Dashboard / inventory – use settings** | Low-stock and expiry widgets use configured days and sound flag (if sound is implemented). |

**Deliverable**: Notifications tab functional; dashboard/alerts respect configured values.

**Estimated duration**: 1–2 days.

---

## Phase 5: Backup & Sync Configuration

**Objective**: Configure backup schedule and retention; optional “Sync now” for future offline sync.

| # | Task | Notes |
|---|------|--------|
| 5.1 | **Backup keys** | e.g. `backup.schedule` (cron expression or “daily at HH:MM”), `backup.retention_days`, `backup.cloud_enabled` (boolean). Credentials stay in .env. |
| 5.2 | **Backend: backup config API** | Read/update backup settings; schedule a job (Laravel scheduler) that runs backup based on `backup.schedule`. |
| 5.3 | **Settings UI – Backup & Sync tab** | Schedule (time picker or preset), retention, “Cloud sync” toggle; “Run backup now” button that triggers a job or command. |
| 5.4 | **Optional: offline sync status** | When Phase 5 (offline/PWA) exists: show last sync time and “Sync now” in Settings or a dedicated sync panel. |

**Deliverable**: Backup & Sync tab drives real backup schedule and retention; manual backup trigger works.

**Estimated duration**: 3–4 days (depends on existing backup implementation).

---

## Phase 6: Localization & Display

**Objective**: Language, date/time, currency, and timezone configurable.

| # | Task | Notes |
|---|------|--------|
| 6.1 | **Locale keys** | e.g. `locale`, `date_format`, `time_format`, `timezone`, `currency_code`, `currency_symbol`, `week_start`. |
| 6.2 | **Backend: read/update locale** | Get/set; validate timezone and locale against allowed list. |
| 6.3 | **Settings UI – Localization tab** | Dropdowns/inputs for locale, date/time format, timezone, currency; save and reload. |
| 6.4 | **App-wide use** | Use locale in Laravel and (if applicable) React i18n; use date/time format in reports and receipts; use currency in POS and reports. |

**Deliverable**: Localization tab functional; app (or at least reports/receipts) use selected formats and timezone.

**Estimated duration**: 2–4 days (longer if full i18n is added).

---

## Phase 7: Tax / Invoice Defaults (Optional)

**Objective**: Optional default tax and invoice/receipt text from Settings.

| # | Task | Notes |
|---|------|--------|
| 7.1 | **Keys** | e.g. `tax.default_id` (UUID of default tax), `receipt.header`, `receipt.footer`, `invoice.number_format` if needed. |
| 7.2 | **Backend + UI** | Read/update; use default tax when creating new products; use header/footer in receipt template when printing is implemented. |

**Deliverable**: Default tax and receipt header/footer configurable and used where relevant.

**Estimated duration**: 1–2 days.

---

## Summary Timeline

| Phase | Focus | Duration (est.) |
|-------|--------|------------------|
| **1** | Foundation & General / Branch | 3–5 days |
| **2** | POS Behavior | 2–3 days |
| **3** | Security & Session | 2–4 days |
| **4** | Notifications & Alerts | 1–2 days |
| **5** | Backup & Sync | 3–4 days |
| **6** | Localization | 2–4 days |
| **7** | Tax / Invoice (optional) | 1–2 days |
| **Total** | **Settings module** | **~14–24 days** |

---

## Dependencies

- **Phase 1** should be first (foundation and General/Branch).
- **Phase 2** (POS Behavior) can start once Phase 1 read/set pattern exists; receipt-related options (e.g. `pos.receipt_width`, `pos.auto_print_receipt`) become useful when receipt printing is implemented.
- **Phases 3–6** can be reordered; Phase 5 (Backup) may depend on having a backup command or job in place.
- **Phase 7** is optional and can be done when default tax and receipt layout are needed.

---

## Success Criteria

- All Settings tabs that are implemented read from and write to the backend (no hardcoded defaults for those keys).
- POS and other modules that depend on settings (branch name, POS defaults, alerts, backup, locale) use the stored values.
- Defaults are defined for every key so the app works before any user changes.
- Only users with the appropriate permission (e.g. `manage_branches`) can change settings.
