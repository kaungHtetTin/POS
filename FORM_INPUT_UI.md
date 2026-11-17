# Consistent forms and spreadsheet entry

Navigation uses directional panel icons and exposes expanded state to assistive technology.

Shared MUI and native text inputs use six-pixel corners, theme-aware surfaces, consistent focus treatment, disabled states and visible validation errors. Mobile cashier fields share the form language while retaining touch-friendly heights.

Editable MUI tables share cell grid lines, compact column headers, unboxed cell editors, right-aligned numeric values, tabular numerals and active-cell outlines. Error cells retain red outlines. Read-only listing tables keep their existing layout.

Enter moves to the next editable row in the same column; Shift+Enter moves up. At the edge it prevents accidental form submission. Native Tab order and text editing remain available; open autocomplete suggestions and composition input are excluded. This provides spreadsheet-style entry, not Excel formulas or clipboard range operations.

Validation: production desktop/cashier builds, browser checks on shared forms and filter drawers, navigation toggle state, local POS row navigation with synthetic data, desktop/mobile fit, themes, export and search. Live checks cover navigation, purchase form, filters and mobile cashier login rendering; no production business records are created.
