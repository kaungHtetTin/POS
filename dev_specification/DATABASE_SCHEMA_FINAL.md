# Pharmacy POS: Final Database Schema Design

This document provides the full, implementation-ready database schema for the Pharmacy POS system. All tables use **UUIDs** as primary keys for offline-first support.

---

## 1. Core & Management Tables

### **branches**

- `id`: `uuid` (PK)
- `name`: `string`
- `phone`: `string`
- `address`: `text`
- `status`: `enum('Active', 'Inactive')` (Default: 'Active')
- `created_at`, `updated_at`: `timestamps`

### **users**

- `id`: `uuid` (PK)
- `branch_id`: `uuid` (FK -> branches.id)
- `name`: `string`
- `email`: `string` (Unique)
- `password`: `string`
- `phone`: `string`
- `status`: `enum('Active', 'Inactive')`
- `created_at`, `updated_at`: `timestamps`

### **roles**

- `id`: `uuid` (PK)
- `name`: `string` (Unique: 'Owner', 'Manager', 'Cashier')
- `created_at`, `updated_at`: `timestamps`

### **role_user** (Pivot)

- `user_id`: `uuid` (FK -> users.id)
- `role_id`: `uuid` (FK -> roles.id)

---

## 2. Product & Unit Tables

### **categories**

- `id`: `uuid` (PK)
- `name`: `string`
- `description`: `text` (Nullable)
- `created_at`, `updated_at`: `timestamps`

### **units**

- `id`: `uuid` (PK)
- `name`: `string` (e.g., 'Box', 'Card', 'Tablet', 'Bottle')
- `created_at`, `updated_at`: `timestamps`

### **taxes**

- `id`: `uuid` (PK)
- `name`: `string`
- `rate`: `decimal(5,2)` (Percentage)
- `is_default`: `boolean` (Default: false)
- `created_at`, `updated_at`: `timestamps`

### **products**

- `id`: `uuid` (PK)
- `category_id`: `uuid` (FK -> categories.id)
- `tax_id`: `uuid` (FK -> taxes.id)
- `name`: `string`
- `generic_name`: `string` (Nullable)
- `brand_name`: `string` (Nullable)
- `manufacturer`: `string` (Nullable)
- `strength`: `string` (Nullable, e.g., '500mg')
- `barcode`: `string` (Unique, Nullable)
- `description`: `text` (Nullable)
- `min_stock_level`: `integer` (In smallest unit)
- `tax_method`: `enum('Exclusive', 'Inclusive')`
- `status`: `enum('Active', 'Inactive')`
- `created_at`, `updated_at`: `timestamps`
- `deleted_at`: `timestamp` (Soft Delete for sync tracking)

### **product_units** (Conversion & Multi-Unit Pricing)

- `id`: `uuid` (PK)
- `product_id`: `uuid` (FK -> products.id)
- `unit_id`: `uuid` (FK -> units.id)
- `conversion_factor`: `integer` (Multiplier for base unit)
- `selling_price`: `decimal(15,2)`
- `is_base_unit`: `boolean` (True if this is the smallest unit)
- `created_at`, `updated_at`: `timestamps`

---

## 3. Inventory & Batches

### **inventories** (Summary per Branch)

- `id`: `uuid` (PK)
- `branch_id`: `uuid` (FK -> branches.id)
- `product_id`: `uuid` (FK -> products.id)
- `quantity`: `integer` (Total stock in smallest unit)
- `created_at`, `updated_at`: `timestamps`

### **inventory_batches** (FEFO Tracking)

- `id`: `uuid` (PK)
- `branch_id`: `uuid` (FK -> branches.id)
- `product_id`: `uuid` (FK -> products.id)
- `batch_number`: `string`
- `expiry_date`: `date`
- `quantity`: `integer` (Stock remaining in this batch in smallest unit)
- `purchase_price`: `decimal(15,2)` (Cost per smallest unit)
- `selling_price`: `decimal(15,2)` (Selling price per smallest unit)
- `is_synced`: `boolean` (Default: false)
- `created_at`, `updated_at`: `timestamps`

---

## 4. Purchasing & Suppliers

### **suppliers**

- `id`: `uuid` (PK)
- `name`: `string`
- `phone`: `string`
- `email`: `string` (Nullable)
- `address`: `text` (Nullable)
- `payment_terms`: `text` (Nullable)
- `balance`: `decimal(15,2)` (Default: 0.00)
- `created_at`, `updated_at`: `timestamps`

### **purchases**

- `id`: `uuid` (PK)
- `supplier_id`: `uuid` (FK -> suppliers.id)
- `branch_id`: `uuid` (FK -> branches.id)
- `invoice_number`: `string`
- `purchase_date`: `date`
- `total_amount`: `decimal(15,2)`
- `payment_status`: `enum('Paid', 'Partial', 'Due')`
- `created_at`, `updated_at`: `timestamps`

### **purchase_items**

- `id`: `uuid` (PK)
- `purchase_id`: `uuid` (FK -> purchases.id)
- `product_id`: `uuid` (FK -> products.id)
- `batch_number`: `string`
- `expiry_date`: `date`
- `quantity`: `integer` (In smallest unit)
- `unit_price`: `decimal(15,2)`
- `total_price`: `decimal(15,2)`
- `created_at`: `timestamp`

---

## 5. POS Sales & Customers

### **customers**

- `id`: `uuid` (PK)
- `name`: `string`
- `phone`: `string` (Nullable)
- `email`: `string` (Nullable)
- `address`: `text` (Nullable)
- `purchase_history_count`: `integer` (Default: 0)
- `created_at`, `updated_at`: `timestamps`

### **sales**

- `id`: `uuid` (PK)
- `branch_id`: `uuid` (FK -> branches.id)
- `user_id`: `uuid` (FK -> users.id)
- `customer_id`: `uuid` (FK -> customers.id, Nullable)
- `invoice_number`: `string` (Unique)
- `total_amount`: `decimal(15,2)`
- `discount`: `decimal(15,2)` (Default: 0.00)
- `tax`: `decimal(15,2)`
- `grand_total`: `decimal(15,2)`
- `payment_method`: `enum('Cash', 'Card', 'Mobile', 'Wallet')`
- `payment_status`: `enum('Paid', 'Partial', 'Due')`
- `sale_date`: `datetime`
- `is_synced`: `boolean` (Default: false)
- `created_at`, `updated_at`: `timestamps`

### **sale_items**

- `id`: `uuid` (PK)
- `sale_id`: `uuid` (FK -> sales.id)
- `product_id`: `uuid` (FK -> products.id)
- `batch_id`: `uuid` (FK -> inventory_batches.id)
- `unit_id`: `uuid` (FK -> units.id)
- `quantity`: `decimal(10,2)` (Quantity in the selected unit)
- `base_quantity`: `integer` (Calculated quantity in smallest unit)
- `unit_price`: `decimal(15,2)`
- `total_price`: `decimal(15,2)`
- `created_at`: `timestamp`

---

## 6. Returns, Expenses & Transfers

### **returns**

- `id`: `uuid` (PK)
- `type`: `enum('Customer', 'Supplier')`
- `reference_id`: `uuid` (Sale_ID or Purchase_ID)
- `branch_id`: `uuid` (FK -> branches.id)
- `reason`: `text`
- `refund_amount`: `decimal(15,2)`
- `status`: `enum('Pending', 'Approved', 'Rejected')`
- `created_at`, `updated_at`: `timestamps`

### **return_items**

- `id`: `uuid` (PK)
- `return_id`: `uuid` (FK -> returns.id)
- `product_id`: `uuid` (FK -> products.id)
- `quantity`: `integer` (In smallest unit)
- `refund_price`: `decimal(15,2)`
- `created_at`: `timestamp`

### **expenses**

- `id`: `uuid` (PK)
- `branch_id`: `uuid` (FK -> branches.id)
- `title`: `string`
- `amount`: `decimal(15,2)`
- `expense_date`: `date`
- `notes`: `text` (Nullable)
- `created_at`, `updated_at`: `timestamps`

### **stock_transfers**

- `id`: `uuid` (PK)
- `from_branch_id`: `uuid` (FK -> branches.id)
- `to_branch_id`: `uuid` (FK -> branches.id)
- `transfer_date`: `date`
- `status`: `enum('Pending', 'Completed', 'Cancelled')`
- `created_at`, `updated_at`: `timestamps`

### **stock_transfer_items** (Added for detail)

- `id`: `uuid` (PK)
- `transfer_id`: `uuid` (FK -> stock_transfers.id)
- `product_id`: `uuid` (FK -> products.id)
- `quantity`: `integer` (In smallest unit)

---

## 7. Logs & Settings

### **prescriptions**

- `id`: `uuid` (PK)
- `customer_id`: `uuid` (FK -> customers.id)
- `sale_id`: `uuid` (FK -> sales.id, Nullable)
- `doctor_name`: `string` (Nullable)
- `image_path`: `string` (Nullable)
- `notes`: `text` (Nullable)
- `created_at`: `timestamp`

### **activity_logs**

- `id`: `uuid` (PK)
- `user_id`: `uuid` (FK -> users.id)
- `action`: `string`
- `description`: `text`
- `created_at`: `timestamp`

### **settings**

- `id`: `uuid` (PK)
- `key`: `string` (Unique)
- `value`: `text`
- `updated_at`: `timestamp`
