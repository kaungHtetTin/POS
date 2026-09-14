<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400"></a></p>

<p align="center">
<a href="https://travis-ci.org/laravel/framework"><img src="https://travis-ci.org/laravel/framework.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## Automatic pricing

Open **Settings → Automatic Pricing** using the existing settings permission (`manage_branches`). Selling and wholesale prices each have a Manual/Automatic rule, markup percentage, minimum profit per base unit, and upward rounding increment. Both rules and all existing unit prices start in Manual mode; installing this feature does not change catalog prices.

The formula matches onlineshop: choose the larger of `base cost × (1 + markup / 100)` and `base cost + minimum profit`, round upward to the configured increment, then multiply by the unit conversion factor. For example, cost 950, markup 20%, minimum profit 100, and rounding 50 produces 1,150 per base unit and 11,500 for a strip of 10.

- **Cost basis:** latest purchase date across all branches, then purchase creation time/ID and item creation time/ID. Cost uses the historical paid quantity and base quantity; free quantities do not dilute the pricing basis. Inventory valuation still uses its existing cost accounting. Before any purchase, use the medicine's optional starting buying cost.
- **Applying rules:** preview the impact before saving Automatic mode. The optional bulk checkbox enrolls all units of active medicines, including manual overrides. Without it, only existing Automatic prices recalculate. New medicine units default to enabled rules. Inactive medicines already using Automatic mode continue to follow rule edits.
- **Overrides:** medicine editing offers Manual/Automatic per unit for each price. Manual overrides survive automatic recalculation. CSV-entered prices explicitly become Manual overrides. Switching a global rule to Manual retains saved amounts and switches that price type's units to Manual.
- **Recalculation:** medicine saves, rule saves, purchase creation/edit/deletion, and offline/staff purchase synchronization refresh automatic prices. Missing cost retains the saved amount and records `cost_required`; a zero Automatic price cannot be sold. Past sales and purchase costs are never repriced.
- **Review and history:** previews are invalidated by intervening pricing/cost changes. Medicine edits use `pricing_version` to reject stale forms. Staff API clients receive that version and must send it on edits to automatic medicines. Settings shows the latest 30 recorded price changes; the database retains the audit rows, actor IDs and automatic rule snapshots.

Deployment requires PHP BCMath (declared in Composer), the migration `2026_09_14_000001_add_automatic_pricing.php`, and `npm run build`. Tests: `php artisan test --filter=AutomaticPricingTest` against an isolated database, plus `node --test tests/js/automaticPricing.test.mjs` for browser calculation previews.

## Supplier CSV import

Open **Suppliers → Import CSV** (requires `manage_inventory`). Download the template, replace/delete its example row, and save as CSV UTF-8. Keep the columns `name,phone,email,address,payment_terms`; only name is required. Phone numbers should be formatted as text in Excel to preserve leading zeros.

Each row creates a supplier with zero balance; existing suppliers are never updated. Nonempty phones and emails must be unique within the file and existing suppliers. Names may repeat, matching the supplier form. Blank optional values become null. Limits match the form: name/email 255 characters, phone 20, address/payment terms 500. Files allow 10,000 data rows / 10 MB, subject to server upload limits. Blank rows are skipped; any validation failure saves nothing and reports CSV record numbers including the header.

No additional migration is needed. Coverage: `php artisan test --filter=SupplierCsvImportTest` using an isolated database (`RefreshDatabase`).

## Medicine CSV imports

Open **Medicines → Import CSV** (requires `manage_inventory`). No additional database migration is needed for this feature on an up-to-date installation.

- **New medicines:** download the product template, replace/delete the example row, and save as CSV UTF-8. Each row creates one medicine and one base/default selling unit. `buying_cost` is required per base unit, supports up to six decimal places, and supplies automatic pricing until the medicine has a purchase. Missing categories can optionally be created; typed unit name/short-name pairs are created automatically. Existing barcodes, including archived medicines, are rejected; blank barcodes are generated. This import does not update existing medicines.
- **Units and prices:** export the current unit/price template, keep `product_id` unchanged, edit both prices, and upload. Barcode and product name are reference columns. Copy a product ID into another row and enter any unit name/short-name pair to add it without initial Unit setup. Unit names and short names must each be unique within that medicine, matching onlineshop behavior. Existing unit IDs are preserved and omitted rows are unchanged. Existing base units and conversion factors cannot be changed through this import. To change the default selling unit, include both the old and new default rows.
- Prices must be nonnegative plain numbers with at most two decimals; conversion factors must be positive whole numbers. Each medicine must finish with exactly one base unit (factor 1) and one default selling unit. Flags accept `yes/no`, `true/false`, or `1/0`.
- New medicine defaults: wholesale price equals selling price, minimum stock 10, expiry alert 90 days, discount 0%, status Active, tax method Exclusive. `tax_names` accepts active tax names separated by `|`; blank uses the existing active **Tax Free** tax. Configure taxes before importing.
- Units are managed inside each medicine and through medicine CSV imports. There is no separate Unit CRUD screen. The internal unit catalog remains in the database to preserve purchase, inventory, sale and pricing relationships.
- Keep all template headers. Format barcodes as text in Excel to preserve leading zeros. Product imports allow 10,000 rows / 10 MB; unit/price imports allow 50,000 rows / 20 MB, subject to server upload limits. Row numbers refer to CSV records, including the header. Any validation failure rolls back the entire file, including newly created categories/units.
- Stock quantities, batch numbers, batch expiry dates, and purchase costs remain part of purchases/inventory.

Import coverage is in `tests/Feature/ProductCsvImportTest.php`. Run `php artisan test --filter=ProductCsvImportTest` with an isolated test database configured; the test uses `RefreshDatabase`.

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains over 2000 video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the Laravel [Patreon page](https://patreon.com/taylorotwell).

### Premium Partners

- **[Vehikl](https://vehikl.com/)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Cubet Techno Labs](https://cubettech.com)**
- **[Cyber-Duck](https://cyber-duck.co.uk)**
- **[Many](https://www.many.co.uk)**
- **[Webdock, Fast VPS Hosting](https://www.webdock.io/en)**
- **[DevSquad](https://devsquad.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel/)**
- **[OP.GG](https://op.gg)**
- **[WebReinvent](https://webreinvent.com/?utm_source=laravel&utm_medium=github&utm_campaign=patreon-sponsors)**
- **[Lendio](https://lendio.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

## Cashier mobile PWA

The cashier-only mobile application is available at `/cashier/`. It is a separate React single-page application backed by the existing Sanctum cashier API, so the desktop administration interface is unaffected.

The mobile app includes cashier login, cash-session controls, product/barcode search, cart and checkout, customer selection/creation, receipt history/detail, branch switching, profile/photo/password editing, and installable PWA support. Product data and the active cart are cached locally. Sales made without a connection are stored with an idempotent client reference and retried through `/api/sync/sales` when connectivity returns.

Build the desktop and cashier bundles together:

```bash
npm run build
```

For cashier-only development or production builds:

```bash
npm run dev:cashier
npm run build:cashier
```

Service workers require HTTPS in production (localhost is accepted for local development). Keep `public/cashier-sw.js`, `public/cashier-build`, and `public/pwa` in the deployed public directory.
