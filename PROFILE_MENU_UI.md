# App bar account menu

The admin app bar account button opens a compact dropdown on desktop and mobile. It displays the signed-in name, email and role, followed by My profile, Dashboard, Settings (manage_settings only), SOP Manual and Log out.

Links and visibility reuse the existing navigation definitions. Logout posts to the existing Laravel logout route; backend code and database schema are unchanged. MUI menu handles keyboard navigation, Escape and focus restoration.

Browser checks cover owner links, cashier permission visibility, profile navigation, mobile fit, dark mode, logout POST and redirect of protected pages after logout. Frontend production build is verified before deployment.
