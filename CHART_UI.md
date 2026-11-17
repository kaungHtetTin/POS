# Report chart polish

Shared report charts, finance charts and customer charts use a coordinated palette, lighter colors in dark mode, subtle grids, compact wrapping legends, rounded bars and theme-aware tooltips. Axis numbers use compact notation; hover values retain the existing full money format. Long category labels are shortened on axes while hover labels retain the original names. Short/single-point series show visible markers.

Chart cards have consistent spacing and corners. Finance panels stack at phone/tablet widths; min-width constraints keep report tables from stretching the surrounding chart layout. Compact chart empty states are styled without invented data. Calculations, filters, endpoints and database schema are unchanged.

Validation: production desktop/cashier builds; finance, purchase, customer sales, cash-session and representative reports; customer details via a browser-only sample (the local database has no customer fixture); hover tooltip and legend rendering; dark mode; 390px and 320px widths. Checks open reports without saving transactions.
