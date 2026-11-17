# Table and row action refinements

Shared tables now use clearer 11px headers, tabular numerals, consistent compact badges, readable dark-mode status colors and selected/focused row feedback. Shared footers wrap at small widths and use named previous/next controls with chevrons and accessible page announcements.

Row menus use theme-aware backgrounds, compact borders, separated destructive actions and larger mobile targets. Arrow Down opens the menu, Escape restores trigger focus and Tab dismisses it. Existing callbacks, permission visibility, pagination data and edit/delete flows are preserved. Spreadsheet editor styling remains scoped separately.

Validation: production builds; six admin table pages; edit navigation without saving; Arrow Down/Escape/Tab; mobile menu bounds; desktop, 390px and 320px layouts; dark mode; pagination control rendering; no uncaught JS or HTTP 500 errors. Live checks use read-only navigation and layout checks. Backend and database unchanged.
