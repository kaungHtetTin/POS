<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\Tax;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'tax']);

        // Search by name, generic name, brand name, or barcode
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('generic_name', 'like', "%{$request->search}%")
                  ->orWhere('brand_name', 'like', "%{$request->search}%")
                  ->orWhere('barcode', 'like', "%{$request->search}%");
            });
        }

        // Filter by category
        if ($request->category) {
            $query->where('category_id', $request->category);
        }

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        return Inertia::render('Products/Index', [
            'products' => $query->latest()->get(),
            'categories' => Category::all(),
            'taxes' => Tax::where('status', true)->get(),
            'filters' => $request->only(['search', 'category', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'tax_id' => 'nullable|exists:taxes,id',
            'name' => 'required|string|max:255',
            'generic_name' => 'nullable|string|max:255',
            'brand_name' => 'nullable|string|max:255',
            'manufacturer' => 'nullable|string|max:255',
            'strength' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:255|unique:products,barcode',
            'description' => 'nullable|string',
            'min_stock_level' => 'nullable|integer|min:0',
            'tax_method' => 'required|in:Exclusive,Inclusive',
            'status' => 'required|in:Active,Inactive',
            'image' => 'nullable|image|max:2048',
        ]);

        DB::transaction(function () use ($request, $validated) {
            if ($request->hasFile('image')) {
                $validated['image_path'] = $request->file('image')->store('product-images', 'public');
            }

            Product::create($validated);
        });

        return redirect()->back();
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'tax_id' => 'nullable|exists:taxes,id',
            'name' => 'required|string|max:255',
            'generic_name' => 'nullable|string|max:255',
            'brand_name' => 'nullable|string|max:255',
            'manufacturer' => 'nullable|string|max:255',
            'strength' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:255|unique:products,barcode,' . $product->id,
            'description' => 'nullable|string',
            'min_stock_level' => 'nullable|integer|min:0',
            'tax_method' => 'required|in:Exclusive,Inclusive',
            'status' => 'required|in:Active,Inactive',
            'image' => 'nullable|image|max:2048',
        ]);

        DB::transaction(function () use ($request, $validated, $product) {
            if ($request->hasFile('image')) {
                if ($product->image_path) {
                    Storage::disk('public')->delete($product->image_path);
                }
                $validated['image_path'] = $request->file('image')->store('product-images', 'public');
            }

            $product->update($validated);
        });

        return redirect()->back();
    }

    public function destroy(Product $product)
    {
        // Check if product has batches or sales before deleting (soft delete is used)
        if ($product->batches()->exists()) {
            return redirect()->back()->with('error', 'Product cannot be deleted because it has inventory batches.');
        }

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->delete();

        return redirect()->back()->with('success', 'Medicine removed successfully.');
    }
}
