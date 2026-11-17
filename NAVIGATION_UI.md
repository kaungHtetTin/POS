# Navigation refresh

The compact sidebar now uses icon-led module buttons, nested page links with a
vertical guide, an active-page accent and a business identity header. The top
bar shows the current module and page. Search matches both modules and page names
and clears after navigation.

The collapsed sidebar shows one button per module rather than every child link.
Clicking a module opens a flyout with its permitted pages. Escape closes the menu
and restores trigger focus; Enter opens it. The collapsed preference survives a
reload. Menu backdrops stay transparent; dialogs retain their normal backdrop.

On mobile the drawer uses larger touch rows and closes when a page or profile is
selected. Desktop and mobile trees use separate IDs for expansion controls.
Administration contains staff, role, permission, branch and activity management.
The SOP manual is available under Settings alongside profile and permitted settings.

Role filtering remains in effect before search results or flyout items are built.
Browser checks cover expanded navigation, current-page and breadcrumb state,
search, flyouts, keyboard focus, persistence, dark mode, mobile behavior and
cashier permissions. Production assets are updated without changing business data.
