# Pharmacy POS API Documentation

Last updated: 2026-06-20

This document describes the implemented HTTP API in `routes/api.php`. All protected endpoints use Laravel Sanctum bearer tokens.

## Authentication

### POST `/api/login`

Public endpoint. Returns a Sanctum token.

Request:

```json
{
  "email": "cashier@example.com",
  "password": "password",
  "device_name": "Android POS"
}
```

Response:

```json
{
  "message": "Login successful",
  "token": "plain-text-sanctum-token",
  "user": {
    "id": 1,
    "name": "Cashier",
    "email": "cashier@example.com",
    "branch_id": 1,
    "active_branch_id": 1
  }
}
```

### GET `/api/user`

Requires `Authorization: Bearer <token>`.

Returns the current authenticated user: `id`, `name`, `email`, `branch_id`, `active_branch_id`.

### GET `/api/user/access`

Requires `Authorization: Bearer <token>`.

Returns the current authenticated user's roles, permissions, and branch access flags.

Response:

```json
{
  "user_id": "user-uuid",
  "roles": [
    {
      "id": "role-uuid",
      "name": "Cashier"
    }
  ],
  "role_names": ["Cashier"],
  "permissions": [
    {
      "id": "permission-uuid",
      "name": "Process Sale",
      "slug": "process_sale"
    }
  ],
  "permission_slugs": ["process_sale"],
  "access": {
    "can_access_all_branches": false,
    "current_branch_id": "branch-uuid",
    "branch_id": "assigned-branch-uuid",
    "active_branch_id": "active-branch-uuid"
  }
}
```

## Account API

All account endpoints require `Authorization: Bearer <token>`.

### GET `/api/account/profile`

Returns the authenticated user's profile plus assigned/current branch context.

Response:

```json
{
  "id": "user-uuid",
  "name": "Staff User",
  "email": "staff@example.com",
  "phone": "09123456789",
  "image_url": "http://localhost/storage/profile-images/avatar.jpg",
  "branch_id": "assigned-branch-uuid",
  "active_branch_id": "active-branch-uuid",
  "current_branch_id": "active-or-assigned-branch-uuid",
  "assigned_branch": {
    "id": "assigned-branch-uuid",
    "name": "Main Branch",
    "address": "Yangon",
    "phone": "09123456789",
    "email": "main@example.com"
  },
  "active_branch": {
    "id": "active-branch-uuid",
    "name": "Downtown Branch",
    "address": "Yangon",
    "phone": "09999999999",
    "email": "downtown@example.com"
  }
}
```

### PUT `/api/account/profile`

Updates profile details. Send as `multipart/form-data` when uploading `image`.

Request:

```json
{
  "name": "Staff User",
  "email": "staff@example.com",
  "phone": "09123456789",
  "image": "optional image file"
}
```

### POST `/api/account/password`

Updates account security password.

Request:

```json
{
  "current_password": "old-password",
  "password": "new-password",
  "password_confirmation": "new-password"
}
```

### GET `/api/account/branches`

Returns the assigned branch, active branch, effective `current_branch_id`, and all branches the user can access.

### POST `/api/account/branches/switch`

Sets the authenticated user's active branch after access checks.

Request:

```json
{
  "branch_id": "branch-uuid"
}
```

## Settings API

All settings endpoints require `Authorization: Bearer <token>`.

### GET `/api/settings/invoice`

Returns invoice, receipt, currency, and default tax settings.

Response:

```json
{
  "pharmacy_name": "Pharmacy POS",
  "logo_path": "settings/logo.png",
  "logo_url": "http://localhost/storage/settings/logo.png",
  "default_tax_id": "tax-uuid",
  "receipt_header": "",
  "receipt_footer": "",
  "invoice_prefix": "S",
  "enable_tax": true,
  "currency_code": "USD",
  "currency_symbol": "$",
  "date_format": "Y-m-d",
  "time_format": "H:i:s",
  "receipt_width": 80,
  "auto_print_receipt": false,
  "silent_print": false,
  "silent_printer_name": "",
  "default_tax": {
    "id": "tax-uuid",
    "name": "Commercial Tax",
    "rate": "5.00"
  }
}
```

### POST `/api/logout`

Requires `Authorization: Bearer <token>`.

Revokes the current Sanctum token.

## Cashier API

Base path: `/api/cashier`

All cashier endpoints require:

- Sanctum bearer token.
- `process_sale` permission.
- A current branch for sale and stock-sensitive endpoints.

### GET `/api/cashier/products`

Lists active products for POS. Optional `query` searches by product name, barcode, or generic name.

Query parameters:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `query` | string | No | Empty query returns up to 200 active products; non-empty search returns up to 50. |

Important pricing fields:

- `discount_percentage` is the product-level sale discount rate.
- Each unit includes `selling_price` and `wholesale_price`.
- If wholesale price is missing, API falls back to selling price.

Response item shape:

```json
{
  "id": 1,
  "name": "Paracetamol",
  "generic_name": "Acetaminophen",
  "barcode": "885000000001",
  "image_url": "http://localhost/storage/products/paracetamol.jpg",
  "stock_quantity": 120,
  "tax_method": "Exclusive",
  "discount_percentage": 5,
  "tax_rate": 2,
  "units": [
    {
      "id": 10,
      "unit_id": 1,
      "unit_name": "Tablet",
      "unit_short_name": "tab",
      "conversion_factor": 1,
      "selling_price": "100.00",
      "wholesale_price": "90.00",
      "is_base_unit": true
    }
  ]
}
```

### POST `/api/cashier/sales`

Creates a POS sale and deducts stock from inventory batches using FEFO order.

Current discount behavior:

- Do not send a sale-wide discount. The `discount` request field is not accepted.
- The API uses each product's `discount_percentage` from the database.
- `sales.discount` stores the total product discount amount.
- `sale_items.discount_percentage` and `sale_items.discount_amount` store the product discount details per line.

Current wholesale behavior:

- Each item may send `price_type` as `retail` or `wholesale`.
- Retail uses `product_units.selling_price`.
- Wholesale uses `product_units.wholesale_price`, falling back to `selling_price` if empty.
- Client-sent `unit_price` is validated for compatibility but server pricing is authoritative.

Current FOC behavior:

- Each item may send `foc_quantity` and `foc_product_unit_id`.
- `foc_product_unit_id` is a `product_units.id`, not a `units.id`.
- If `foc_product_unit_id` is omitted, it defaults to the paid `product_unit_id`.
- FOC quantity deducts stock but does not add revenue, tax, or product discount.
- `sale_items.base_quantity` stores paid stock deduction and `sale_items.foc_base_quantity` stores free stock deduction.

Request:

```json
{
  "customer_id": 12,
  "payment_method": "Cash",
  "payment_status": "Paid",
  "amount_received": 10000,
  "items": [
    {
      "product_id": 1,
      "product_unit_id": 10,
      "quantity": 2,
      "foc_quantity": 1,
      "foc_product_unit_id": 10,
      "unit_price": 100,
      "price_type": "retail",
      "tax_rate": 2
    }
  ]
}
```

Validation:

| Field | Rule |
| --- | --- |
| `customer_id` | nullable existing customer ID |
| `payment_method` | required, one of `Cash`, `Card`, `Mobile`, `Wallet` |
| `payment_status` | required, one of `Paid`, `Partial`, `Due` |
| `amount_received` | required numeric min 0 |
| `items` | required array min 1 |
| `items.*.product_id` | required existing product ID |
| `items.*.product_unit_id` | required existing product unit ID |
| `items.*.quantity` | required numeric min 0.01 |
| `items.*.foc_quantity` | nullable numeric min 0 |
| `items.*.foc_product_unit_id` | nullable existing product unit ID; defaults to `product_unit_id` |
| `items.*.unit_price` | required numeric min 0 |
| `items.*.price_type` | nullable, `retail` or `wholesale`; defaults to `retail` |
| `items.*.tax_rate` | nullable numeric min 0 |

Response:

```json
{
  "message": "Sale completed successfully.",
  "sale": {
    "id": 101,
    "invoice_number": "S2026061909580012",
    "total_amount": "190.00",
    "discount": "10.00",
    "tax": "3.80",
    "grand_total": "193.80",
    "amount_received": "10000.00",
    "change_due": "9806.20",
    "payment_method": "Cash",
    "payment_status": "Paid",
    "items": [
      {
        "product_id": 1,
        "unit_id": 1,
        "quantity": "2.00",
        "foc_quantity": "1.00",
        "foc_unit_id": 1,
        "unit_price": "95.00",
        "original_unit_price": "100.00",
        "price_type": "retail",
        "discount_percentage": "5.00",
        "discount_amount": "10.00",
        "total_price": "190.00"
      }
    ]
  }
}
```

Possible errors:

- `403` if the user lacks `process_sale`.
- `422` if no branch is assigned.
- `422` if no active cash session exists.
- `422` if selected product unit is invalid.
- `422` if stock is insufficient.

### GET `/api/cashier/sales`

Returns paginated sale history for the cashier's current branch.

Query parameters:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `search` | string | No | Searches invoice number, customer name, or customer phone. |
| `payment_method` | string | No | One of `Cash`, `Card`, `Mobile`, `Wallet`. |
| `payment_status` | string | No | One of `Paid`, `Partial`, `Due`. |
| `from_date` | date | No | Filters `sale_date` on or after this date. |
| `to_date` | date | No | Filters `sale_date` on or before this date. |
| `per_page` | integer | No | 1-100; defaults to 15. |

Response item shape:

```json
{
  "id": "sale-uuid",
  "invoice_number": "S2026061909580012",
  "sale_date": "2026-06-19T09:58:00+06:30",
  "total_amount": "190.00",
  "discount": "10.00",
  "tax": "3.80",
  "grand_total": "193.80",
  "amount_received": "10000.00",
  "change_due": "9806.20",
  "payment_method": "Cash",
  "payment_status": "Paid",
  "items_count": 1,
  "customer": {
    "id": "customer-uuid",
    "name": "Walk-in Customer",
    "phone": "09123456789"
  },
  "branch": {
    "id": "branch-uuid",
    "name": "Main Branch"
  },
  "cashier": {
    "id": "user-uuid",
    "name": "Cashier"
  }
}
```

### GET `/api/cashier/sales/{sale}`

Returns one sale from the cashier's current branch with customer, branch, cashier, cash session, and item details.

Response:

```json
{
  "id": "sale-uuid",
  "invoice_number": "S2026061909580012",
  "sale_date": "2026-06-19T09:58:00+06:30",
  "total_amount": "190.00",
  "discount": "10.00",
  "tax": "3.80",
  "grand_total": "193.80",
  "amount_received": "10000.00",
  "change_due": "9806.20",
  "payment_method": "Cash",
  "payment_status": "Paid",
  "items_count": 1,
  "customer": {
    "id": "customer-uuid",
    "name": "Walk-in Customer",
    "phone": "09123456789",
    "address": "Yangon"
  },
  "branch": {
    "id": "branch-uuid",
    "name": "Main Branch",
    "address": "Yangon",
    "phone": "09123456789"
  },
  "cashier": {
    "id": "user-uuid",
    "name": "Cashier"
  },
  "cash_session": {
    "id": "session-uuid",
    "opened_at": "2026-06-19T03:00:00+06:30",
    "closed_at": null
  },
  "items": [
    {
      "id": "sale-item-uuid",
      "product_id": "product-uuid",
      "product": {
        "id": "product-uuid",
        "name": "Paracetamol",
        "generic_name": "Acetaminophen",
        "barcode": "885000000001"
      },
      "batch_id": "batch-uuid",
      "batch": {
        "id": "batch-uuid",
        "batch_number": "B-001",
        "expiry_date": "2027-06-19"
      },
      "unit_id": "unit-uuid",
      "unit": {
        "id": "unit-uuid",
        "name": "Tablet",
        "short_name": "tab"
      },
      "quantity": "2.00",
      "foc_quantity": "1.00",
      "foc_unit_id": "unit-uuid",
      "foc_unit": {
        "id": "unit-uuid",
        "name": "Tablet",
        "short_name": "tab"
      },
      "base_quantity": 2,
      "foc_base_quantity": 1,
      "unit_price": "95.00",
      "original_unit_price": "100.00",
      "price_type": "retail",
      "discount_percentage": "5.00",
      "discount_amount": "10.00",
      "total_price": "190.00"
    }
  ]
}
```

Possible errors:

- `403` if the user lacks `process_sale`.
- `404` if the sale does not belong to the current branch.
- `422` if no branch is assigned.

### Customer Endpoints

All require `process_sale`.

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/cashier/customers` | Optional `search` by name or phone; returns up to 50. |
| POST | `/api/cashier/customers` | Create customer. |
| GET | `/api/cashier/customers/{customer}` | Show customer. |
| PUT | `/api/cashier/customers/{customer}` | Update customer. |
| DELETE | `/api/cashier/customers/{customer}` | Delete customer if they have no sales. |

Create/update request:

```json
{
  "name": "Walk-in Credit Customer",
  "phone": "09123456789",
  "address": "Yangon",
  "credit_limit": 50000
}
```

### Cash Session Endpoints

All require `process_sale`.

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/cashier/sessions/active` | Returns current active session or `null`. |
| POST | `/api/cashier/sessions/open` | Opens a session for the current branch/user. |
| POST | `/api/cashier/sessions/{session}/close` | Closes the active session for current branch/user. |

Open request:

```json
{
  "opening_balance": 100000,
  "notes": "Morning shift"
}
```

Close request:

```json
{
  "closing_balance": 225000,
  "notes": "End of shift"
}
```

Active session response:

```json
{
  "id": 1,
  "opened_at": "2026-06-19T03:00:00.000000Z",
  "opening_balance": "100000.00",
  "total_sales": "125000.00",
  "total_cash": "125000.00",
  "expected_closing": 225000
}
```

### GET `/api/cashier/receipt-settings`

Returns receipt and POS printing settings used by handheld clients.

Response:

```json
{
  "pharmacy_name": "Pharmacy POS",
  "receipt_header": "",
  "receipt_footer": "",
  "receipt_width": 80,
  "currency_symbol": "$",
  "auto_print_receipt": false,
  "silent_print": false,
  "show_generic_name": false,
  "show_expiry": true,
  "show_batch": false
}
```

### Branch Endpoints

All require `process_sale`.

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/cashier/branches` | Lists branches accessible by the current user and marks current branch. |
| POST | `/api/cashier/branches/switch` | Sets `active_branch_id` after access check. |

Switch request:

```json
{
  "branch_id": 2
}
```

## Staff Purchase API

Base path: `/api/staff`

All staff endpoints require:

- Sanctum bearer token.
- `manage_inventory` permission.

### Product CRUD Endpoints

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/staff/products/lookups` | Returns categories, active taxes, units, and default tax ID for product forms. |
| GET | `/api/staff/products` | Lists products with units and taxes. Defaults to active products. |
| POST | `/api/staff/products` | Creates a product with taxes and product units. |
| GET | `/api/staff/products/{product}` | Shows one product. |
| PUT/PATCH | `/api/staff/products/{product}` | Updates product details, taxes, and units. |
| DELETE | `/api/staff/products/{product}` | Soft-deletes product if it has no inventory batches. |

List query parameters:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `search` | string | No | Searches name, generic name, brand name, or barcode. |
| `category_id` | UUID | No | Filters by category. |
| `status` | string | No | `Active`, `Inactive`, or `all`; defaults to `Active`. |
| `per_page` | integer | No | 1-100; defaults to 50. |

Create/update request:

```json
{
  "category_id": "category-uuid",
  "tax_id": "tax-uuid",
  "tax_ids": ["tax-uuid"],
  "name": "Paracetamol",
  "generic_name": "Acetaminophen",
  "brand_name": "Paramacy",
  "manufacturer": "ABC Pharma",
  "strength": "500mg",
  "barcode": "885000000001",
  "description": "Pain reliever",
  "min_stock_level": 20,
  "discount_percentage": 5,
  "tax_method": "Exclusive",
  "status": "Active",
  "image": "optional image file",
  "product_units": [
    {
      "unit_id": "unit-uuid",
      "conversion_factor": 1,
      "selling_price": 100,
      "wholesale_price": 90,
      "is_base_unit": true
    }
  ]
}
```

Use `multipart/form-data` when uploading `image`; otherwise JSON is accepted.

Product response shape:

```json
{
  "id": "product-uuid",
  "category_id": "category-uuid",
  "category": {
    "id": "category-uuid",
    "name": "Pain Relief"
  },
  "tax_id": "tax-uuid",
  "tax_ids": ["tax-uuid"],
  "taxes": [
    {
      "id": "tax-uuid",
      "name": "Commercial Tax",
      "rate": "5.00"
    }
  ],
  "name": "Paracetamol",
  "generic_name": "Acetaminophen",
  "brand_name": "Paramacy",
  "manufacturer": "ABC Pharma",
  "strength": "500mg",
  "barcode": "885000000001",
  "description": "Pain reliever",
  "min_stock_level": 20,
  "discount_percentage": 5,
  "tax_method": "Exclusive",
  "status": "Active",
  "image_url": "http://localhost/storage/product-images/paracetamol.jpg",
  "units": [
    {
      "id": "product-unit-uuid",
      "unit_id": "unit-uuid",
      "unit_name": "Tablet",
      "unit_short_name": "tab",
      "conversion_factor": 1,
      "selling_price": "100.00",
      "wholesale_price": "90.00",
      "is_base_unit": true
    }
  ]
}
```

### GET `/api/staff/inventory/stock`

Returns stock for a given branch. Use `include_batches=1` to include non-empty batch details.

Query parameters:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `branch_id` | UUID | Yes | Branch to inspect. |
| `search` | string | No | Searches product name, generic name, or barcode. |
| `category_id` | UUID | No | Filters by category. |
| `product_status` | string | No | `Active`, `Inactive`, or `all`; defaults to `Active`. |
| `stock_status` | string | No | `In Stock`, `Low Stock`, or `Out of Stock`. |
| `include_batches` | boolean | No | Include batch numbers, expiry dates, and prices. |
| `per_page` | integer | No | 1-100; defaults to 50. |

Response:

```json
{
  "branch": {
    "id": "branch-uuid",
    "name": "Main Branch",
    "address": "Yangon",
    "phone": "09123456789"
  },
  "stock": {
    "data": [
      {
        "id": "product-uuid",
        "name": "Paracetamol",
        "generic_name": "Acetaminophen",
        "barcode": "885000000001",
        "category": {
          "id": "category-uuid",
          "name": "Pain Relief"
        },
        "min_stock_level": 20,
        "current_stock": 120,
        "product_status": "Active",
        "stock_status": "In Stock",
        "batches": [
          {
            "id": "batch-uuid",
            "batch_number": "B-001",
            "expiry_date": "2027-06-19",
            "quantity": 120,
            "purchase_price": "500.00",
            "selling_price": "700.00"
          }
        ]
      }
    ]
  }
}
```

### GET `/api/staff/inventory/products/{product}/batches`

Returns one product's active inventory batches grouped by branch. Use `branch_id` to limit the result to one branch.

Query parameters:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `branch_id` | UUID | No | Filters batch groups to one branch. |

Response:

```json
{
  "product": {
    "id": "product-uuid",
    "name": "Paracetamol",
    "generic_name": "Acetaminophen",
    "barcode": "885000000001",
    "category": {
      "id": "category-uuid",
      "name": "Pain Relief"
    },
    "min_stock_level": 20,
    "status": "Active"
  },
  "summary": {
    "batch_quantity": 120,
    "aggregate_quantity": 120,
    "quantity_difference": 0,
    "stock_status": "In Stock"
  },
  "branch_groups": [
    {
      "branch": {
        "id": "branch-uuid",
        "name": "Main Branch",
        "address": "Yangon",
        "phone": "09123456789"
      },
      "total_quantity": 120,
      "batches": [
        {
          "id": "batch-uuid",
          "batch_number": "B-001",
          "expiry_date": "2027-06-19",
          "quantity": 120,
          "purchase_price": "500.00",
          "selling_price": "700.00"
        }
      ]
    }
  ]
}
```

### GET `/api/staff/suppliers`

Returns suppliers with credit fields. `balance` is the outstanding supplier balance managed by unpaid purchase dues.

### GET `/api/staff/suppliers/{supplier}/statement`

Returns one supplier's purchase statement, outstanding purchase list, and payment history.

Response:

```json
{
  "supplier": {
    "id": "supplier-uuid",
    "name": "ABC Supplier",
    "phone": "09123456789",
    "email": "abc@example.com",
    "credit_limit": "500000.00",
    "balance": "125000.00",
    "purchases_count": 3
  },
  "summary": {
    "total_purchases": 300000,
    "total_due": 125000,
    "total_payments": 175000,
    "outstanding_balance": 125000
  },
  "purchases": [],
  "due_purchases": [],
  "payments": []
}
```

### GET `/api/staff/supplier-payments`

Returns paginated supplier payment history.

Query parameters:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `supplier_id` | UUID | No | Filters by supplier. |
| `purchase_id` | UUID | No | Filters by purchase. |
| `payment_method` | string | No | One of `Cash`, `Card`, `Mobile`, `Wallet`. |
| `from_date` | date | No | Filters `payment_date` on or after this date. |
| `to_date` | date | No | Filters `payment_date` on or before this date. |
| `per_page` | integer | No | 1-100; defaults to 15. |

### POST `/api/staff/supplier-payments`

Records a supplier payment and reduces supplier outstanding balance plus purchase due amounts.

Behavior:

- If `purchase_id` is provided, the payment is applied only to that purchase.
- If `purchase_id` is omitted, the payment is applied to the supplier's oldest due purchases first.
- A single payment can create multiple payment rows when it is auto-applied across multiple purchases.
- Purchase `paid_amount`, `due_amount`, and `payment_status` are updated.
- Supplier `balance` is reduced by the applied amount.

Request:

```json
{
  "supplier_id": "supplier-uuid",
  "purchase_id": "optional-purchase-uuid",
  "branch_id": "optional-branch-uuid",
  "payment_date": "2026-06-21",
  "amount": 50000,
  "payment_method": "Cash",
  "reference_number": "PAY-2026-0001",
  "notes": "Bank transfer confirmation"
}
```

Validation:

| Field | Rule |
| --- | --- |
| `supplier_id` | required existing supplier ID |
| `purchase_id` | nullable existing purchase ID |
| `branch_id` | nullable existing branch ID |
| `payment_date` | required date |
| `amount` | required numeric min 0.01 |
| `payment_method` | required, one of `Cash`, `Card`, `Mobile`, `Wallet` |
| `reference_number` | nullable string max 255 |
| `notes` | nullable string max 1000 |

Possible errors:

- `422` if no outstanding purchase due exists for the supplier.
- `422` if `amount` exceeds outstanding purchase due.
- `422` if `amount` exceeds supplier outstanding balance.

### GET `/api/staff/products`

Returns active products and units for purchase entry. This endpoint is now also the product list endpoint; use `status=all` to include inactive products.

Important pricing fields:

- Unit rows include `selling_price` and `wholesale_price`.
- `wholesale_price` falls back to `selling_price` if empty.

### GET `/api/staff/branches`

Returns branches available for purchase assignment.

### GET `/api/staff/purchases`

Returns paginated purchases with supplier, branch, and item count.

Query parameters:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `search` | string | No | Searches invoice number or supplier name. |

### GET `/api/staff/purchases/{purchase}`

Returns one purchase with supplier, branch, user, and item details.

### POST `/api/staff/purchases`

Creates a purchase, purchase items, inventory batches, and inventory totals.

Current FOC behavior:

- `items.*.foc_quantity` is optional and defaults to `0`.
- Supplier cost is calculated only from paid `quantity * unit_price`.
- Stock received is `quantity + foc_quantity`, converted to base units.
- `purchase_items.base_quantity` stores total received base quantity.
- `purchase_items.foc_quantity` and `purchase_items.foc_base_quantity` store the free quantity.
- Inventory batch quantity includes paid plus FOC stock.

Current wholesale behavior:

- `items.*.wholesale_price` is optional.
- When provided, it updates the matching `product_units.wholesale_price`.
- If omitted, it falls back to the submitted `selling_price`.

Current supplier balance behavior:

- Purchase creation increases supplier `balance` by the purchase `due_amount`.
- Later supplier payments should be recorded with `POST /api/staff/supplier-payments`.
- Supplier payments reduce supplier `balance` and purchase `due_amount`.

Request:

```json
{
  "supplier_id": 1,
  "branch_id": 1,
  "invoice_number": "PUR-2026-0001",
  "purchase_date": "2026-06-19",
  "payment_status": "Partial",
  "paid_amount": 50000,
  "notes": "Supplier bonus included",
  "items": [
    {
      "product_id": 1,
      "unit_id": 1,
      "batch_number": "B-001",
      "expiry_date": "2027-06-19",
      "quantity": 100,
      "foc_quantity": 10,
      "unit_price": 500,
      "selling_price": 700,
      "wholesale_price": 650
    }
  ]
}
```

Validation:

| Field | Rule |
| --- | --- |
| `supplier_id` | required existing supplier ID |
| `branch_id` | required existing branch ID |
| `invoice_number` | required string max 255, unique in purchases |
| `purchase_date` | required date |
| `payment_status` | required, one of `Paid`, `Partial`, `Due` |
| `paid_amount` | nullable numeric min 0 |
| `notes` | nullable string max 1000 |
| `items` | required array min 1 |
| `items.*.product_id` | required existing product ID |
| `items.*.unit_id` | required existing unit ID |
| `items.*.batch_number` | nullable string max 255 |
| `items.*.expiry_date` | required date after today |
| `items.*.quantity` | required integer min 1 |
| `items.*.foc_quantity` | nullable integer min 0 |
| `items.*.unit_price` | required numeric min 0.01 |
| `items.*.selling_price` | required numeric min 0.01 |
| `items.*.wholesale_price` | nullable numeric min 0.01 |

Response:

```json
{
  "message": "Purchase created successfully.",
  "purchase": {
    "id": 55,
    "invoice_number": "PUR-2026-0001",
    "total_amount": "50000.00",
    "paid_amount": "50000.00",
    "due_amount": "0.00",
    "payment_status": "Paid",
    "supplier": {
      "id": 1,
      "name": "ABC Supplier"
    },
    "branch": {
      "id": 1,
      "name": "Main Branch"
    },
    "items": [
      {
        "product_id": 1,
        "unit_id": 1,
        "quantity": 100,
        "foc_quantity": 10,
        "base_quantity": 110,
        "foc_base_quantity": 10,
        "unit_price": "500.00",
        "total_price": "50000.00"
      }
    ]
  }
}
```

Possible errors:

- `422` if `paid_amount` exceeds the purchase total.
- `422` if the purchase due amount would exceed the supplier credit limit.

## Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Created |
| `403` | Authenticated but missing permission or branch access |
| `404` | Resource not found |
| `422` | Validation error or business rule failure |

## Current API Notes

- No sale-wide/manual discount is accepted by POS APIs. Product `discount_percentage` is the only sale discount source.
- Cashier API sales accept POS FOC quantities through `foc_quantity` and `foc_product_unit_id`.
- Staff purchase API supports supplier FOC quantities and wholesale price updates.
- Offline/sync endpoints such as `/api/v1/health` and `/api/v1/sync/sales` are not implemented.
