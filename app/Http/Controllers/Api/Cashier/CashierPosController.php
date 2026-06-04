<?php

namespace App\Http\Controllers\Api\Cashier;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashierPosController extends Controller
{
    /**
     * Search products for POS (barcode, name, generic name).
     * Requires: process_sale permission
     */
    /**
     * Search or list products for POS.
     * - If "query" parameter is provided → search by name/barcode/generic
     * - If "query" is empty → return all active products (useful for initial load on handheld POS)
     *
     * Requires: process_sale permission
     */
    public function searchProducts(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branchId = $request->user()->currentBranchId();
        if (!$branchId) {
            return response()->json(['message' => 'No branch assigned'], 422);
        }

        $query = trim((string) $request->query('query', ''));

        $productsQuery = Product::query()->where('status', 'Active');

        if ($query !== '') {
            $productsQuery->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('barcode', 'like', "%{$query}%")
                    ->orWhere('generic_name', 'like', "%{$query}%");
            });
        }

        $products = $productsQuery
            ->leftJoin('inventories', function ($join) use ($branchId) {
                $join->on('inventories.product_id', '=', 'products.id')
                    ->where('inventories.branch_id', '=', $branchId);
            })
            ->select([
                'products.id',
                'products.name',
                'products.generic_name',
                'products.barcode',
                'products.image_path',
                'products.tax_method',
                'inventories.quantity as stock_quantity',
            ])
            ->with([
                'taxes:id,name,rate',
                'product_units' => function ($q) {
                    $q->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'is_base_unit')
                        ->with(['unit:id,name,short_name']);
                },
            ])
            ->orderBy('products.name')
            ->limit($query === '' ? 200 : 50) // Return more when loading all products
            ->get()
            ->map(function ($product) {
                $taxRate = $product->taxes->sum('rate');
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'generic_name' => $product->generic_name,
                    'barcode' => $product->barcode,
                    'image_url' => $product->image_path ? url('storage/' . $product->image_path) : null,
                    'stock_quantity' => $product->stock_quantity ?? 0,
                    'tax_method' => $product->tax_method,
                    'tax_rate' => $taxRate,
                    'units' => $product->product_units->map(function ($pu) {
                        return [
                            'id' => $pu->id,
                            'unit_id' => $pu->unit_id,
                            'unit_name' => $pu->unit->name ?? '',
                            'unit_short_name' => $pu->unit->short_name ?? '',
                            'conversion_factor' => $pu->conversion_factor,
                            'selling_price' => $pu->selling_price,
                            'is_base_unit' => $pu->is_base_unit,
                        ];
                    }),
                ];
            });

        return response()->json($products);
    }

    /**
     * List or search customers.
     * Requires: process_sale permission
     */
    /**
     * List / Search customers.
     * Requires: process_sale permission
     */
    public function customers(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Customer::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $query->select('id', 'name', 'phone', 'address', 'credit_limit', 'balance')
            ->orderBy('name')
            ->limit(50)
            ->get();

        return response()->json($customers);
    }

    /**
     * Get a single customer by ID.
     * Requires: process_sale permission
     */
    public function showCustomer(Request $request, Customer $customer)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($customer);
    }

    /**
     * Create a new customer.
     * Requires: process_sale permission
     */
    public function storeCustomer(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string|max:500',
            'credit_limit' => 'nullable|numeric|min:0',
        ]);

        $customer = Customer::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'address' => $validated['address'] ?? null,
            'credit_limit' => $validated['credit_limit'] ?? 0,
            'balance' => 0,
        ]);

        return response()->json([
            'message' => 'Customer created successfully.',
            'customer' => $customer,
        ], 201);
    }

    /**
     * Update an existing customer.
     * Requires: process_sale permission
     */
    public function updateCustomer(Request $request, Customer $customer)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string|max:500',
            'credit_limit' => 'nullable|numeric|min:0',
        ]);

        $customer->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'address' => $validated['address'] ?? null,
            'credit_limit' => $validated['credit_limit'] ?? $customer->credit_limit,
        ]);

        return response()->json([
            'message' => 'Customer updated successfully.',
            'customer' => $customer,
        ]);
    }

    /**
     * Delete a customer.
     * Requires: process_sale permission
     */
    public function destroyCustomer(Request $request, Customer $customer)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Optional: Prevent deletion if customer has sales
        if ($customer->sales()->exists()) {
            return response()->json([
                'message' => 'Cannot delete customer because they have existing sales.',
            ], 422);
        }

        $customer->delete();

        return response()->json([
            'message' => 'Customer deleted successfully.',
        ]);
    }

    /**
     * Create a new sale (checkout).
     * Requires: process_sale permission
     */
    public function checkout(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'payment_method' => 'required|in:Cash,Card,Mobile,Wallet',
            'payment_status' => 'required|in:Paid,Partial,Due',
            'amount_received' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_unit_id' => 'required|exists:product_units,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0',
        ]);

        $branchId = $request->user()->currentBranchId();
        if (!$branchId) {
            return response()->json(['message' => 'No branch assigned'], 422);
        }

        $userId = $request->user()->id;
        $activeSession = CashSession::where('branch_id', $branchId)
            ->where('user_id', $userId)
            ->whereNull('closed_at')
            ->first();

        if (!$activeSession) {
            return response()->json(['message' => 'No active cash session. Please open a session first.'], 422);
        }

        $result = DB::transaction(function () use ($validated, $branchId, $userId, $activeSession) {
            $items = collect($validated['items']);
            $subTotal = 0;
            $totalTax = 0;

            foreach ($items as $item) {
                $lineTotal = $item['quantity'] * $item['unit_price'];
                $taxRate = $item['tax_rate'] ?? 0;
                $taxAmount = $lineTotal * ($taxRate / 100);
                $subTotal += $lineTotal;
                $totalTax += $taxAmount;
            }

            $discount = $validated['discount'] ?? 0;
            $grandTotal = max($subTotal + $totalTax - $discount, 0);
            $amountReceived = $validated['amount_received'];
            $changeDue = max($amountReceived - $grandTotal, 0);

            $sale = Sale::create([
                'branch_id' => $branchId,
                'user_id' => $userId,
                'customer_id' => $validated['customer_id'] ?? null,
                'cash_session_id' => $activeSession->id,
                'invoice_number' => 'S' . date('YmdHis') . rand(10, 99),
                'total_amount' => $subTotal,
                'discount' => $discount,
                'tax' => $totalTax,
                'grand_total' => $grandTotal,
                'amount_received' => $amountReceived,
                'change_due' => $changeDue,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $validated['payment_status'],
                'sale_date' => now(),
            ]);

            foreach ($items as $item) {
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'product_unit_id' => $item['product_unit_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'tax_rate' => $item['tax_rate'] ?? 0,
                    'tax_amount' => ($item['quantity'] * $item['unit_price']) * (($item['tax_rate'] ?? 0) / 100),
                    'total' => $item['quantity'] * $item['unit_price'],
                ]);
            }

            return $sale->load(['items.product:id,name', 'items.productUnit.unit:id,name,short_name', 'customer:id,name,phone']);
        });

        return response()->json([
            'message' => 'Sale completed successfully.',
            'sale' => $result,
        ], 201);
    }

    /**
     * Get active cash session for the current user.
     */
    public function activeSession(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branchId = $request->user()->currentBranchId();
        if (!$branchId) {
            return response()->json(['message' => 'No branch assigned'], 422);
        }

        $session = CashSession::where('branch_id', $branchId)
            ->where('user_id', $request->user()->id)
            ->whereNull('closed_at')
            ->first();

        if (!$session) {
            return response()->json(null);
        }

        return response()->json($this->buildSessionPayload($session));
    }

    /**
     * Open a new cash session.
     */
    public function openSession(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'opening_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $branchId = $request->user()->currentBranchId();
        if (!$branchId) {
            return response()->json(['message' => 'No branch assigned'], 422);
        }

        $existing = CashSession::where('branch_id', $branchId)
            ->where('user_id', $request->user()->id)
            ->whereNull('closed_at')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'You already have an active session.'], 422);
        }

        $session = CashSession::create([
            'branch_id' => $branchId,
            'user_id' => $request->user()->id,
            'opened_at' => now(),
            'opening_amount' => $validated['opening_balance'], // map API field to DB column
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json($session, 201);
    }

    /**
     * Close the current cash session.
     */
    public function closeSession(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'closing_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $branchId = $request->user()->currentBranchId();
        $session = CashSession::where('branch_id', $branchId)
            ->where('user_id', $request->user()->id)
            ->whereNull('closed_at')
            ->first();

        if (!$session) {
            return response()->json(['message' => 'No active session found.'], 404);
        }

        $session->update([
            'closed_at' => now(),
            'closing_balance' => $validated['closing_balance'],
            'notes' => $validated['notes'] ?? $session->notes,
        ]);

        return response()->json(['message' => 'Session closed successfully.', 'session' => $session]);
    }

    private function buildSessionPayload(CashSession $session)
    {
        $totalSales = Sale::where('cash_session_id', $session->id)->sum('grand_total');
        $totalCash = Sale::where('cash_session_id', $session->id)
            ->where('payment_method', 'Cash')
            ->sum('amount_received');

        return [
            'id' => $session->id,
            'opened_at' => $session->opened_at,
            'opening_balance' => $session->opening_amount, // map DB column back to API field
            'total_sales' => $totalSales,
            'total_cash' => $totalCash,
            'expected_closing' => $session->opening_amount + $totalCash,
        ];
    }

    /**
     * Get receipt printing settings for the handheld POS app.
     * Requires: process_sale permission
     */
    public function getReceiptSettings(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $settings = [
            'pharmacy_name'       => Setting::get('invoice.pharmacy_name', config('app.name')),
            'receipt_header'      => Setting::get('invoice.receipt_header', ''),
            'receipt_footer'      => Setting::get('invoice.receipt_footer', ''),
            'receipt_width'       => (int) Setting::get('pos.receipt_width', '80'), // 58 or 80
            'currency_symbol'     => Setting::get('app.currency_symbol', '$'),
            'auto_print_receipt'  => Setting::get('pos.auto_print_receipt', '0') === '1',
            'silent_print'        => Setting::get('pos.silent_print', '0') === '1',
            'show_generic_name'   => Setting::get('label.show_generic', '0') === '1',
            'show_expiry'         => Setting::get('label.show_expiry', '1') === '1',
            'show_batch'          => Setting::get('label.show_batch', '0') === '1',
        ];

        return response()->json($settings);
    }
}