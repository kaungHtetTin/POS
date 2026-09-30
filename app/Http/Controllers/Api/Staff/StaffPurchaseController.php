<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Services\SupplierPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StaffPurchaseController extends Controller
{
    /**
     * List suppliers (for purchase creation).
     * Requires: supplier, purchase, or payment management permission.
     */
    public function suppliers(Request $request)
    {
        if (!$this->canAccessSuppliers($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branchIds = $this->accessibleBranchIds($request);
        $suppliers = Supplier::select('id', 'name', 'phone', 'email', 'address', 'credit_limit')
            ->withSum([
                'purchases as accessible_due_amount' => fn ($query) => $query->whereIn('branch_id', $branchIds),
            ], 'due_amount')
            ->orderBy('name')
            ->get()
            ->map(fn ($supplier) => [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
                'credit_limit' => (float) $supplier->credit_limit,
                'balance' => (float) ($supplier->accessible_due_amount ?? 0),
            ]);

        return response()->json($suppliers);
    }

    /**
     * Supplier statement with purchases and payment history.
     * Requires: supplier, purchase, or payment management permission.
     */
    public function supplierStatement(Request $request, Supplier $supplier)
    {
        if (!$this->canAccessSuppliers($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branchIds = $this->accessibleBranchIds($request);

        $purchases = $supplier->purchases()
            ->whereIn('branch_id', $branchIds)
            ->with(['branch:id,name'])
            ->withCount('items')
            ->latest()
            ->get();

        $payments = $supplier->payments()
            ->whereIn('branch_id', $branchIds)
            ->with(['purchase:id,invoice_number', 'branch:id,name', 'user:id,name'])
            ->latest('payment_date')
            ->latest()
            ->get();

        return response()->json([
            'supplier' => [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
                'credit_limit' => (float) $supplier->credit_limit,
                'purchases_count' => $purchases->count(),
                'balance' => (float) $purchases->sum('due_amount'),
            ],
            'summary' => [
                'total_purchases' => (float) $purchases->sum('total_amount'),
                'total_due' => (float) $purchases->sum('due_amount'),
                'total_payments' => (float) $payments->sum('amount'),
                'outstanding_balance' => (float) $purchases->sum('due_amount'),
            ],
            'purchases' => $purchases,
            'due_purchases' => $purchases->where('due_amount', '>', 0)->values(),
            'payments' => $payments,
        ]);
    }

    /**
     * List supplier payments.
     * Requires: manage_payments permission.
     */
    public function supplierPayments(Request $request)
    {
        if (!$request->user()->hasPermission('manage_payments')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'purchase_id' => 'nullable|exists:purchases,id',
            'payment_method' => 'nullable|in:Cash,Card,Mobile,Wallet',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = SupplierPayment::with([
            'supplier:id,name',
            'purchase:id,invoice_number',
            'branch:id,name',
            'user:id,name',
        ])->whereIn('branch_id', $this->accessibleBranchIds($request));

        if (!empty($validated['supplier_id'])) {
            $query->where('supplier_id', $validated['supplier_id']);
        }

        if (!empty($validated['purchase_id'])) {
            $query->where('purchase_id', $validated['purchase_id']);
        }

        if (!empty($validated['payment_method'])) {
            $query->where('payment_method', $validated['payment_method']);
        }

        if (!empty($validated['from_date'])) {
            $query->whereDate('payment_date', '>=', $validated['from_date']);
        }

        if (!empty($validated['to_date'])) {
            $query->whereDate('payment_date', '<=', $validated['to_date']);
        }

        return response()->json(
            $query->latest('payment_date')
                ->latest()
                ->paginate($validated['per_page'] ?? 15)
        );
    }

    /**
     * Record a supplier payment.
     * Requires: manage_payments permission.
     */
    public function storeSupplierPayment(Request $request, SupplierPaymentService $supplierPaymentService)
    {
        if (!$request->user()->hasPermission('manage_payments')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'purchase_id' => 'nullable|exists:purchases,id',
            'branch_id' => 'nullable|exists:branches,id',
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:Cash,Card,Mobile,Wallet',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $result = $supplierPaymentService->record($validated, $request->user());

        return response()->json([
            'message' => 'Supplier payment recorded successfully.',
            'supplier' => [
                'id' => $result['supplier']->id,
                'name' => $result['supplier']->name,
                'balance' => (float) Purchase::where('supplier_id', $result['supplier']->id)
                    ->whereIn('branch_id', $this->accessibleBranchIds($request))
                    ->sum('due_amount'),
            ],
            'payments' => $result['payments']->load(['purchase:id,invoice_number', 'branch:id,name', 'user:id,name']),
        ], 201);
    }

    /**
     * List active products with their units (for purchase item selection).
     * Requires: manage_purchases permission.
     */
    public function products(Request $request)
    {
        if (!$request->user()->hasPermission('manage_purchases')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $products = Product::select('id', 'name', 'generic_name', 'barcode')
            ->with([
                'product_units' => function ($q) {
                    $q->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'wholesale_price', 'is_base_unit')
                        ->with(['unit:id,name,short_name']);
                },
            ])
            ->where('status', 'Active')
            ->orderBy('name')
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'generic_name' => $product->generic_name,
                    'barcode' => $product->barcode,
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
                        ];
                    }),
                ];
            });

        return response()->json($products);
    }

    /**
     * List branches (for purchase assignment).
     * Requires: manage_purchases permission.
     */
    public function branches(Request $request)
    {
        if (!$request->user()->hasPermission('manage_purchases')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branches = Branch::select('id', 'name', 'address', 'phone')
            ->whereIn('id', $this->accessibleBranchIds($request))
            ->orderBy('name')
            ->get();
        return response()->json($branches);
    }

    /**
     * Create a new purchase (with inventory batch creation).
     * Requires: manage_purchases permission.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('manage_purchases')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'branch_id' => 'required|exists:branches,id',
            'invoice_number' => 'required|string|max:255|unique:purchases,invoice_number',
            'purchase_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:purchase_date',
            'payment_status' => 'required|in:Paid,Partial,Due',
            'paid_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.unit_id' => 'required|exists:units,id',
            'items.*.batch_number' => 'nullable|string|max:255',
            'items.*.expiry_date' => 'required|date|after:today',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.foc_quantity' => 'nullable|integer|min:0',
            'items.*.unit_price' => 'required|numeric|min:0.01',
            'items.*.selling_price' => 'required|numeric|min:0.01',
            'items.*.wholesale_price' => 'nullable|numeric|min:0.01',
        ]);

        if (!$this->accessibleBranchIds($request)->contains($validated['branch_id'])) {
            return response()->json(['message' => 'You do not have access to the selected branch.'], 403);
        }

        $userId = $request->user()->id;

        $purchase = DB::transaction(function () use ($validated, $userId) {
            $items = collect($validated['items']);
            $productUnitRows = DB::table('product_units')
                ->select('product_id', 'unit_id', 'conversion_factor')
                ->whereIn('product_id', $items->pluck('product_id')->unique()->values())
                ->whereIn('unit_id', $items->pluck('unit_id')->unique()->values())
                ->get();

            $preparedItems = $items->map(function ($item) use ($productUnitRows) {
                $productUnit = $productUnitRows->first(function ($row) use ($item) {
                    return $row->product_id === $item['product_id'] && $row->unit_id === $item['unit_id'];
                });

                if (!$productUnit || (int) $productUnit->conversion_factor < 1) {
                    abort(422, 'Selected unit does not belong to the selected product.');
                }

                $conversionFactor = (int) $productUnit->conversion_factor;
                $paidQuantity = (int) $item['quantity'];
                $focQuantity = (int) ($item['foc_quantity'] ?? 0);
                $receivedQuantity = $paidQuantity + $focQuantity;
                $baseQuantity = $receivedQuantity * $conversionFactor;
                $lineTotal = $paidQuantity * (float) $item['unit_price'];

                return array_merge($item, [
                    'batch_number' => trim((string) ($item['batch_number'] ?? ''))
                        ?: 'BATCH-' . now()->format('YmdHis') . '-' . strtoupper(substr((string) Str::uuid(), 0, 8)),
                    'foc_quantity' => $focQuantity,
                    'base_quantity' => $baseQuantity,
                    'foc_base_quantity' => $focQuantity * $conversionFactor,
                    'base_unit_price' => $baseQuantity > 0 ? $lineTotal / $baseQuantity : 0,
                    'base_selling_price' => (float) $item['selling_price'] / $conversionFactor,
                    'wholesale_price' => (float) ($item['wholesale_price'] ?? $item['selling_price']),
                    'line_total' => $lineTotal,
                ]);
            });

            $totalAmount = (float) $preparedItems->sum('line_total');
            $paidAmount = (float) ($validated['paid_amount'] ?? 0);

            if ($validated['payment_status'] === 'Paid') {
                $paidAmount = $totalAmount;
            }

            if ($validated['payment_status'] === 'Due') {
                $paidAmount = 0;
            }

            if ($paidAmount > $totalAmount) {
                throw ValidationException::withMessages([
                    'paid_amount' => 'Paid amount cannot exceed total purchase amount.',
                ]);
            }

            $dueAmount = $totalAmount - $paidAmount;
            $dueDate = Carbon::parse($validated['due_date'] ?? $validated['purchase_date'])
                ->addDays(empty($validated['due_date']) ? 7 : 0)
                ->toDateString();
            $supplier = Supplier::whereKey($validated['supplier_id'])->lockForUpdate()->firstOrFail();
            $projectedBalance = (float) $supplier->balance + $dueAmount;

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'branch_id' => $validated['branch_id'],
                'user_id' => $userId,
                'invoice_number' => $validated['invoice_number'],
                'purchase_date' => $validated['purchase_date'],
                'due_date' => $dueDate,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'payment_status' => $validated['payment_status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($preparedItems as $item) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'unit_id' => $item['unit_id'],
                    'batch_number' => $item['batch_number'],
                    'expiry_date' => $item['expiry_date'],
                    'quantity' => $item['quantity'],
                    'foc_quantity' => $item['foc_quantity'],
                    'base_quantity' => $item['base_quantity'],
                    'foc_base_quantity' => $item['foc_base_quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['line_total'],
                    'created_at' => now(),
                ]);

                $batch = \App\Models\InventoryBatch::where('branch_id', $validated['branch_id'])
                    ->where('product_id', $item['product_id'])
                    ->where('batch_number', $item['batch_number'])
                    ->whereDate('expiry_date', $item['expiry_date'])
                    ->lockForUpdate()
                    ->first();

                if ($batch) {
                    $existingQuantity = (int) $batch->quantity;
                    $incomingQuantity = (int) $item['base_quantity'];
                    $newQuantity = $existingQuantity + $incomingQuantity;
                    $batch->update([
                        'quantity' => $newQuantity,
                        'purchase_price' => (($existingQuantity * (float) $batch->purchase_price) + ($incomingQuantity * (float) $item['base_unit_price'])) / $newQuantity,
                        'selling_price' => (($existingQuantity * (float) $batch->selling_price) + ($incomingQuantity * (float) $item['base_selling_price'])) / $newQuantity,
                    ]);
                } else {
                    \App\Models\InventoryBatch::create([
                        'branch_id' => $validated['branch_id'],
                        'product_id' => $item['product_id'],
                        'batch_number' => $item['batch_number'],
                        'expiry_date' => $item['expiry_date'],
                        'quantity' => $item['base_quantity'],
                        'purchase_price' => $item['base_unit_price'],
                        'selling_price' => $item['base_selling_price'],
                    ]);
                }

                // Update or create inventory aggregate
                $inventory = \App\Models\Inventory::firstOrCreate([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $item['product_id'],
                ], ['quantity' => 0]);
                $inventory->increment('quantity', $item['base_quantity']);

                DB::table('product_units')
                    ->where('product_id', $item['product_id'])
                    ->where('unit_id', $item['unit_id'])
                    ->update([
                        'selling_price' => $item['selling_price'],
                        'wholesale_price' => $item['wholesale_price'],
                    ]);
            }

            $supplier->update([
                'balance' => $projectedBalance,
            ]);

            return $purchase;
        });

        $purchase->load(['supplier:id,name', 'branch:id,name', 'items.product:id,name', 'items.unit:id,name,short_name']);

        return response()->json([
            'message' => 'Purchase created successfully.',
            'purchase' => $purchase,
        ], 201);
    }

    /**
     * List purchases (paginated).
     * Requires: manage_purchases permission.
     */
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('manage_purchases')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Purchase::with([
            'supplier:id,name',
            'branch:id,name',
            'items' => function ($q) {
                $q->with(['product:id,name', 'unit:id,name,short_name']);
            }
        ])->withCount('items')
            ->whereIn('branch_id', $this->accessibleBranchIds($request));

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($sq) use ($search) {
                        $sq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $purchases = $query->latest()->paginate(15);

        return response()->json($purchases);
    }

    /**
     * Get single purchase details.
     * Requires: manage_purchases permission.
     */
    public function show(Request $request, Purchase $purchase)
    {
        if (!$request->user()->hasPermission('manage_purchases')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$this->accessibleBranchIds($request)->contains($purchase->branch_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $purchase->load([
            'supplier:id,name,phone,email',
            'branch:id,name',
            'user:id,name',
            'payments:id,purchase_id,payment_date,amount,payment_method,reference_number',
            'items' => function ($q) {
                $q->with(['product:id,name,generic_name', 'unit:id,name,short_name']);
            }
        ]);

        return response()->json($purchase);
    }

    private function canAccessSuppliers(Request $request): bool
    {
        $user = $request->user();

        return $user->hasPermission('manage_suppliers')
            || $user->hasPermission('manage_purchases')
            || $user->hasPermission('manage_payments');
    }

    private function accessibleBranchIds(Request $request)
    {
        $user = $request->user();

        if ($user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches')) {
            return Branch::pluck('id');
        }

        $branchIds = collect([$user->branch_id, $user->active_branch_id])->filter();

        try {
            $branchIds = $branchIds->merge($user->branches()->pluck('branches.id'));
        } catch (\Throwable $e) {
            // Keep direct branch assignments when the optional relation is unavailable.
        }

        return $branchIds->unique()->values();
    }
}
