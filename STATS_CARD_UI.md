# Compact stats columns

Shared StatCardGrid now uses bounded desktop columns (220–260px) instead of stretching cards across the available width. Phones use two equal columns. Cards have a compact label/icon header and a full-width value area with tabular numerals; labels, descriptions and long amounts wrap rather than truncate. Dashboard summary cards use the shared component while preserving links and data.

All existing shared-grid callers inherit the design, including products, suppliers, customers, expenses, purchase summaries, reports and finance pages. Business logic, permissions, calculations, backend and database schema are unchanged.

Validation: desktop/cashier production builds; nine admin page browser checks; 1920px, 768px, 390px and 320px viewports; long values/labels, dark mode and dashboard links. Live checks repeat the same safe navigation and layout checks without saving business records.
