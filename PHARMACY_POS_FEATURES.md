# Pharmacy POS System - Full Feature Overview

This document describes the complete feature set of the Pharmacy POS application implemented in this repository. It combines the product specification, current implementation status, API behavior, and business workflow described across the project documentation.

## 1. Product Overview

The Pharmacy POS System is a complete pharmacy management platform designed for medicine sales, inventory control, purchase management, financial tracking, expiry monitoring, and multi-branch operations.

It supports:

- Fast retail checkout for pharmacists and cashiers
- Barcode-driven medicine sales
- Inventory tracking with batch and expiry management
- Supplier and purchase management
- Customer account handling and credit balances
- Role-based access control
- Multi-branch operations and branch switching
- Sales, returns, and financial reporting
- Receipt printing and mobile/handheld POS support

---

## 2. Core Modules

### 2.1 Authentication and User Access

The system supports secure access for multiple roles, including:

- Owner / Admin
- Manager
- Cashier / Sales Staff
- Root or system-level user

Features include:

- Login and logout via Sanctum authentication
- Device-based token login support for mobile/handheld POS devices
- Role-based permissions and route access enforcement
- Branch-aware login and active branch selection
- Profile management with password change and profile picture upload
- Restricted access based on permission slugs such as `process_sale` and `manage_inventory`

Examples of permission controls:

- `process_sale` — access POS, customers, sales, cashier operations
- `manage_inventory` — inventory, purchase, stock and supplier management
- `manage_branches` — manages branches and settings

---

### 2.2 Multi-Branch Support

The system is designed for pharmacy businesses operating across multiple branches.

Features include:

- Branch creation, update, and management
- Branch-specific product inventory and stock records
- Branch switching in POS and cashier sessions
- Sales, purchases, and stock records tied to branch context
- Branch comparison in reporting
- Branch-specific active session state and user assignment

This allows one administrative system to manage several physical outlets while keeping operations isolated and trackable.

---

### 2.3 Dashboard and Operational Overview

The application provides a dashboard that helps pharmacy staff monitor daily operations.

Included dashboard features:

- Summary stats for sales, stock, expenses, and transactions
- Low-stock alerts
- Expiry alerts for near-expiry medicines
- Active cash session status
- Recent activity and operational summaries

This gives managers and owners quick visibility into store health and operational risk.

---

## 3. Product and Medicine Management

### 3.1 Medicine / Product Records

Each medicine or product record includes:

- Product name
- Generic name
- Brand name
- Category
- Manufacturer
- Strength / dosage
- Packaging type
- Barcode
- Purchase price / cost
- Selling price
- Wholesale price
- Minimum stock level
- Tax configuration
- Discount settings
- Active/inactive status
- Product image

The system supports product CRUD, product edits, product status updates, and product search.

### 3.2 Multi-Unit Medicine Sales

Pharmacies often sell items in multiple packaging units such as:

- Box
- Bottle
- Pack / Card
- Strip
- Tablet / single unit

Supported features:

- Multiple unit definitions per medicine
- Unit conversion factors
- Base-unit tracking
- Selling by selected unit using conversion rules
- Automatic stock conversion and deduction based on conversion factors
- Retail and wholesale price modes per unit

Example:

- 1 box = 10 cards
- 1 card = 10 tablets
- POS can sell by box, pack, or single tablet while correctly updating inventory

---

### 3.3 Product Taxes and Pricing

The system supports tax configuration and product-level pricing. Features include:

- Tax categories and rules
- Product tax assignment
- Selling price and wholesale price handling
- Product-level discount percentage
- Automatic pricing logic based on cost and markup rules
- Manual or automatic pricing modes per unit and price type
- Price overrides and recalculation controls

Automatic pricing rules can be configured with:

- Markup percentage
- Minimum profit per base unit
- Pricing increment rounding
- Cost basis selection
- Rule preview and review history

---

## 4. Inventory Management

### 4.1 Real-Time Inventory Tracking

The system maintains real-time stock operations:

- Stock in and stock out
- Stock adjustment
- Inventory updates on purchase or sale
- Product search within inventory modules
- Quantity tracking by branch and medicine

The system stores both:

- Aggregate inventory totals (`inventories`)
- Batch-level stock records (`inventory_batches`)

### 4.2 Batch and Expiry Management

Each stock entry tracks:

- Batch number
- Expiry date
- Purchase date
- Supplier details
- Quantity and cost

Core expiry functions include:

- FEFO (First Expire, First Out) inventory deduction
- Automatic selection of earliest-expiring stock during sales
- Expiry warnings at thresholds such as 90, 60, and 30 days before expiry
- Near-expiry reports
- Expired drug reports
- Expiry-based medicine listing and alerts

### 4.3 Stock Transfer Support

The system supports stock transfer workflows between branches, including:

- Branch-to-branch transfer initiation
- Transfer status handling
- Inventory adjustments upon completion

---

## 5. Supplier and Purchase Management

### 5.1 Supplier Management

The system stores supplier information, including:

- Supplier name
- Contact phone
- Email
- Address
- Payment terms
- Balance / outstanding amount
- Supplier purchase history

Supplier features include:

- Supplier CRUD
- Balance tracking
- Supplier payment tracking
- Purchase and return linkage to suppliers

### 5.2 Purchase Workflow

The purchase module handles the full supplier receiving flow.

Features include:

- Create purchase order / purchase record
- Supplier selection
- Invoice number assignment
- Medicine item selection
- Quantity and cost entry
- Batch number and expiry date capture
- Payment status tracking
- Automatic inventory update after receipt
- FOC (free-of-charge) stock handling
- Wholesale price updates based on purchase data
- Purchase detail view and list

The purchase process also updates product unit cost and inventory stock status correctly.

### 5.3 Supplier Payment Tracking

The system allows later recording of supplier payments.

Included capabilities:

- Payment entry against supplier purchases
- Payment amount tracking
- Supplier outstanding balance updates
- Payment history and reporting

---

## 6. Customer Management

The system supports customer records for retail and credit sales.

Customer features include:

- Create, update, and search customers
- Customer phone, address, and credit limit management
- Customer balance tracking
- Quick customer selection in POS
- Credit-based sales support
- Customer sales history and payment linkage

Customers are useful for:

- Walk-in retail customers
- Credit customers
- Repeated pharmacy buyers
- Return and account reconciliation work

---

## 7. Point of Sale (POS) Module

### 7.1 Fast POS Checkout

The POS module is designed for efficient pharmacy sales.

Features include:

- Barcode scanning
- Product search by name, barcode, or generic name
- Catalog browsing by category
- Add/remove cart items
- Quantity adjustments
- Product line discount handling
- Multi-unit selection inside cart
- Retail and wholesale price toggle
- Customer assignment
- Payment method selection
- Transaction finalization
- Receipt printing

### 7.2 Payment Handling

The POS supports multiple payment methods, including:

- Cash
- Card
- Mobile payment
- Wallet
- Paid status
- Partial payment
- Due or unpaid balance

The system keeps track of payment status and balance amounts.

### 7.3 Product Discounts and FOC Handling

The POS supports:

- Product-level discount percentages
- Automatic discount logic tied to the medicine/product
- Free-of-charge (FOC) quantity support
- FOC quantity/unit deductions while keeping stock accurate
- Discount and FOC tracking in sale records and reporting

Important implementation note:

- Manual sale-wide discounts are not part of the current POS UI/API design
- Product discount percentage is the main discount mechanism in the current system

### 7.4 Retail / Wholesale Pricing Modes

The POS can switch between retail and wholesale pricing on a sale item basis.

This allows pharmacy staff to:

- Sell to regular customers at retail price
- Price for bulk or wholesale buyers correctly
- Keep unit pricing logic consistent with product unit configuration

### 7.5 FEFO Sale Deduction

The system automatically selects stock using FEFO logic, ensuring the earliest-expiring stock is sold first.

This is essential in pharmacy operations for safe and compliant medicine rotation.

### 7.6 Receipt Printing

The system includes receipt generation and printing support.

Supported features:

- POS receipt generation
- Browser printing support
- Receipt settings for header, footer, width, and auto-print behavior
- Thermal printer configuration for handheld POS devices
- ESC/POS-style print support for supported hardware

---

## 8. Cash Sessions and Cash Management

The system supports cashier session management.

Features include:

- Open cash session
- Close cash session
- Active-session guards
- Session-based sales tracking
- Cash reconciliation and reporting
- Session-based audit trail for sales records

This helps track which cashier processed which sales and provides financial accountability.

---

## 9. Returns and Corrections

The application supports return flows for both customers and suppliers.

Features include:

- Customer return creation
- Supplier return creation
- Return item management
- Return by sale or purchase reference
- Approve/reject return workflow
- Balance and stock adjustment on return processing
- Gross profit and return-related reporting

This provides a complete post-sale correction and adjustment process for pharmacy operations.

---

## 10. Financial Management and Expenses

The system includes financial modules beyond inventory and sales.

Features include:

- Expense creation
- Expense categories
- Expense tracking
- Cost tracking across branches
- Sales reports
- COGS (Cost of Goods Sold) reporting
- Gross profit analysis
- Branch comparison and summary reports
- Cash session reports

This makes the POS useful not only for point-of-sale operations but also for financial monitoring and internal accounting.

---

## 11. Reporting and Analytics

The system provides operational and financial reporting.

Included reporting features:

- Sales report
- Returns report
- Gross profit analysis
- Branch comparison report
- Cash session summary
- Stock and expiry reports
- Supplier purchase history
- Product performance and sales summary
- Inventory valuation and stock movement overview

Reports help owners and managers understand:

- Revenue performance
- Product movement
- Supplier trends
- Sales by branch
- Profitability
- Expiry risk

---

## 12. Settings and System Configuration

The application includes system configuration capabilities for operational settings.

Settings features include:

- Branch management settings
- POS behavior settings
- Receipt settings
- Currency and localization support
- Automatic pricing configuration
- Tax configuration
- Inventory alert configuration
- Display preferences and default POS behavior

Examples of POS settings include:

- Receipt width
- Auto-print setting
- Barcode focus behavior
- View mode selection
- Default payment method
- Default POS layout behavior

---

## 13. Hardware and Integration Support

The system is designed to integrate with common pharmacy retail devices.

Supported/targeted hardware includes:

- Barcode scanners
- Barcode printers
- Receipt printers
- Thermal printers
- Handheld POS terminals
- Mobile Android-style scanning workflows

POS design specifications include:

- Single-screen cashier workflow
- Fast input and minimal navigation
- Barcode-first operation
- One-tap payment flow
- Receipt printing integration

---

## 14. Mobile / Handheld POS Support

The project includes a cashier-only mobile experience built as a PWA / SPA.

Features include:

- Cashier login
- Cash session controls
- Product and barcode search
- Cart and checkout flow
- Customer selection and creation
- Receipt history and detail viewing
- Branch switching
- Profile, photo, and password editing
- Installable application support
- Local caching of product data and active cart

The mobile POS is connected to the existing backend Sanctum cashier API and is designed for handheld devices.

---

## 15. Offline-First Features (Planned / Not Fully Implemented)

The project specification includes future offline-first functionality, although this is not yet fully implemented.

Planned features include:

- Offline transaction caching
- Local IndexedDB / Dexie storage
- Service worker support
- PWA installation and offline availability
- Client-side sync queue for sales and purchases
- `/api/v1/health` checks
- `/api/v1/sync/*` sync endpoints
- Conflict handling and retry logic for failed online submissions

The current implementation status notes that this phase is not started yet, but the design direction is clearly defined.

---

## 16. Full Business Capability Summary

The Pharmacy POS system covers the full set of capabilities required for modern pharmacy retail operations:

- Product catalog and medicine management
- Multi-unit pricing and conversion
- Inventory and stock accounting
- Supplier and purchasing flows
- Customer management and credit tracking
- Pharmacy POS checkout
- Barcode-based sales processing
- Cash sessions and cash accounting
- Returns and corrections
- Payment handling and financial reporting
- Branch operations and multi-store support
- Expiry alerts and QA controls
- Receipts and printing integration
- Mobile handheld cashier workflows
- Backend API automation for staff and cashier use

---

## 17. Current Implementation Status

According to the project specification and current-state documentation:

- Core foundation and master data are completed
- Inventory, supplier, and purchase workflow are completed
- POS functionality is largely complete
- API layer for mobile/handheld POS is implemented
- Financials and reporting are mostly complete
- Offline-first sync and deployment optimization are still pending

This means the application is already close to a full operational pharmacy POS, with a few strategic gaps remaining, such as:

- Prescription upload/linking
- Dedicated web customer CRUD page
- Offline sync engine
- Production deployment readiness

---

## 18. Final Note

This Pharmacy POS is not just a simple sales application. It is a full pharmacy operations system with:

- operational inventory controls,
- financial tracking,
- supplier purchasing logic,
- cashier checkout workflows,
- product-level pricing rules,
- branch management,
- customer handling,
- mobile POS support,
- and reporting that supports business decision-making.

It is structured to serve both retail pharmacy sales and internal operational administration in a single integrated platform.
