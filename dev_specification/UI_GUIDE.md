# UI Development Guide - Pharmacy POS

This guide outlines the design system, components, and best practices for developing the Pharmacy POS user interface using React and Material UI (MUI).

---

## **1. Design System Overview**

The UI is designed to be **high-density**, **compact**, and **professional**. It uses a **Flat Design** aesthetic with minimal elevation and subtle borders.

### **Branding Colors**

- **Primary (Medical Teal)**: `#00796b` - Used for primary actions, active states, and branding.
- **Secondary (Health Green)**: `#2e7d32` - Used for success states, secondary actions, and health-related UI.
- **Background (Light)**: `#f4f7f6` (Soft Light Gray/Blue)
- **Background (Dark)**: `#0a1929` (Deep Slate Blue)

### **Core Design Rules**

- **Border Radius**: Fixed at `4px` across all components (Buttons, Cards, Modals).
- **Base Font Size**: `13px` for high information density.
- **Elevation**: `0` for most components. Use borders (`1px solid #e0e0e0`) instead of shadows.
- **Dense Mode**: Always enable `dense` properties on MUI components where available.

---

## **2. Layout Management**

### **Main Layout (`MainLayout.jsx`)**

All authenticated pages must be wrapped in `MainLayout`.

- **Sidebar Width**: `200px` (Compact).
- **Header Height**: `48px` (Dense).
- **Features**: Includes the theme switcher (Light/Dark mode) and user profile menu.

```jsx
import MainLayout from "@/Layouts/MainLayout";

export default function MyPage(props) {
    return (
        <MainLayout header="Page Title" auth={props.auth}>
            {/* Page Content */}
        </MainLayout>
    );
}
```

---

## **3. Component Standards**

### **Buttons**

Always use `size="small"` for standard actions.

- **Contained**: Primary actions (e.g., Save, Submit).
- **Outlined**: Secondary actions (e.g., Cancel, Edit).
- **Text**: Low-priority actions (e.g., Reset, Delete).

### **Forms & Inputs**

The theme is pre-configured for dense inputs.

- **TextField**: Use `size="small"`. Labels are configured not to overlap when focused.
- **Select**: Use with `FormControl` and `InputLabel` linked by IDs for correct notch rendering.

```jsx
<TextField label="Product Name" placeholder="e.g. Paracetamol" />
```

### **Data Tables**

Use `size="small"` for `Table` components.

- **Header Background**: Use dynamic background `(theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)'`.
- **Padding**: Compact padding is globally set in `theme.js`.

### **Feedback (Alerts & Modals)**

- **Modals**: Use `Dialog` component. Header/Footer borders are pre-styled.
- **Alerts**: Use `Snackbar` + `Alert` for success/error notifications.

---

## **4. Night Mode (Dark Mode)**

The system uses `ColorModeContext` to toggle themes. The colors and borders automatically adjust based on `theme.palette.mode`.

**Best Practice**: Avoid hardcoding hex colors in components. Use theme tokens:

- `color: 'text.secondary'`
- `bgcolor: 'background.paper'`
- `borderColor: 'divider'`

---

## **5. File Structure**

- [theme.js](file:///c:/xampp/htdocs/medicine-store/resources/js/Theme/theme.js): The central design system configuration.
- [app.jsx](file:///c:/xampp/htdocs/medicine-store/resources/js/app.jsx): Theme initialization and Context provider.
- [MainLayout.jsx](file:///c:/xampp/htdocs/medicine-store/resources/js/Layouts/MainLayout.jsx): The core shell of the application.
- [Dashboard.jsx](file:///c:/xampp/htdocs/medicine-store/resources/js/Pages/Dashboard.jsx): The living showcase of all UI patterns.
