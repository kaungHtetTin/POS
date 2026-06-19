<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffPurchaseController extends Controller
{
    /**
     * List suppliers (for purchase creation).
     * Requires: manage_inventory permission
     */
    public function suppliers(Request $request)
    {
        if (!$request->user()->hasPermission('manage_inventory')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $suppliers = Supplier::select('id', 'name', 'phone', 'email', 'address', 'credit_limit', 'balance')
            ->where('status', true)
            ->orderBy('name')
            ->get();

        return response()->json($suppliers);
    }

    /**
     * List active products with their units (for purchase item selection).
     * Requires: manage_inventory permission
     */
    public function products(Request $request)
    {
        if (!$request->user()->hasPermission('manage_inventory')) {
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
     * Requires: manage_inventory permission
     */
    public function branches(Request $request)
    {
        if (!$request->user()->hasPermission('manage_inventory')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branches = Branch::select('id', 'name', 'address', 'phone')->orderBy('name')->get();
        return response()->json($branches);
    }

    /**
     * Create a new purchase (with inventory batch creation).
     * Requires: manage_inventory permission
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('manage_inventory')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'branch_id' => 'required|exists:branches,id',
            'invoice_number' => 'required|string|max:255|unique:purchases,invoice_number',
            'purchase_date' => 'required|date',
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
                    'batch_number' => trim((string) ($item['batch_number'] ?? '')) ?: 'BATCH-' . now()->format('YmdHis'),
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

            $dueAmount = max($totalAmount - $paidAmount, 0);

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'branch_id' => $validated['branch_id'],
                'user_id' => $userId,
                'invoice_number' => $validated['invoice_number'],
                'purchase_date' => $validated['purchase_date'],
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

                // Create inventory batch
                \App\Models\InventoryBatch::create([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $item['product_id'],
                    'batch_number' => $item['batch_number'],
                    'expiry_date' => $item['expiry_date'],
                    'quantity' => $item['base_quantity'],
                    'purchase_price' => $item['base_unit_price'],
                    'selling_price' => $item['base_selling_price'],
                ]);

                // Update or create inventory aggregate
                $inventory = \App\Models\Inventory::firstOrNew([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $item['product_id'],
                ]);
                $inventory->quantity = ($inventory->quantity ?? 0) + $item['base_quantity'];
                $inventory->save();

                DB::table('product_units')
                    ->where('product_id', $item['product_id'])
                    ->where('unit_id', $item['unit_id'])
                    ->update([
                        'selling_price' => $item['selling_price'],
                        'wholesale_price' => $item['wholesale_price'],
                    ]);
            }

            Supplier::whereKey($validated['supplier_id'])->increment('balance', $dueAmount);

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
     * Requires: manage_inventory permission
     */
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('manage_inventory')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Purchase::with([
            'supplier:id,name',
            'branch:id,name',
            'items' => function ($q) {
                $q->with(['product:id,name', 'unit:id,name,short_name']);
            }
        ])->withCount('items');

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
     * Requires: manage_inventory permission
     */
    public function show(Request $request, Purchase $purchase)
    {
        if (!$request->user()->hasPermission('manage_inventory')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $purchase->load([
            'supplier:id,name,phone,email',
            'branch:id,name',
            'user:id,name',
            'items' => function ($q) {
                $q->with(['product:id,name,generic_name', 'unit:id,name,short_name']);
            }
        ]);

        return response()->json($purchase);
    }
}
