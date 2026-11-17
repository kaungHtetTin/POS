# Browser test report

The Laravel 13 application was started at port 8090 in the development workspace
and exercised using headless Chromium. Tests used the isolated pharmacy_development
MariaDB database, synthetic medicine data and local owner/cashier accounts. No
external pharmacy data was used or modified.

## Results

- 28 browser checks passed; no uncaught JavaScript errors or HTTP 5xx responses
  were observed in the main browser run.
- Cash-shift closure passed separately with counted and expected cash of $102.50.
- Direct database verification confirmed a $2.50 cash sale, $5.00 received and
  $2.50 change. Aggregate medicine stock changed from 50 to 49. The earliest
  expiry batch changed from 20 to 19; the later batch remained at 30.
- Focused backend tests: 28 passed, 149 assertions.
- Existing JavaScript pricing tests: 3 passed.
- New permanent login browser regression test: 1 passed.
- Desktop and cashier production builds passed after the form-state fix.

## Issue found and fixed

Submitting an invalid password replaced the page with the loading skeleton,
unmounting the login component and losing the entered values and validation
errors. SPA mutations now preserve mounted page state by default unless an
explicit preserveState option overrides it. Ordinary GET navigation retains its
previous loading behavior. The permanent test in tests/browser/login.test.mjs
checks a rejected password, retained field values, visible validation and a
subsequent successful login. The same behavior also passed the full browser run.

## Browser checks

| Check | Result |
| --- | --- |
| Guests are redirected to login | passed |
| Login renders at desktop width | passed |
| Wrong password is rejected | passed |
| Owner can log in and see live stock alerts | passed |
| Expiry tab displays the seeded batch | passed |
| CSV export downloads actual expiry data | passed |
| Navigation search finds authorized modules | passed |
| Branch scope filters dashboard alerts | passed |
| Desktop dashboard fits its viewport | passed |
| Dark mode switches and renders | passed |
| Owner screen /products loads | passed |
| Owner screen /inventory loads | passed |
| Owner screen /suppliers loads | passed |
| Owner screen /purchases loads | passed |
| Owner screen /customers loads | passed |
| Owner screen /sales loads | passed |
| Owner screen /reports loads | passed |
| Owner screen /settings loads | passed |
| POS opens with the active cash session | passed |
| Medicine search and cart addition work | passed |
| Cash sale completes through the browser | passed |
| Mobile dashboard and navigation work at 390px | passed |
| Mobile POS renders without horizontal overflow | passed |
| Cashier dashboard hides purchasing shortcuts | passed |
| Cashier cannot query an unassigned branch | passed |
| Handheld PWA login works | passed |
| Logout ends the owner web session | passed |
| No uncaught browser errors or HTTP 5xx responses | passed |

## Screenshots

The source archive includes login, dashboard, dark mode, POS, payment, mobile
layouts, handheld cashier and cash-reconciliation screenshots in verification/browser/.
Desktop checks used 1440 by 1000 pixels; mobile checks used 390 by 844 pixels.
The inventory table intentionally scrolls horizontally where its columns exceed
the mobile panel width. Screenshots of the dashboard, POS and mobile dashboard
were inspected for visible layout problems.

## Run the permanent regression test

Run npm ci, then set POS_BASE_URL, POS_TEST_EMAIL and POS_TEST_PASSWORD for a local
or staging test account. Set POS_BROWSER_EXECUTABLE if Chromium is not installed
at /usr/bin/chromium. Run npm run test:browser. This test is skipped when account
configuration is absent and does not create pharmacy transactions. Use a disposable
test account because it intentionally attempts one incorrect login.

## Limits

This is targeted validation, not a production certification. Physical printers,
real payment services, offline queue replay, every purchasing and returns variant,
other browser engines and production-data migration were not exercised in this
browser run. The 66 inherited full-suite failing cases documented in
UPGRADE_LARAVEL_13.md remain unresolved. The app is running only in the workspace;
this session has no live-preview forwarding tool and no deployment was performed.

No local credentials, browser storage state or environment files are included in
the delivered archive.
