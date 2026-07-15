<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $query = Purchase::with([
            'supplier:id,name,credit_limit,balance', 
            'branch:id,name',
            'items' => function($q) {
                $q->with(['product:id,name', 'unit:id,name,short_name']);
            }
        ])
            ->withCount(['items', 'payments']);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('invoice_number', 'like', "%{$request->search}%")
                    ->orWhereHas('supplier', function ($supplierQuery) use ($request) {
                        $supplierQuery->where('name', 'like', "%{$request->search}%");
                    });
            });
        }

        return Inertia::render('Purchases/Index', [
            'purchases' => $query->latest()->get(),
            'suppliers' => Supplier::select('id', 'name', 'credit_limit', 'balance')->orderBy('name')->get(),
            'products' => Product::select('id', 'category_id', 'name', 'generic_name', 'barcode', 'image_path', 'min_stock_level')
                ->with([
                    'category:id,name',
                    'inventories:id,product_id,branch_id,quantity',
                    'product_units' => function ($unitQuery) {
                        $unitQuery->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'wholesale_price', 'is_base_unit')
                            ->with(['unit:id,name,short_name']);
                    },
                ])
                ->where('status', 'Active')
                ->orderBy('name')
                ->get(),
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Purchases/Create', [
            'suppliers' => Supplier::select('id', 'name', 'credit_limit', 'balance')->orderBy('name')->get(),
            'products' => Product::select('id', 'name')
                ->with([
                    'product_units' => function ($unitQuery) {
                        $unitQuery->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'wholesale_price', 'is_base_unit')
                            ->with(['unit:id,name,short_name']);
                    },
                ])
                ->where('status', 'Active')
                ->orderBy('name')
                ->get(),
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function show(string $locale, Purchase $purchase)
    {
        $purchase->load([
            'supplier:id,name,phone,email,address,credit_limit,balance',
            'branch:id,name,address,phone,email',
            'payments:id,purchase_id,payment_date,amount,payment_method,reference_number,notes,user_id',
            'payments.user:id,name',
            'items' => function ($q) {
                $q->with(['product:id,name,generic_name,barcode', 'unit:id,name,short_name']);
            },
        ]);

        $productUnitRows = DB::table('product_units')
            ->select('product_id', 'unit_id', 'selling_price', 'wholesale_price', 'conversion_factor')
            ->whereIn('product_id', $purchase->items->pluck('product_id')->unique()->values())
            ->whereIn('unit_id', $purchase->items->pluck('unit_id')->unique()->values())
            ->get()
            ->keyBy(function ($row) {
                return $row->product_id . ':' . $row->unit_id;
            });

        return Inertia::render('Purchases/Show', [
            'purchase' => [
                'id' => $purchase->id,
                'supplier_id' => $purchase->supplier_id,
                'branch_id' => $purchase->branch_id,
                'invoice_number' => $purchase->invoice_number,
                'purchase_date' => optional($purchase->purchase_date)->format('Y-m-d'),
                'payment_status' => $purchase->payment_status,
                'total_amount' => (float) $purchase->total_amount,
                'paid_amount' => (float) $purchase->paid_amount,
                'due_amount' => (float) $purchase->due_amount,
                'created_at' => optional($purchase->created_at)->toISOString(),
                'updated_at' => optional($purchase->updated_at)->toISOString(),
                'supplier' => $purchase->supplier,
                'branch' => $purchase->branch,
                'payments' => $purchase->payments->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'payment_date' => optional($payment->payment_date)->format('Y-m-d'),
                        'amount' => (float) $payment->amount,
                        'payment_method' => $payment->payment_method,
                        'reference_number' => $payment->reference_number,
                        'notes' => $payment->notes,
                        'user' => $payment->user ? [
                            'id' => $payment->user->id,
                            'name' => $payment->user->name,
                        ] : null,
                    ];
                })->values(),
                'items' => $purchase->items->map(function ($item) use ($productUnitRows) {
                    $productUnit = $productUnitRows->get($item->product_id . ':' . $item->unit_id);
                    $paidQuantity = (int) $item->quantity;
                    $focQuantity = (int) ($item->foc_quantity ?? 0);
                    $receivedQuantity = $paidQuantity + $focQuantity;

                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product?->name,
                        'generic_name' => $item->product?->generic_name,
                        'barcode' => $item->product?->barcode,
                        'unit_id' => $item->unit_id,
                        'unit_name' => $item->unit?->short_name ?: $item->unit?->name,
                        'batch_number' => $item->batch_number,
                        'expiry_date' => optional($item->expiry_date)->format('Y-m-d'),
                        'quantity' => $paidQuantity,
                        'foc_quantity' => $focQuantity,
                        'received_quantity' => $receivedQuantity,
                        'base_quantity' => (int) $item->base_quantity,
                        'foc_base_quantity' => (int) ($item->foc_base_quantity ?? 0),
                        'conversion_factor' => (int) ($productUnit->conversion_factor ?? 1),
                        'unit_price' => (float) $item->unit_price,
                        'selling_price' => (float) ($productUnit->selling_price ?? 0),
                        'wholesale_price' => (float) ($productUnit->wholesale_price ?? $productUnit->selling_price ?? 0),
                        'total_price' => (float) $item->total_price,
                    ];
                })->values(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'branch_id' => 'required|exists:branches,id',
            'invoice_number' => 'required|string|max:255|unique:purchases,invoice_number',
            'purchase_date' => 'required|date',
            'payment_status' => 'required|in:Paid,Partial,Due',
            'paid_amount' => 'nullable|numeric|min:0|max:999999999999.99',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.unit_id' => 'required|exists:units,id',
            'items.*.batch_number' => 'nullable|string|max:255',
            'items.*.expiry_date' => 'required|date|after:today',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.foc_quantity' => 'nullable|integer|min:0',
            'items.*.unit_price' => 'required|numeric|min:0.01|max:999999999999.99',
            'items.*.selling_price' => 'required|numeric|min:0.01|max:999999999999.99',
            'items.*.wholesale_price' => 'nullable|numeric|min:0.01|max:999999999999.99',
        ]);

        $items = collect($validated['items']);
        $productIds = $items->pluck('product_id')->unique()->values();

        $productUnitRows = DB::table('product_units')
            ->select('product_id', 'unit_id', 'conversion_factor')
            ->whereIn('product_id', $productIds)
            ->get();

        $preparedItems = [];

        foreach ($items as $index => $item) {
            $productUnit = $productUnitRows->first(function ($row) use ($item) {
                return $row->product_id === $item['product_id'] && $row->unit_id === $item['unit_id'];
            });

            if (!$productUnit) {
                return redirect()->back()->withErrors([
                    "items.$index.unit_id" => 'Selected unit does not belong to the selected product.',
                ])->withInput();
            }

            $conversionFactor = (int) $productUnit->conversion_factor;

            if ($conversionFactor < 1) {
                return redirect()->back()->withErrors([
                    "items.$index.unit_id" => 'Invalid conversion factor for selected product unit.',
                ])->withInput();
            }

            $paidQuantity = (int) $item['quantity'];
            $focQuantity = (int) ($item['foc_quantity'] ?? 0);
            $receivedQuantity = $paidQuantity + $focQuantity;
            $baseQuantity = $receivedQuantity * $conversionFactor;
            $focBaseQuantity = $focQuantity * $conversionFactor;
            $lineTotal = $paidQuantity * (float) $item['unit_price'];
            $batchNumber = $this->resolveBatchNumber(
                $item['batch_number'] ?? null,
                $validated['branch_id'],
                $item['product_id'],
                $validated['purchase_date']
            );

            $preparedItems[] = array_merge($item, [
                'batch_number' => $batchNumber,
                'conversion_factor' => $conversionFactor,
                'base_quantity' => $baseQuantity,
                'foc_quantity' => $focQuantity,
                'foc_base_quantity' => $focBaseQuantity,
                'base_unit_price' => $baseQuantity > 0 ? $lineTotal / $baseQuantity : 0,
                'base_selling_price' => (float) $item['selling_price'] / $conversionFactor,
                'wholesale_price' => (float) ($item['wholesale_price'] ?? $item['selling_price']),
                'line_total' => $lineTotal,
            ]);
        }

        $totalAmount = (float) collect($preparedItems)->sum('line_total');

        $paidAmount = (float) ($validated['paid_amount'] ?? 0);

        if ($validated['payment_status'] === 'Paid') {
            $paidAmount = $totalAmount;
        }

        if ($validated['payment_status'] === 'Due') {
            $paidAmount = 0;
        }

        if ($paidAmount > $totalAmount) {
            return redirect()->back()->withErrors([
                'paid_amount' => 'Paid amount cannot exceed total purchase amount.',
            ])->withInput();
        }

        $dueAmount = $totalAmount - $paidAmount;
        $supplier = Supplier::findOrFail($validated['supplier_id']);
        $projectedBalance = (float) $supplier->balance + $dueAmount;

        if ($projectedBalance > (float) $supplier->credit_limit) {
            return redirect()->back()->withErrors([
                'supplier_id' => 'Credit limit exceeded for selected supplier.',
            ])->with('error', 'Warning: This purchase exceeds supplier credit limit.')->withInput();
        }

        DB::transaction(function () use ($validated, $preparedItems, $totalAmount, $paidAmount, $dueAmount, $supplier) {
            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'branch_id' => $validated['branch_id'],
                'invoice_number' => $validated['invoice_number'],
                'purchase_date' => $validated['purchase_date'],
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'payment_status' => $validated['payment_status'],
            ]);

            foreach ($preparedItems as $item) {
                $purchase->items()->create([
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

                $batch = InventoryBatch::where('branch_id', $validated['branch_id'])
                    ->where('product_id', $item['product_id'])
                    ->where('batch_number', $item['batch_number'])
                    ->whereDate('expiry_date', $item['expiry_date'])
                    ->first();

                if ($batch) {
                    $existingQuantity = (int) $batch->quantity;
                    $incomingQuantity = (int) $item['base_quantity'];
                    $newQuantity = $existingQuantity + $incomingQuantity;

                    $weightedPurchasePrice = (
                        ($existingQuantity * (float) $batch->purchase_price)
                        + ($incomingQuantity * (float) $item['base_unit_price'])
                    ) / $newQuantity;

                    $weightedSellingPrice = (
                        ($existingQuantity * (float) $batch->selling_price)
                        + ($incomingQuantity * (float) $item['base_selling_price'])
                    ) / $newQuantity;

                    $batch->update([
                        'quantity' => $newQuantity,
                        'purchase_price' => $weightedPurchasePrice,
                        'selling_price' => $weightedSellingPrice,
                    ]);
                } else {
                    InventoryBatch::create([
                        'branch_id' => $validated['branch_id'],
                        'product_id' => $item['product_id'],
                        'batch_number' => $item['batch_number'],
                        'expiry_date' => $item['expiry_date'],
                        'quantity' => $item['base_quantity'],
                        'purchase_price' => $item['base_unit_price'],
                        'selling_price' => $item['base_selling_price'],
                        'is_synced' => false,
                    ]);
                }

                $inventory = Inventory::firstOrCreate(
                    [
                        'branch_id' => $validated['branch_id'],
                        'product_id' => $item['product_id'],
                    ],
                    ['quantity' => 0]
                );

                $inventory->update([
                    'quantity' => $inventory->quantity + $item['base_quantity'],
                ]);

                DB::table('product_units')
                    ->where('product_id', $item['product_id'])
                    ->where('unit_id', $item['unit_id'])
                    ->update([
                        'selling_price' => $item['selling_price'],
                        'wholesale_price' => $item['wholesale_price'],
                    ]);
            }

            $supplier->update([
                'balance' => (float) $supplier->balance + $dueAmount,
            ]);
        });

        return redirect()->back()->with('success', 'Purchase order created and stock received successfully.');
    }

    public function update(Request $request, string $locale, Purchase $purchase)
    {
        if ($purchase->payments()->exists()) {
            return redirect()->back()->withErrors([
                'purchase_id' => 'Purchase cannot be edited after supplier payments have been recorded.',
            ]);
        }

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'branch_id' => 'required|exists:branches,id',
            'invoice_number' => 'required|string|max:255|unique:purchases,invoice_number,' . $purchase->id,
            'purchase_date' => 'required|date',
            'payment_status' => 'required|in:Paid,Partial,Due',
            'paid_amount' => 'nullable|numeric|min:0|max:999999999999.99',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.unit_id' => 'required|exists:units,id',
            'items.*.batch_number' => 'nullable|string|max:255',
            'items.*.expiry_date' => 'required|date|after:today',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.foc_quantity' => 'nullable|integer|min:0',
            'items.*.unit_price' => 'required|numeric|min:0.01|max:999999999999.99',
            'items.*.selling_price' => 'required|numeric|min:0.01|max:999999999999.99',
            'items.*.wholesale_price' => 'nullable|numeric|min:0.01|max:999999999999.99',
        ]);

        $items = collect($validated['items']);
        $productIds = $items->pluck('product_id')->unique()->values();

        $productUnitRows = DB::table('product_units')
            ->select('product_id', 'unit_id', 'conversion_factor')
            ->whereIn('product_id', $productIds)
            ->get();

        $preparedItems = [];

        foreach ($items as $index => $item) {
            $productUnit = $productUnitRows->first(function ($row) use ($item) {
                return $row->product_id === $item['product_id'] && $row->unit_id === $item['unit_id'];
            });

            if (!$productUnit) {
                return redirect()->back()->withErrors([
                    "items.$index.unit_id" => 'Selected unit does not belong to the selected product.',
                ])->withInput();
            }

            $conversionFactor = (int) $productUnit->conversion_factor;

            if ($conversionFactor < 1) {
                return redirect()->back()->withErrors([
                    "items.$index.unit_id" => 'Invalid conversion factor for selected product unit.',
                ])->withInput();
            }

            $paidQuantity = (int) $item['quantity'];
            $focQuantity = (int) ($item['foc_quantity'] ?? 0);
            $receivedQuantity = $paidQuantity + $focQuantity;
            $baseQuantity = $receivedQuantity * $conversionFactor;
            $focBaseQuantity = $focQuantity * $conversionFactor;
            $lineTotal = $paidQuantity * (float) $item['unit_price'];
            $batchNumber = $this->resolveBatchNumber(
                $item['batch_number'] ?? null,
                $validated['branch_id'],
                $item['product_id'],
                $validated['purchase_date']
            );

            $preparedItems[] = array_merge($item, [
                'batch_number' => $batchNumber,
                'conversion_factor' => $conversionFactor,
                'base_quantity' => $baseQuantity,
                'foc_quantity' => $focQuantity,
                'foc_base_quantity' => $focBaseQuantity,
                'base_unit_price' => $baseQuantity > 0 ? $lineTotal / $baseQuantity : 0,
                'base_selling_price' => (float) $item['selling_price'] / $conversionFactor,
                'wholesale_price' => (float) ($item['wholesale_price'] ?? $item['selling_price']),
                'line_total' => $lineTotal,
            ]);
        }

        $totalAmount = (float) collect($preparedItems)->sum('line_total');
        $paidAmount = (float) ($validated['paid_amount'] ?? 0);

        if ($validated['payment_status'] === 'Paid') $paidAmount = $totalAmount;
        if ($validated['payment_status'] === 'Due') $paidAmount = 0;

        if ($paidAmount > $totalAmount) {
            return redirect()->back()->withErrors(['paid_amount' => 'Paid amount cannot exceed total purchase amount.'])->withInput();
        }

        $dueAmount = $totalAmount - $paidAmount;
        $supplier = Supplier::findOrFail($validated['supplier_id']);

        $existingDueForSelectedSupplier = $purchase->supplier_id === $validated['supplier_id']
            ? (float) $purchase->due_amount
            : 0;
        $projectedBalance = (float) $supplier->balance - $existingDueForSelectedSupplier + $dueAmount;
        if ($projectedBalance > (float) $supplier->credit_limit) {
            return redirect()->back()->withErrors(['supplier_id' => 'Credit limit exceeded for selected supplier.'])->withInput();
        }

        DB::transaction(function () use ($purchase, $validated, $preparedItems, $totalAmount, $paidAmount, $dueAmount, $supplier) {
            // 1. Reverse old inventory and supplier balance
            $oldSupplier = $purchase->supplier;
            $oldSupplier->update(['balance' => (float) $oldSupplier->balance - (float) $purchase->due_amount]);

            foreach ($purchase->items as $oldItem) {
                Inventory::where('branch_id', $purchase->branch_id)
                    ->where('product_id', $oldItem->product_id)
                    ->decrement('quantity', $oldItem->base_quantity);

                InventoryBatch::where('branch_id', $purchase->branch_id)
                    ->where('product_id', $oldItem->product_id)
                    ->where('batch_number', $oldItem->batch_number)
                    ->whereDate('expiry_date', $oldItem->expiry_date)
                    ->decrement('quantity', $oldItem->base_quantity);
            }

            // 2. Update Purchase record
            $purchase->update([
                'supplier_id' => $validated['supplier_id'],
                'branch_id' => $validated['branch_id'],
                'invoice_number' => $validated['invoice_number'],
                'purchase_date' => $validated['purchase_date'],
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'payment_status' => $validated['payment_status'],
            ]);

            // 3. Replace Items and apply new inventory
            $purchase->items()->delete();

            foreach ($preparedItems as $item) {
                $purchase->items()->create([
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

                $inventory = Inventory::firstOrCreate(
                    ['branch_id' => $validated['branch_id'], 'product_id' => $item['product_id']],
                    ['quantity' => 0]
                );
                $inventory->increment('quantity', $item['base_quantity']);

                $batch = InventoryBatch::where('branch_id', $validated['branch_id'])
                    ->where('product_id', $item['product_id'])
                    ->where('batch_number', $item['batch_number'])
                    ->whereDate('expiry_date', $item['expiry_date'])
                    ->first();

                if ($batch) {
                    $existingQty = (int) $batch->quantity;
                    $incomingQty = (int) $item['base_quantity'];
                    $newQty = $existingQty + $incomingQty;

                    // Simple update for simplicity in update logic (weighted average might be complex during update)
                    $batch->update([
                        'quantity' => $newQty,
                        'purchase_price' => $item['base_unit_price'],
                        'selling_price' => $item['base_selling_price'],
                    ]);
                } else {
                    InventoryBatch::create([
                        'branch_id' => $validated['branch_id'],
                        'product_id' => $item['product_id'],
                        'batch_number' => $item['batch_number'],
                        'expiry_date' => $item['expiry_date'],
                        'quantity' => $item['base_quantity'],
                        'purchase_price' => $item['base_unit_price'],
                        'selling_price' => $item['base_selling_price'],
                    ]);
                }

                DB::table('product_units')
                    ->where('product_id', $item['product_id'])
                    ->where('unit_id', $item['unit_id'])
                    ->update([
                        'selling_price' => $item['selling_price'],
                        'wholesale_price' => $item['wholesale_price'],
                    ]);
            }

            // 4. Update new supplier balance
            $supplier->refresh();
            $supplier->update(['balance' => (float) $supplier->balance + $dueAmount]);
        });

        return redirect()->back()->with('success', 'Purchase record updated and inventory synchronized successfully.');
    }

    public function destroy(string $locale, Purchase $purchase)
    {
        if ($purchase->payments()->exists()) {
            return redirect()->back()->with('error', 'Purchase cannot be deleted after supplier payments have been recorded.');
        }

        DB::transaction(function () use ($purchase) {
            $supplier = $purchase->supplier;
            $dueAmount = (float) $purchase->due_amount;

            if ($dueAmount > 0) {
                $supplier->update([
                    'balance' => (float) $supplier->balance - $dueAmount,
                ]);
            }

            foreach ($purchase->items as $item) {
                $inventory = Inventory::where('branch_id', $purchase->branch_id)
                    ->where('product_id', $item->product_id)
                    ->first();

                if ($inventory) {
                    $inventory->update([
                        'quantity' => max(0, $inventory->quantity - $item->base_quantity),
                    ]);
                }

                $batch = InventoryBatch::where('branch_id', $purchase->branch_id)
                    ->where('product_id', $item->product_id)
                    ->where('batch_number', $item->batch_number)
                    ->whereDate('expiry_date', $item->expiry_date)
                    ->first();

                if ($batch) {
                    $batch->update([
                        'quantity' => max(0, $batch->quantity - $item->base_quantity),
                    ]);
                }
            }

            $purchase->items()->delete();
            $purchase->delete();
        });

        return redirect()->back()->with('success', 'Purchase record deleted and inventory reversed successfully.');
    }

    protected function resolveBatchNumber(?string $batchNumber, string $branchId, string $productId, string $purchaseDate): string
    {
        $trimmedBatchNumber = trim((string) $batchNumber);

        if ($trimmedBatchNumber !== '') {
            return $trimmedBatchNumber;
        }

        $datePart = str_replace('-', '', $purchaseDate);
        $productPart = strtoupper(substr(str_replace('-', '', $productId), 0, 6));

        do {
            $candidate = sprintf(
                'B%s-%s-%03d',
                $datePart,
                $productPart,
                random_int(100, 999)
            );

            $exists = InventoryBatch::where('branch_id', $branchId)
                ->where('product_id', $productId)
                ->where('batch_number', $candidate)
                ->exists();
        } while ($exists);

        return $candidate;
    }
}
