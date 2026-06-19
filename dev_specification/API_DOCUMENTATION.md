# Pharmacy POS API Documentation

Last updated: 2026-06-19

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

### GET `/api/staff/suppliers`

Returns active suppliers with credit fields.

### GET `/api/staff/products`

Returns active products and units for purchase entry.

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
