# App bar components

Updated compact page actions, grouped secondary tools, search trigger and search close control, filter drawer fields and footer, and POS branch dropdown styling.

Validation: desktop and cashier production builds; browser checks for search query updates, filter drawer, CSV download, light/dark themes, mobile viewport fit, and uncaught JavaScript errors. The same checks are run against the deployed site.

Deployment replaces hashed frontend assets and switches manifests last. Application code and business records are untouched by this frontend release.

Search refinement: neutral input surface, consistent icon spacing, 32px desktop/36px mobile height, thin focus border and subtle focus ring. The inline close icon is exempt from standalone app bar button styling. Verified query updates, collapse behavior and responsive fit in the browser.

Filter drawers now use a plain form surface with consistent field spacing and six-pixel input corners. Removed all field card backgrounds, borders and padding in the shared drawer component. Browser checks cover medicine, purchase report and finance drawers, including dark mode and mobile.
