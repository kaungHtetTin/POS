# Hostinger deployment

The review application is deployed at https://pharmacypos.pwarmyar.com with
Laravel 13.42.0, PHP 8.4.27, a separate MySQL database and an active lifetime SSL
certificate. HTTP redirects to HTTPS. Details for subsequent deployments are in
.hostinger/site.json. Existing pwarmyar.com applications and email records were
preserved.

Only the compiled public assets and front controller are in public_html. The app,
Composer production dependencies, .env, configuration cache and logs are in the
sibling _pharmacy_app directory, outside the document root. The adapted front
controller is recorded in deploy/hostinger-public-index.php. It sets Laravel's
public path explicitly. The existing public storage disk writes directly into
public_html/storage and does not require a symlink.

The installer and incremental error-handler patch each required a secret header,
performed a fixed setup operation and deleted themselves after success. The
uploaded archive was removed by deployment. No deployment tokens, database
credentials, application keys or local test credentials are committed.

This is a fresh installation: one Main Branch, standard roles, permissions, units,
Tax Free configuration and a new owner account. Local QA stock, cashier accounts,
transactions and sessions were not imported. Owner access is delivered separately
in a private file. Configure business identity, branch details, currency, taxes,
medicines and opening stock before operational use. Outgoing mail currently uses
the log transport; configure an email provider before relying on email delivery.

The server defaults new websites to PHP 8.3, so this website was switched to PHP
8.4 with the required extensions. The current composer.lock selects dependencies
requiring PHP 8.4.1 or newer. Do not assume the framework's PHP 8.3 minimum is
sufficient for this resolved project.

Live verification found and fixed an error handler issue where unknown routes
returned HTTP 500 before session middleware ran. ProductionErrorResponseTest
covers that case. Unknown routes now return 404, and the .env URL is forbidden.
The temporary installer and patch URLs no longer exist.

This remains a review deployment. The inherited full-suite failures documented
in UPGRADE_LARAVEL_13.md are unresolved. Do not overwrite this site for future
updates without inspecting its data and preparing a backup.
