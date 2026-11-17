# Viewport-sized forms

Purchase and transfer dialogs use dynamic viewport height, bounded width and non-shrinking titles/actions. Purchase basic information scrolls internally instead of clipping fields. Shared dialog forms use a flex column with scrollable content.

The product editor uses a viewport panel measured below the page heading, with scrollable fields and persistent action buttons. It responds to window and visual viewport resizing.

Browser validation covers product creation, purchase and transfer forms at 1440×900, 1366×600, 390×844 and 844×390: dialog boundaries, last-field reachability, visible action buttons and horizontal overflow. Forms are opened and closed without saving business records.
