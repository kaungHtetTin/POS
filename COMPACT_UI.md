# Compact interface

The shared operational interface uses a narrower 224px sidebar, a 48px toolbar,
14px desktop page padding, smaller headings, 32px desktop buttons, 34px form
fields and approximately 36px table rows. Panels use smaller corners and padding.

The dashboard uses four summary columns on desktop and two on mobile, tighter
section spacing, smaller counters and a compact action panel. Its empty inventory
state uses a grid so global table action-row styles cannot turn it into a clipped
horizontal row. POS viewport sizing matches the shorter toolbar.

Touch devices retain 40px minimum controls, and mobile navigation keeps larger
rows. Stock, checkout, pricing, permissions and data handling are unchanged.

Both production bundles build successfully, existing JavaScript pricing tests
pass, and local Chromium checks cover dashboard density, table rows, dark mode,
list/form screens, POS, mobile touch targets and navigation. The live frontend
is updated through new versioned assets followed by an atomic manifest switch.
The server database, owner password and private application files are untouched.

Workspace HTTPS browser checks use a browser-specific exception for the workspace
inspection proxy certificate; separate curl and Python checks verify TLS normally.
This exception is confined to the QA runner, not the application or hosting.
