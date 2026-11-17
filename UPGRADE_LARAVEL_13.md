# Laravel 13 upgrade and new workspace interface

## Runtime and packages

Upgraded Laravel 9.52.21 to Laravel 13.42.0, the latest stable release returned by
Packagist during this work. The Laravel framework supports PHP 8.3, but this lock file requires PHP 8.4.1 or newer. The development checks
ran on PHP 8.4.24 with a disposable MariaDB instance using the MySQL connection.

Updated Sanctum 3 to 4, Ziggy 1 to 2, Tinker 2 to 3, Collision 6 to 8 and PHPUnit
9 to 12. The resolved dependencies are recorded in composer.lock. Removed unused
Doctrine DBAL, the obsolete Fruitcake Laravel CORS wrapper, the Breeze scaffold
generator and the old Ignition dependency. Laravel supplies CORS middleware and
native schema changes. Existing authentication controllers remain in the app.

The existing kernel, providers, route organization and SPA router are retained;
Laravel 13 supports this application structure. The upgrade does not rewrite
pharmacy transaction rules or add subscription billing.

Compatibility changes include the Ziggy PHP namespace, Sanctum middleware keys,
Laravel 13 request forgery middleware, native CORS, PHPUnit XML and an attribute
for the existing offline purchase data provider. Cache configuration accepts both
CACHE_STORE and the previous CACHE_DRIVER name and disables object unserialization.
Existing session serialization and explicit business branding are preserved.

## New interface

- Light sidebar with a business identity area, navigation search, expandable
  module sections, selected-page indicators and profile controls.
- Warm neutral workspace, botanical green accent, DM Sans typography, rounded
  panels, comfortable controls and coordinated dark colors.
- Dashboard rebuilt around product and supplier summaries, a stock watch card,
  tabbed stock and expiry risks, contextual actions and inventory valuation.
- Branch filtering stays explicit and summary cards use live backend data.
- New sign-in composition with the form on the left and pharmacy workflow
  illustration on the right; narrow screens prioritize the form.
- More space in the POS medicine desk, catalog cards and cart, with separate
  scrolling regions and a corrected viewport height below the navigation bar.
- Refreshed mobile cashier header and navigation colors. Service-worker cache
  version bumped for the shell refresh; offline sales storage is unchanged.
- Common forms, lists and reports inherit the shared design. Existing feature
  screens keep their operational controls and transaction logic.

The business name and logo are still taken from business settings. Saved brand
colors remain in effect; select the new green accent in appearance settings if
an existing installation has a different saved color.

## Access fixes

API exceptions retain Laravel's JSON error response instead of attempting to
render a session-dependent SPA page. Unauthorized API requests now return their
proper status rather than failing while rendering an error.

Dashboard branch filters validate requested IDs against the authenticated user's
accessible branch list before querying records. Dashboard action links follow the
existing module permissions. These changes do not create multi-business isolation.

## Verification results

| Check | Result |
| --- | --- |
| composer validate --strict | Pass |
| composer audit | No PHP dependency advisories or abandoned packages reported |
| Application boot | Laravel Framework 13.42.0 |
| Route cache and clear | Pass |
| Desktop and cashier production builds | Pass |
| Existing JavaScript pricing tests | 3 pass |
| Focused backend regression selection | 28 pass, 149 assertions |
| Dashboard light and dark server rendering | Pass with route-name validation |
| Restricted dashboard shortcuts and login server rendering | Pass |
| Complete upgraded PHP suite | 108 tests, 327 assertions; 4 errors and 62 failures |
| Unchanged Laravel 9 comparison on PHP 8.2 | 103 tests, 302 assertions; same 4 errors and 62 failures |

The 66 inherited failing case names match after normalizing PHPUnit data-provider
formatting. No additional existing-suite failures were found in this comparison.
Failure details are included in verification/ in the source archive. Causes include
unused authentication scaffold routes, permission fixtures inconsistent with the
current route requirements, validation expectations and pricing expectations.
These are unresolved issues, not passing checks. The five new LaravelUpgradeTest
cases pass and cover SPA boot, branch filtering, API permission responses and
Sanctum authentication.

The focused selection also covers existing web login, customer credit, cashier
PWA shell, navigation permissions, return financial flows, sale voiding, locale
switching and return pricing. Browser interactions and desktop/mobile appearance have now been checked in Chromium;
see BROWSER_TEST_REPORT.md for the passing checks and form-state fix. Physical
receipt printing and existing production-data migration remain unverified.

## Install and run

Use PHP 8.4.1+ with BCMath, Ctype, Curl, DOM/XML, Fileinfo, Mbstring, OpenSSL, PDO
MySQL, Session and Tokenizer; use Composer 2 and a supported Node/npm environment.

1. Back up the existing database and uploaded files. Work on a staging copy first.
2. Run composer install using the included composer.lock, then npm ci.
3. Copy .env.example to a private .env for a new installation and set APP_URL,
   MySQL credentials and mail settings. Preserve APP_KEY on an existing install.
   Generate a key with php artisan key:generate only for a new installation.
4. Run php artisan optimize:clear, php artisan migrate and
   php artisan storage:link. Never run migrate:fresh against existing business data.
5. Run npm run build and php artisan serve for a local instance.
6. Open /login. The separate handheld application remains at /cashier/.

Do not run DatabaseSeeder against business data: it includes demonstration
products, purchases, sales and users. Review default accounts before any deployment.

## Repeat the checks

Run composer validate --strict, composer audit, npm run build and
node --test tests/js/automaticPricing.test.mjs.

For backend tests, create a disposable MySQL database and supply DB_CONNECTION,
DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME and DB_PASSWORD through the environment.
phpunit.xml defaults to paramacy_dis_testing. RefreshDatabase tests recreate schema.
Run php artisan test for the full suite. Existing migrations use MySQL JOIN UPDATE
syntax; SQLite is not an equivalent test database for this repository.

The passing focused selection can be run with:

    php artisan test --filter='LaravelUpgradeTest|AuthenticationTest|CustomerCreditTest|CashierPwaTest|NavigationPermissionsTest|ReturnFinancialFlowTest|SaleVoidTest|LocaleSwitchTest|ReturnPricingTest'

Resolve inherited suite failures and finish staging-data and hardware checks before
production use. No changes have been pushed to GitHub or deployed.

## Upgrade references

- https://laravel.com/docs/13.x/upgrade
- https://laravel.com/docs/12.x/upgrade
- https://laravel.com/docs/11.x/upgrade
- https://laravel.com/docs/10.x/upgrade
- https://github.com/tighten/ziggy/blob/2.x/UPGRADING.md
