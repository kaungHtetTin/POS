# Phase 0 baseline

The baseline is now upgraded from Laravel 9.52.21 to Laravel 13.42.0 and has a
new workspace interface. See UPGRADE_LARAVEL_13.md for setup, verification and
remaining issues. Multi-business tenancy and subscriptions are later phases.

The full baseline is not production-approved: 66 failing cases in the inherited
test suite remain. A comparison run of the unchanged Laravel 9 source on PHP 8.2
reproduced the same failing case names. The upgraded application adds five passing
regression tests and has no additional failures in the existing suite comparison.
