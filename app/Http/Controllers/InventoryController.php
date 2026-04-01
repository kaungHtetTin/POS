<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->branch_id;
        
        $query = Product::select('id', 'name', 'generic_name', 'barcode', 'category_id', 'min_stock_level', 'status')
            ->with(['category:id,name']);

        // Search functionality
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('generic_name', 'like', "%{$request->search}%")
                  ->orWhere('barcode', 'like', "%{$request->search}%");
            });
        }

        // Filter by category
        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by product status (Active/Inactive)
        if ($request->product_status) {
            $query->where('status', $request->product_status);
        }

        // If a specific branch is selected, get stock for that branch
        if ($branchId) {
            $query->withSum(['inventories' => function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            }], 'quantity');
        } else {
            // Global stock (sum across all branches)
            $query->withSum('inventories', 'quantity');
        }

        $products = $query->latest()->get()->map(function($product) {
            $stock = (int) ($product->inventories_sum_quantity ?? 0);
            return [
                'id' => $product->id,
                'name' => $product->name,
                'generic_name' => $product->generic_name,
                'barcode' => $product->barcode,
                'category' => $product->category->name ?? 'N/A',
                'min_stock_level' => $product->min_stock_level,
                'current_stock' => $stock,
                'product_status' => $product->status,
                'stock_status' => $stock <= 0 ? 'Out of Stock' : ($stock < $product->min_stock_level ? 'Low Stock' : 'In Stock')
            ];
        });

        // Filter by stock status if requested
        if ($request->stock_status) {
            $products = $products->filter(function($p) use ($request) {
                return $p['stock_status'] === $request->stock_status;
            })->values();
        }

        return Inertia::render('Inventory/Index', [
            'inventory' => $products,
            'branches' => Branch::select('id', 'name')->get(),
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
            'filters' => $request->only(['search', 'branch_id', 'category_id', 'product_status', 'stock_status']),
        ]);
    }
}
