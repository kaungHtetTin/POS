<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\InventoryBatch;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->branch_id;
        
        $query = Product::query()
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('inventories', function ($join) use ($branchId) {
                $join->on('inventories.product_id', '=', 'products.id');

                if ($branchId) {
                    $join->where('inventories.branch_id', $branchId);
                }
            })
            ->select([
                'products.id',
                'products.name',
                'products.generic_name',
                'products.barcode',
                'products.category_id',
                'products.min_stock_level',
                'products.status',
                'categories.name as category_name',
            ])
            ->selectRaw('COALESCE(SUM(inventories.quantity), 0) as current_stock')
            ->groupBy([
                'products.id',
                'products.name',
                'products.generic_name',
                'products.barcode',
                'products.category_id',
                'products.min_stock_level',
                'products.status',
                'categories.name',
            ]);

        // Search functionality
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('products.name', 'like', "%{$request->search}%")
                  ->orWhere('products.generic_name', 'like', "%{$request->search}%")
                  ->orWhere('products.barcode', 'like', "%{$request->search}%");
            });
        }

        // Filter by category
        if ($request->category_id) {
            $query->where('products.category_id', $request->category_id);
        }

        // Filter by product status (Active/Inactive)
        if ($request->product_status) {
            $query->where('products.status', $request->product_status);
        }

        if ($request->stock_status) {
            if ($request->stock_status === 'Out of Stock') {
                $query->havingRaw('current_stock <= 0');
            } elseif ($request->stock_status === 'Low Stock') {
                $query->havingRaw('current_stock > 0 AND current_stock < products.min_stock_level');
            } elseif ($request->stock_status === 'In Stock') {
                $query->havingRaw('current_stock >= products.min_stock_level');
            }
        }

        $products = $query
            ->latest('products.created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(function($product) {
            $stock = (int) ($product->current_stock ?? 0);
            return [
                'id' => $product->id,
                'name' => $product->name,
                'generic_name' => $product->generic_name,
                'barcode' => $product->barcode,
                'category' => $product->category_name ?? 'N/A',
                'min_stock_level' => $product->min_stock_level,
                'current_stock' => $stock,
                'product_status' => $product->status,
                'stock_status' => $stock <= 0 ? 'Out of Stock' : ($stock < $product->min_stock_level ? 'Low Stock' : 'In Stock')
            ];
        });

        return Inertia::render('Inventory/Index', [
            'inventory' => $products,
            'branches' => Branch::select('id', 'name')->get(),
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
            'filters' => $request->only(['search', 'branch_id', 'category_id', 'product_status', 'stock_status']),
        ]);
    }

    public function show(Request $request, string $locale, Product $product)
    {
        $validated = $request->validate([
            'branch_id' => ['nullable', 'exists:branches,id'],
        ]);

        $branchId = $validated['branch_id'] ?? null;
        $product->load(['category:id,name']);

        $batches = InventoryBatch::query()
            ->select('id', 'branch_id', 'product_id', 'batch_number', 'expiry_date', 'quantity', 'purchase_price', 'selling_price')
            ->with(['branch:id,name'])
            ->where('product_id', $product->id)
            ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->where('quantity', '>', 0)
            ->orderBy('branch_id')
            ->orderBy('expiry_date')
            ->orderBy('batch_number')
            ->get();

        $branchGroups = $batches
            ->groupBy('branch_id')
            ->map(function ($items) {
                $branch = $items->first()->branch;

                return [
                    'branch' => $branch ? [
                        'id' => $branch->id,
                        'name' => $branch->name,
                    ] : null,
                    'total_quantity' => (int) $items->sum('quantity'),
                    'batches' => $items->map(fn ($batch) => [
                        'id' => $batch->id,
                        'batch_number' => $batch->batch_number,
                        'expiry_date' => optional($batch->expiry_date)->toDateString(),
                        'quantity' => (int) $batch->quantity,
                        'purchase_price' => $batch->purchase_price,
                        'selling_price' => $batch->selling_price,
                    ])->values(),
                ];
            })
            ->values();

        $aggregateQuantity = (int) $product->inventories()
            ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->sum('quantity');

        $batchQuantity = (int) $batches->sum('quantity');

        return Inertia::render('Inventory/Show', [
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'generic_name' => $product->generic_name,
                'barcode' => $product->barcode,
                'category' => $product->category->name ?? 'N/A',
                'min_stock_level' => (int) $product->min_stock_level,
                'status' => $product->status,
            ],
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'branchGroups' => $branchGroups,
            'summary' => [
                'batch_quantity' => $batchQuantity,
                'aggregate_quantity' => $aggregateQuantity,
                'quantity_difference' => $aggregateQuantity - $batchQuantity,
                'stock_status' => $this->stockStatus($aggregateQuantity, (int) $product->min_stock_level),
            ],
            'filters' => $request->only(['branch_id']),
        ]);
    }

    private function stockStatus(int $stock, int $minStockLevel): string
    {
        if ($stock <= 0) {
            return 'Out of Stock';
        }

        return $stock < $minStockLevel ? 'Low Stock' : 'In Stock';
    }
}
