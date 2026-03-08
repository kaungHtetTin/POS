# Pharmacy POS System: Detailed Technical Specification

This document provides a granular technical blueprint for the implementation of the Pharmacy POS System, expanding on the [PHARMACY_POS_BASELINE.md](file:///c:/xampp/htdocs/medicine-store/PHARMACY_POS_BASELINE.md).

---

## 1. Database Schema & Data Integrity

### 1.1 Core Tables (UUID-Based)

#### **Branches (`branches`)**

- `id`: UUID (PK)
- `name`: String
- `phone`: String
- `address`: Text
- `status`: Enum('Active', 'Inactive')
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Units (`units`)**

- `id`: UUID (PK)
- `name`: String (e.g., 'Box', 'Card', 'Tablet', 'Bottle')
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Taxes (`taxes`)**

- `id`: UUID (PK)
- `name`: String (e.g., 'VAT 5%', 'Standard')
- `rate`: Decimal(5,2) (e.g., 5.00)
- `is_default`: Boolean
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Categories (`categories`)**

- `id`: UUID (PK)
- `name`: String (e.g., 'Antibiotics', 'Vitamins')
- `description`: Text
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Products (`products`)**

- `id`: UUID (PK)
- `category_id`: UUID (FK)
- `tax_id`: UUID (FK)
- `name`: String
- `generic_name`: String
- `brand_name`: String
- `manufacturer`: String
- `strength`: String (e.g., '500mg')
- `barcode`: String (Unique)
- `description`: Text
- `min_stock_level`: Integer (In smallest unit)
- `tax_method`: Enum('Exclusive', 'Inclusive')
- `status`: Enum('Active', 'Inactive')
- `created_at`: Timestamp
- `updated_at`: Timestamp
- `deleted_at`: Soft Delete (For sync tracking)

#### **Product Units (`product_units`)**

- `id`: UUID (PK)
- `product_id`: UUID (FK)
- `unit_id`: UUID (FK)
- `conversion_factor`: Integer (Multiplier for base unit)
- `selling_price`: Decimal(15,2)
- `is_base_unit`: Boolean
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Inventory Batches (`inventory_batches`)**

- `id`: UUID (PK)
- `branch_id`: UUID (FK)
- `product_id`: UUID (FK)
- `batch_number`: String
- `expiry_date`: Date
- `quantity`: Integer (In smallest unit)
- `purchase_price`: Decimal(15,2) (Per smallest unit)
- `selling_price`: Decimal(15,2) (Per smallest unit - default)
- `is_synced`: Boolean (For offline sync)
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Suppliers (`suppliers`)**

- `id`: UUID (PK)
- `name`: String
- `phone`: String
- `email`: String
- `address`: Text
- `payment_terms`: Text
- `balance`: Decimal(15,2) (Outstanding balance)
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Customers (`customers`)**

- `id`: UUID (PK)
- `name`: String
- `phone`: String
- `email`: String
- `address`: Text
- `purchase_history_count`: Integer
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Sales (`sales`)**

- `id`: UUID (PK)
- `branch_id`: UUID (FK)
- `user_id`: UUID (FK)
- `customer_id`: UUID (FK, Optional)
- `invoice_number`: String (Unique)
- `total_amount`: Decimal(15,2)
- `discount`: Decimal(15,2)
- `tax`: Decimal(15,2)
- `grand_total`: Decimal(15,2)
- `payment_method`: Enum('Cash', 'Card', 'Mobile', 'Wallet')
- `payment_status`: Enum('Paid', 'Partial', 'Due')
- `sale_date`: DateTime
- `is_synced`: Boolean
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Sale Items (`sale_items`)**

- `id`: UUID (PK)
- `sale_id`: UUID (FK)
- `product_id`: UUID (FK)
- `batch_id`: UUID (FK)
- `unit_id`: UUID (FK)
- `quantity`: Decimal(10,2) (Quantity in selected unit)
- `base_quantity`: Integer (Quantity in smallest unit)
- `unit_price`: Decimal(15,2)
- `total_price`: Decimal(15,2)
- `created_at`: Timestamp

#### **Purchases (`purchases`)**

- `id`: UUID (PK)
- `supplier_id`: UUID (FK)
- `branch_id`: UUID (FK)
- `invoice_number`: String
- `purchase_date`: Date
- `total_amount`: Decimal(15,2)
- `payment_status`: Enum('Paid', 'Partial', 'Due')
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### **Purchase Items (`purchase_items`)**

- `id`: UUID (PK)
- `purchase_id`: UUID (FK)
- `product_id`: UUID (FK)
- `batch_number`: String
- `expiry_date`: Date
- `quantity`: Integer (In smallest unit)
- `unit_price`: Decimal(15,2)
- `total_price`: Decimal(15,2)
- `created_at`: Timestamp

#### **Returns (`returns`)**

- `id`: UUID (PK)
- `type`: Enum('Customer', 'Supplier')
- `reference_id`: UUID (Sale_ID or Purchase_ID)
- `branch_id`: UUID (FK)
- `reason`: Text
- `refund_amount`: Decimal(15,2)
- `status`: Enum('Pending', 'Approved', 'Rejected')
- `created_at`: Timestamp

#### **Return Items (`return_items`)**

- `id`: UUID (PK)
- `return_id`: UUID (FK)
- `product_id`: UUID (FK)
- `quantity`: Integer (In smallest unit)
- `refund_price`: Decimal(15,2)

#### **Expenses (`expenses`)**

- `id`: UUID (PK)
- `branch_id`: UUID (FK)
- `title`: String
- `amount`: Decimal(15,2)
- `expense_date`: Date
- `notes`: Text
- `created_at`: Timestamp

#### **Prescriptions (`prescriptions`)**

- `id`: UUID (PK)
- `customer_id`: UUID (FK)
- `sale_id`: UUID (FK, Optional)
- `doctor_name`: String
- `image_path`: String
- `notes`: Text
- `created_at`: Timestamp

#### **Stock Transfers (`stock_transfers`)**

- `id`: UUID (PK)
- `from_branch_id`: UUID (FK)
- `to_branch_id`: UUID (FK)
- `transfer_date`: Date
- `status`: Enum('Pending', 'Completed', 'Cancelled')
- `created_at`: Timestamp

#### **Activity Logs (`activity_logs`)**

- `id`: UUID (PK)
- `user_id`: UUID (FK)
- `action`: String (e.g., 'LOGIN', 'PRICE_CHANGE', 'SALE_CANCEL', 'STOCK_ADJUST')
- `description`: Text
- `created_at`: Timestamp

#### **Settings (`settings`)**

- `id`: UUID (PK)
- `key`: String (Unique)
- `value`: Text
- `updated_at`: Timestamp

---

## 2. Business Workflows & Logic

### 2.1 FEFO (First Expire First Out) Logic

When a product is sold:

1.  System fetches all active batches for the product in the current branch.
2.  Filters batches where `quantity > 0` and `expiry_date > today`.
3.  Orders by `expiry_date ASC` (Soonest to expire first).
4.  Deducts stock from the first available batch. If the quantity sold exceeds the batch's stock, it moves to the next batch (Atomic Transaction).

### 2.2 Medicine Alternative Suggestion

If a medicine is out of stock, the system queries the `products` table for other items with the same `generic_name` that have stock available in the current branch.

### 2.3 Stock & Expiry Alerts

- **Low Stock**: Scheduled task checks if `total_quantity` in `inventories` < `min_stock_level` in `products`.
- **Expiry Warnings**: Dashboard widget displays batches expiring in 90, 60, and 30 days.

---

## 3. POS Workflow & Multi-Unit Calculations

### 3.1 Unit Conversion Example (Panadol)

- **Base Unit**: Tablet (Factor = 1)
- **Unit A**: Card (Factor = 10)
- **Unit B**: Box (Factor = 100)

**Scenario**: Sell 2 Cards.

1.  Lookup Unit "Card" for Product "Panadol" -> Factor = 10.
2.  `quantity_to_deduct = 2 * 10 = 20 Tablets`.
3.  Calculate price using `product_units.selling_price` for "Card".

### 3.2 Tax Calculation Formulas

- **Exclusive**: `Total = (Qty * Price) + ((Qty * Price) * TaxRate / 100)`
- **Inclusive**: `Price_Without_Tax = Price / (1 + (TaxRate / 100))`
    - `Tax_Amount = Total_Price - Price_Without_Tax`

---

## 4. Offline-First & Synchronization Strategy

### 4.1 Frontend Data Persistence (Dexie.js)

The browser will maintain local stores in **IndexedDB**:

- `local_sales`: Stores sales made while offline.
- `local_inventory_updates`: Tracks changes to stock.
- `cached_data`: Read-only copies of products, units, and taxes.

### 4.2 Synchronization Flow (Background Worker)

1.  **Online Check**: Periodic ping to `/api/v1/health`.
2.  **Push Local Changes**: Send `local_sales` to `/api/v1/sync/sales`.
3.  **Conflict Resolution**:
    - Server checks if the UUID already exists.
    - If successful, server returns the confirmed `last_synced_at` timestamp.
4.  **Pull Server Changes**: Download new products or price updates since the last sync.

---

## 5. User Roles & Permissions (RBAC)

| Permission             | Owner | Manager | Cashier |
| :--------------------- | :---: | :-----: | :-----: |
| Process Sale           |  Yes  |   Yes   |   Yes   |
| Cancel Transaction     |  Yes  |   Yes   |   No    |
| Add/Edit Products      |  Yes  |   Yes   |   No    |
| Manage Inventory       |  Yes  |   Yes   |   No    |
| Manage Purchases       |  Yes  |   Yes   |   No    |
| View Financial Reports |  Yes  |   No    |   No    |
| Manage Branches        |  Yes  |   No    |   No    |
| Manage Users           |  Yes  |   No    |   No    |
| Adjust Stock           |  Yes  |   Yes   |   No    |
| Monitor Activity       |  Yes  |   Yes   |   No    |

---

## 6. Hardware Implementation Details

### 6.1 Barcode Scanning (React Hook)

A global listener for the `keydown` event. If a sequence of numeric characters is received within 50ms, ending with "Enter", it is treated as a barcode.

### 6.2 Thermal Printing (CSS `@media print`)

```css
@media print {
    .no-print {
        display: none;
    }
    body {
        width: 80mm;
        margin: 0;
        padding: 0;
        font-size: 10pt;
    }
    .receipt-header {
        text-align: center;
        font-weight: bold;
    }
}
```

### 6.3 Barcode Printing

Integration with barcode printer drivers via standard print dialogs or specialized label templates (ZPL/EPL if needed).

---

## 7. Reporting & Analytics

- **Sales**: Daily, Monthly, Yearly, by Employee, by Branch.
- **Inventory**: Low stock, Expired, Near-expiry, Best-selling, Slow-moving.
- **Financial**: Profit & Loss, Monthly/Yearly Financial Report, Expenses.
- **Audit**: Activity Tracking, Login history.

---

## 8. Backup & Security

- **Backup**: Daily automatic local backup (MySQL dump) + optional S3/Cloud sync.
- **Security**: JWT-based authentication for APIs, Argon2 password hashing, RBAC enforcement.

---

## 9. Non-Functional Requirements

- **Performance**: POS transactions must complete within 2 seconds.
- **Scalability**: Support multiple concurrent users across multiple branches.
- **Reliability**: Automated data sync once connection is restored.
