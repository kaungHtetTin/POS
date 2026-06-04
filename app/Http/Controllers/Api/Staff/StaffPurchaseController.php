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
                    $q->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'is_base_unit')
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
            'items.*.unit_price' => 'required|numeric|min:0.01',
            'items.*.selling_price' => 'required|numeric|min:0.01',
        ]);

        $userId = $request->user()->id;

        $purchase = DB::transaction(function () use ($validated, $userId) {
            $items = collect($validated['items']);
            $totalAmount = $items->sum(function ($item) {
                return $item['quantity'] * $item['unit_price'];
            });

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'branch_id' => $validated['branch_id'],
                'user_id' => $userId,
                'invoice_number' => $validated['invoice_number'],
                'purchase_date' => $validated['purchase_date'],
                'total_amount' => $totalAmount,
                'paid_amount' => $validated['paid_amount'] ?? 0,
                'payment_status' => $validated['payment_status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'unit_id' => $item['unit_id'],
                    'batch_number' => $item['batch_number'] ?? null,
                    'expiry_date' => $item['expiry_date'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'selling_price' => $item['selling_price'],
                    'total' => $item['quantity'] * $item['unit_price'],
                ]);

                // Create inventory batch
                \App\Models\InventoryBatch::create([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $item['product_id'],
                    'unit_id' => $item['unit_id'],
                    'batch_number' => $item['batch_number'] ?? 'BATCH-' . now()->format('YmdHis'),
                    'expiry_date' => $item['expiry_date'],
                    'quantity' => $item['quantity'],
                    'purchase_price' => $item['unit_price'],
                    'selling_price' => $item['selling_price'],
                ]);

                // Update or create inventory aggregate
                $inventory = \App\Models\Inventory::firstOrNew([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $item['product_id'],
                ]);
                $inventory->quantity = ($inventory->quantity ?? 0) + $item['quantity'];
                $inventory->save();
            }

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