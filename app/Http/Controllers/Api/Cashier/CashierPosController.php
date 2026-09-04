<?php

namespace App\Http\Controllers\Api\Cashier;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
                'products.discount_percentage',
                'inventories.quantity as stock_quantity',
            ])
            ->with([
                'taxes:id,name,rate',
                'product_units' => function ($q) {
                    $q->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'wholesale_price', 'is_base_unit', 'is_default_selling_unit')
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
                    'discount_percentage' => (float) ($product->discount_percentage ?? 0),
                    'tax_rate' => $taxRate,
                    'units' => $product->product_units->map(function ($pu) {
                        return [
                            'id' => $pu->id,
                            'unit_id' => $pu->unit_id,
                            'unit_name' => $pu->unit->name ?? '',
                            'unit_short_name' => $pu->unit->short_name ?? '',
                            'conversion_factor' => $pu->conversion_factor,
                            'selling_price' => $pu->selling_price,
                            'wholesale_price' => $pu->wholesale_price ?? $pu->selling_price,
                            'is_base_unit' => $pu->is_base_unit,
                            'is_default_selling_unit' => $pu->is_default_selling_unit,
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
     * List sale history for the current branch.
     * Requires: process_sale permission
     */
    public function sales(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'payment_method' => 'nullable|in:Cash,Card,Mobile,Wallet',
            'payment_status' => 'nullable|in:Paid,Partial,Due',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $branchId = $request->user()->currentBranchId();
        if (!$branchId) {
            return response()->json(['message' => 'No branch assigned'], 422);
        }

        $query = Sale::query()
            ->where('branch_id', $branchId)
            ->with(['customer:id,name,phone', 'user:id,name', 'saleStaff:id,name', 'branch:id,name'])
            ->withCount('items');

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        if (!empty($validated['payment_method'])) {
            $query->where('payment_method', $validated['payment_method']);
        }

        if (!empty($validated['payment_status'])) {
            $query->where('payment_status', $validated['payment_status']);
        }

        if (!empty($validated['from_date'])) {
            $query->whereDate('sale_date', '>=', $validated['from_date']);
        }

        if (!empty($validated['to_date'])) {
            $query->whereDate('sale_date', '<=', $validated['to_date']);
        }

        $sales = $query
            ->latest('sale_date')
            ->latest()
            ->paginate((int) ($validated['per_page'] ?? 15));

        $sales->getCollection()->transform(function ($sale) {
            return $this->formatSaleSummary($sale);
        });

        return response()->json($sales);
    }

    /**
     * Get one sale with item details for the current branch.
     * Requires: process_sale permission
     */
    public function showSale(Request $request, Sale $sale)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branchId = $request->user()->currentBranchId();
        if (!$branchId) {
            return response()->json(['message' => 'No branch assigned'], 422);
        }

        if ($sale->branch_id !== $branchId) {
            return response()->json(['message' => 'Sale not found'], 404);
        }

        $sale->load([
            'customer:id,name,phone,address',
            'branch:id,name,address,phone',
            'user:id,name',
            'saleStaff:id,name',
            'cashSession:id,opened_at,closed_at',
            'items' => function ($q) {
                $q->with([
                    'product:id,name,generic_name,barcode',
                    'unit:id,name,short_name',
                    'focUnit:id,name,short_name',
                    'batch:id,batch_number,expiry_date',
                ])->orderBy('created_at')->orderBy('id');
            },
        ]);

        return response()->json($this->formatSaleDetail($sale));
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
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_unit_id' => 'required|exists:product_units,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.foc_quantity' => 'nullable|numeric|min:0',
            'items.*.foc_product_unit_id' => 'nullable|exists:product_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.price_type' => 'nullable|in:retail,wholesale',
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
            $items = collect($validated['items'])->map(function ($item) {
                $item['quantity'] = (float) $item['quantity'];
                $item['foc_quantity'] = (float) ($item['foc_quantity'] ?? 0);
                $item['foc_product_unit_id'] = $item['foc_product_unit_id'] ?? $item['product_unit_id'];
                $item['price_type'] = $item['price_type'] ?? 'retail';
                return $item;
            });
            $productUnitIds = $items
                ->pluck('product_unit_id')
                ->merge($items->pluck('foc_product_unit_id'))
                ->filter()
                ->unique()
                ->values();
            $productIds = $items->pluck('product_id')->unique()->values();
            $products = Product::whereIn('id', $productIds)
                ->with(['taxes:id,rate', 'product_units' => function ($q) use ($productUnitIds) {
                    $q->whereIn('id', $productUnitIds)
                        ->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'wholesale_price', 'is_base_unit');
                }])
                ->get()
                ->keyBy('id');

            $lineComputations = [];
            $subTotal = 0.0;
            $totalTax = 0.0;
            $productDiscountTotal = 0.0;

            foreach ($items as $index => $item) {
                $product = $products->get($item['product_id']);
                $productUnit = $product?->product_units->firstWhere('id', $item['product_unit_id']);
                $focProductUnit = $product?->product_units->firstWhere('id', $item['foc_product_unit_id']);

                if (!$product || !$productUnit) {
                    throw ValidationException::withMessages([
                        "items.$index.product_unit_id" => 'Invalid product unit.',
                    ]);
                }

                if (!$focProductUnit) {
                    throw ValidationException::withMessages([
                        "items.$index.foc_product_unit_id" => 'Invalid FOC product unit.',
                    ]);
                }

                $conversionFactor = max((int) $productUnit->conversion_factor, 1);
                $focConversionFactor = max((int) $focProductUnit->conversion_factor, 1);
                $baseQuantity = (int) round($item['quantity'] * $conversionFactor);
                $focBaseQuantity = (int) round($item['foc_quantity'] * $focConversionFactor);
                $originalUnitPrice = $item['price_type'] === 'wholesale'
                    ? (float) ($productUnit->wholesale_price ?? $productUnit->selling_price)
                    : (float) $productUnit->selling_price;
                $discountPercentage = min(max((float) ($product->discount_percentage ?? 0), 0), 100);
                $lineGross = $item['quantity'] * $originalUnitPrice;
                $lineDiscount = $lineGross * ($discountPercentage / 100);
                $unitPrice = $item['quantity'] > 0 ? max(($lineGross - $lineDiscount) / $item['quantity'], 0) : 0;
                $lineNet = $item['quantity'] * $unitPrice;
                $taxRate = (float) $product->taxes->sum('rate');
                $taxAmount = $product->tax_method === 'Inclusive' && $taxRate > 0
                    ? $lineNet - ($lineNet / (1 + ($taxRate / 100)))
                    : $lineNet * ($taxRate / 100);

                $subTotal += $product->tax_method === 'Inclusive' && $taxRate > 0
                    ? $lineNet - $taxAmount
                    : $lineNet;
                $totalTax += $taxAmount;
                $productDiscountTotal += $lineDiscount;

                $lineComputations[] = [
                    'product_id' => $product->id,
                    'unit_id' => $productUnit->unit_id,
                    'foc_unit_id' => $focProductUnit->unit_id,
                    'base_quantity' => $baseQuantity,
                    'foc_base_quantity' => $focBaseQuantity,
                    'total_base_quantity' => $baseQuantity + $focBaseQuantity,
                    'quantity' => $item['quantity'],
                    'foc_quantity' => $item['foc_quantity'],
                    'conversion_factor' => $conversionFactor,
                    'foc_conversion_factor' => $focConversionFactor,
                    'unit_price' => $unitPrice,
                    'original_unit_price' => $originalUnitPrice,
                    'price_type' => $item['price_type'],
                    'discount_percentage' => $discountPercentage,
                    'discount_amount' => $lineDiscount,
                ];
            }

            $manualDiscount = 0.0;
            $saleDiscount = $productDiscountTotal;
            $grandTotal = max($subTotal + $totalTax, 0);
            $amountReceived = (float) $validated['amount_received'];
            $changeDue = max($amountReceived - $grandTotal, 0);
            $saleStaffId = $activeSession->user_id ?: $userId;

            $sale = Sale::create([
                'branch_id' => $branchId,
                'user_id' => $userId,
                'sale_staff_id' => $saleStaffId,
                'customer_id' => $validated['customer_id'] ?? null,
                'cash_session_id' => $activeSession->id,
                'invoice_number' => 'S' . date('YmdHis') . rand(10, 99),
                'total_amount' => $subTotal,
                'discount' => $saleDiscount,
                'tax' => $totalTax,
                'grand_total' => $grandTotal,
                'amount_received' => $amountReceived,
                'change_due' => $changeDue,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $validated['payment_status'],
                'sale_date' => now(),
            ]);

            foreach ($lineComputations as $line) {
                $paidBaseRemaining = (int) $line['base_quantity'];
                $focBaseRemaining = (int) $line['foc_base_quantity'];
                $remaining = (int) $line['total_base_quantity'];
                $batches = InventoryBatch::where('branch_id', $branchId)
                    ->where('product_id', $line['product_id'])
                    ->where('quantity', '>', 0)
                    ->whereDate('expiry_date', '>=', now()->toDateString())
                    ->orderBy('expiry_date')
                    ->lockForUpdate()
                    ->get();

                if ((int) $batches->sum('quantity') < $remaining) {
                    throw ValidationException::withMessages([
                        'items' => 'Insufficient stock for one or more items.',
                    ]);
                }

                foreach ($batches as $batch) {
                    if ($remaining <= 0) {
                        break;
                    }

                    $deduct = min($remaining, (int) $batch->quantity);
                    $batch->update(['quantity' => (int) $batch->quantity - $deduct]);

                    $paidBaseDeduct = min($deduct, $paidBaseRemaining);
                    $paidBaseRemaining -= $paidBaseDeduct;

                    $focBaseDeduct = $deduct - $paidBaseDeduct;
                    if ($focBaseDeduct > $focBaseRemaining) {
                        $focBaseDeduct = $focBaseRemaining;
                    }
                    $focBaseRemaining -= $focBaseDeduct;

                    $quantityInUnit = $paidBaseDeduct / (int) $line['conversion_factor'];
                    $focQuantityInUnit = $focBaseDeduct / (int) $line['foc_conversion_factor'];
                    $baseUnitCost = (float) $batch->purchase_price;
                    $costTotal = round(($paidBaseDeduct + $focBaseDeduct) * $baseUnitCost, 2);

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $line['product_id'],
                        'batch_id' => $batch->id,
                        'unit_id' => $line['unit_id'],
                        'quantity' => $quantityInUnit,
                        'foc_quantity' => $focQuantityInUnit,
                        'foc_unit_id' => $line['foc_unit_id'],
                        'base_quantity' => $paidBaseDeduct,
                        'foc_base_quantity' => $focBaseDeduct,
                        'base_unit_cost' => $baseUnitCost,
                        'cost_total' => $costTotal,
                        'cost_backfilled' => false,
                        'unit_price' => $line['unit_price'],
                        'price_type' => $line['price_type'],
                        'original_unit_price' => $line['original_unit_price'],
                        'discount_percentage' => $line['discount_percentage'],
                        'discount_amount' => $line['discount_amount'] * ($quantityInUnit / (float) $line['quantity']),
                        'total_price' => $quantityInUnit * (float) $line['unit_price'],
                        'created_at' => now(),
                    ]);

                    $remaining -= $deduct;
                }

                $inventory = Inventory::firstOrNew([
                    'branch_id' => $branchId,
                    'product_id' => $line['product_id'],
                ]);

                $inventory->quantity = max(($inventory->quantity ?? 0) - (int) $line['total_base_quantity'], 0);
                $inventory->save();
            }

            return $sale->load(['items.product:id,name', 'items.unit:id,name,short_name', 'items.focUnit:id,name,short_name', 'customer:id,name,phone', 'saleStaff:id,name']);
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

        $totals = $this->getSessionTotals($session);
        $expectedAmount = (float) $session->opening_amount + $totals['net_cash_sales'];
        $countedAmount = (float) $validated['closing_balance'];

        $session->update([
            'closed_at' => now(),
            'closed_by_user_id' => $request->user()->id,
            'cash_received_total' => $totals['cash_received_total'],
            'change_given_total' => $totals['change_given_total'],
            'net_cash_sales' => $totals['net_cash_sales'],
            'expected_amount' => $expectedAmount,
            'closing_counted_amount' => $countedAmount,
            'difference' => $countedAmount - $expectedAmount,
            'status' => 'closed',
            'notes' => $validated['notes'] ?? $session->notes,
        ]);

        return response()->json(['message' => 'Session closed successfully.', 'session' => $session]);
    }

    private function formatSaleSummary(Sale $sale): array
    {
        return [
            'id' => $sale->id,
            'invoice_number' => $sale->invoice_number,
            'sale_date' => $sale->sale_date?->toIso8601String(),
            'status' => $sale->status ?? 'Completed',
            'total_amount' => $sale->total_amount,
            'discount' => $sale->discount,
            'tax' => $sale->tax,
            'grand_total' => $sale->grand_total,
            'amount_received' => $sale->amount_received,
            'change_due' => $sale->change_due,
            'payment_method' => $sale->payment_method,
            'payment_status' => $sale->payment_status,
            'items_count' => (int) ($sale->items_count ?? 0),
            'customer' => $sale->customer ? [
                'id' => $sale->customer->id,
                'name' => $sale->customer->name,
                'phone' => $sale->customer->phone,
            ] : null,
            'branch' => $sale->branch ? [
                'id' => $sale->branch->id,
                'name' => $sale->branch->name,
            ] : null,
            'cashier' => $sale->user ? [
                'id' => $sale->user->id,
                'name' => $sale->user->name,
            ] : null,
            'sale_staff' => $sale->saleStaff ? [
                'id' => $sale->saleStaff->id,
                'name' => $sale->saleStaff->name,
            ] : null,
        ];
    }

    private function formatSaleDetail(Sale $sale): array
    {
        $summary = $this->formatSaleSummary($sale);

        $summary['customer'] = $sale->customer ? [
            'id' => $sale->customer->id,
            'name' => $sale->customer->name,
            'phone' => $sale->customer->phone,
            'address' => $sale->customer->address,
        ] : null;

        $summary['branch'] = $sale->branch ? [
            'id' => $sale->branch->id,
            'name' => $sale->branch->name,
            'address' => $sale->branch->address,
            'phone' => $sale->branch->phone,
        ] : null;

        $summary['cash_session'] = $sale->cashSession ? [
            'id' => $sale->cashSession->id,
            'opened_at' => $sale->cashSession->opened_at?->toIso8601String(),
            'closed_at' => $sale->cashSession->closed_at?->toIso8601String(),
        ] : null;

        $summary['items'] = $sale->items->map(function (SaleItem $item) {
            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product' => $item->product ? [
                    'id' => $item->product->id,
                    'name' => $item->product->name,
                    'generic_name' => $item->product->generic_name,
                    'barcode' => $item->product->barcode,
                ] : null,
                'batch_id' => $item->batch_id,
                'batch' => $item->batch ? [
                    'id' => $item->batch->id,
                    'batch_number' => $item->batch->batch_number,
                    'expiry_date' => $item->batch->expiry_date?->toDateString(),
                ] : null,
                'unit_id' => $item->unit_id,
                'unit' => $item->unit ? [
                    'id' => $item->unit->id,
                    'name' => $item->unit->name,
                    'short_name' => $item->unit->short_name,
                ] : null,
                'quantity' => $item->quantity,
                'foc_quantity' => $item->foc_quantity,
                'foc_unit_id' => $item->foc_unit_id,
                'foc_unit' => $item->focUnit ? [
                    'id' => $item->focUnit->id,
                    'name' => $item->focUnit->name,
                    'short_name' => $item->focUnit->short_name,
                ] : null,
                'base_quantity' => $item->base_quantity,
                'foc_base_quantity' => $item->foc_base_quantity,
                'unit_price' => $item->unit_price,
                'original_unit_price' => $item->original_unit_price,
                'price_type' => $item->price_type,
                'discount_percentage' => $item->discount_percentage,
                'discount_amount' => $item->discount_amount,
                'total_price' => $item->total_price,
            ];
        })->values();

        return $summary;
    }

    private function getSessionTotals(CashSession $session): array
    {
        $sales = Sale::query()
            ->where('cash_session_id', $session->id)
            ->where('status', '!=', 'Voided');
        $cash = (clone $sales)
            ->where('payment_method', 'Cash')
            ->selectRaw('COALESCE(SUM(amount_received), 0) as received')
            ->selectRaw('COALESCE(SUM(change_due), 0) as change_given')
            ->first();
        $paymentTotals = (clone $sales)
            ->selectRaw('payment_method, COALESCE(SUM(grand_total), 0) as total')
            ->groupBy('payment_method')
            ->pluck('total', 'payment_method');
        $cashReceived = (float) ($cash?->received ?? 0);
        $changeGiven = (float) ($cash?->change_given ?? 0);

        return [
            'cash_received_total' => $cashReceived,
            'change_given_total' => $changeGiven,
            'net_cash_sales' => $cashReceived - $changeGiven,
            'cash_sales_total' => (float) ($paymentTotals['Cash'] ?? 0),
            'card_sales_total' => (float) ($paymentTotals['Card'] ?? 0),
            'mobile_sales_total' => (float) ($paymentTotals['Mobile'] ?? 0),
            'wallet_sales_total' => (float) ($paymentTotals['Wallet'] ?? 0),
            'total_sales' => (float) $paymentTotals->sum(),
            'sale_count' => (clone $sales)->count(),
        ];
    }

    private function buildSessionPayload(CashSession $session)
    {
        $totals = $this->getSessionTotals($session);
        $expectedAmount = (float) $session->opening_amount + $totals['net_cash_sales'];

        return [
            'id' => $session->id,
            'status' => $session->status,
            'opened_at' => $session->opened_at,
            'closed_at' => $session->closed_at,
            'opening_balance' => $session->opening_amount, // map DB column back to API field
            'cash_received_total' => $totals['cash_received_total'],
            'change_given_total' => $totals['change_given_total'],
            'net_cash_sales' => $totals['net_cash_sales'],
            'cash_sales_total' => $totals['cash_sales_total'],
            'card_sales_total' => $totals['card_sales_total'],
            'mobile_sales_total' => $totals['mobile_sales_total'],
            'wallet_sales_total' => $totals['wallet_sales_total'],
            'total_cash' => $totals['net_cash_sales'],
            'total_sales' => $totals['total_sales'],
            'sale_count' => $totals['sale_count'],
            'expected_closing' => $expectedAmount,
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

        $branchId = $request->user()->currentBranchId();
        $branchSetting = fn (string $suffix, string $legacy, string $default) => $branchId
            ? Setting::get(Setting::branchKey($branchId, $suffix), Setting::get($legacy, $default))
            : Setting::get($legacy, $default);

        $settings = [
            'pharmacy_name'       => Setting::get('invoice.pharmacy_name', config('app.name')),
            'receipt_header'      => Setting::get('invoice.receipt_header', ''),
            'receipt_footer'      => Setting::get('invoice.receipt_footer', ''),
            'receipt_width'       => (int) $branchSetting('pos.receipt_width', 'pos.receipt_width', '80'),
            'currency_symbol'     => Setting::get('app.currency_symbol', '$'),
            'auto_print_receipt'  => $branchSetting('pos.auto_print_receipt', 'pos.auto_print_receipt', '0') === '1',
            'silent_print'        => $branchSetting('pos.silent_print', 'pos.silent_print', '0') === '1',
            'show_generic_name'   => Setting::get('label.show_generic', '0') === '1',
            'show_expiry'         => Setting::get('label.show_expiry', '1') === '1',
            'show_batch'          => Setting::get('label.show_batch', '0') === '1',
        ];

        return response()->json($settings);
    }

    /**
     * Get list of branches the current user can access.
     * Also indicates which branch is currently active.
     */
    public function getBranches(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = $request->user();
        $currentBranchId = $user->currentBranchId();

        // Get primary branch
        $branches = collect();

        if ($user->branch) {
            $branches->push($user->branch);
        }

        // Get additional branches
        $additionalBranches = $user->branches()->get();
        $branches = $branches->merge($additionalBranches)->unique('id');

        $result = $branches->map(function ($branch) use ($currentBranchId) {
            return [
                'id' => $branch->id,
                'name' => $branch->name,
                'address' => $branch->address,
                'phone' => $branch->phone,
                'is_current' => $branch->id === $currentBranchId,
            ];
        })->values();

        return response()->json($result);
    }

    /**
     * Switch the user's active branch.
     */
    public function switchBranch(Request $request)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
        ]);

        $user = $request->user();

        // Check if user has access to this branch
        if (!$user->canAccessBranch($validated['branch_id'])) {
            return response()->json([
                'message' => 'You do not have access to this branch.',
            ], 403);
        }

        // Update active branch
        $user->active_branch_id = $validated['branch_id'];
        $user->save();

        return response()->json([
            'message' => 'Branch switched successfully.',
            'current_branch_id' => $user->currentBranchId(),
        ]);
    }
}
