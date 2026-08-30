---
name: build-large-screen-report-filters
description: Design, implement, restyle, or review compact filter toolbars for large-screen web applications, using the Sales Analysis report pattern of a flexible search field, fixed-width filters, aligned labels, persistent actions, and safe horizontal overflow. Use for desktop-first reporting, analytics, admin, inventory, finance, audit, and data-table pages in React, Vue, Blade, or plain HTML/CSS, especially when users ask for a filter bar like the report Sales Analysis design.
---

# Build Large-Screen Report Filters

## Workflow

1. Inspect the target page, shared form primitives, theme tokens, and existing breakpoint conventions before editing.
2. Identify filter semantics: free-text search, categorical selectors, date range, numeric thresholds, primary apply action, and optional secondary actions.
3. Read [references/pattern.md](references/pattern.md) for the layout contract, sizing guidance, accessibility requirements, and implementation example.
4. Reuse the application's components and tokens. Introduce new classes or variables only where the existing system cannot express the pattern.
5. Keep draft filter values separate from applied query state when applying filters triggers server requests. Reset pagination to page 1 when filters change.
6. Implement loading, empty, error, retry, and disabled action states when the surrounding report already supports them.
7. Verify the toolbar at a large desktop viewport and at the project's existing tablet/mobile breakpoints. Confirm that actions remain reachable, labels align, focus is visible, and the document itself does not overflow horizontally.

## Design Rules

- Place the filter toolbar inside the report or table panel, immediately before the results.
- Use a two-column shell on large screens: a shrinkable filter viewport and an intrinsic-width action group.
- Make the search field the flexible control; give selects, dates, and numeric filters stable widths.
- Align controls by their bottom edge so labeled and icon-only fields share a clean baseline.
- Keep Apply visible outside the horizontally scrollable field region.
- Allow the field row to scroll horizontally instead of squeezing controls until labels or values become unreadable.
- Keep controls compact and consistent with the application's density mode; do not invent oversized marketing-style inputs.
- Preserve native input semantics, explicit accessible names, keyboard operation, and visible focus states.
- Use progressive disclosure only when the filter set is genuinely too large for the main workflow; keep the most-used filters exposed.
- Avoid changing report business rules or API semantics merely to reproduce the visual pattern.

## Verification

- Run the relevant formatter, type checker, and focused tests.
- Inspect at approximately 1440 px and 1024 px widths, plus the application's narrow breakpoint.
- Check long translated labels, long option text, zoom or comfortable density, empty values, and validation errors.
- Confirm that horizontal scrolling is confined to the filter viewport and never hides the primary action.

