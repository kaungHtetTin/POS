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
        $query = Product::with(['category', 'tax', 'taxes', 'product_units.unit']);

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

        $defaultTaxId = \App\Models\Setting::get('invoice.default_tax_id', '');

        return Inertia::render('Products/Index', [
            'products' => $query->latest()->paginate(15)->withQueryString(),
            'categories' => Category::all(),
            'taxes' => Tax::where('status', true)->get(),
            'units' => Unit::all(),
            'filters' => $request->only(['search', 'category', 'status']),
            'default_tax_id' => $defaultTaxId,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'tax_id' => 'nullable|exists:taxes,id',
            'tax_ids' => 'nullable|array',
            'tax_ids.*' => 'exists:taxes,id',
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
            'product_units' => 'required|array|min:1',
            'product_units.*.unit_id' => 'required|exists:units,id',
            'product_units.*.conversion_factor' => 'required|numeric|min:1',
            'product_units.*.selling_price' => 'required|numeric|min:0',
            'product_units.*.is_base_unit' => 'required|boolean',
        ]);

        DB::transaction(function () use ($request, $validated) {
            $taxIds = collect($validated['tax_ids'] ?? [])
                ->filter()
                ->values();

            if ($taxIds->isEmpty() && !empty($validated['tax_id'])) {
                $taxIds = collect([$validated['tax_id']]);
            }

            // Default to "Tax Free" (0% tax) if nothing selected
            if ($taxIds->isEmpty()) {
                $taxFree = \App\Models\Tax::where('name', 'Tax Free')->first();
                if ($taxFree) {
                    $taxIds = collect([$taxFree->id]);
                }
            }

            $validated['tax_id'] = $taxIds->first();

            if ($request->hasFile('image')) {
                $validated['image_path'] = $request->file('image')->store('product-images', 'public');
            }

            $product = Product::create($validated);

            $product->taxes()->sync($taxIds->all());

            foreach ($validated['product_units'] as $unitData) {
                $product->product_units()->create($unitData);
            }
        });

        return redirect()->back()->with('success', 'Medicine created successfully.');
    }

    public function edit($locale, $product)
    {
        $productModel = Product::with(['category', 'taxes', 'product_units.unit'])->findOrFail($product);

        return Inertia::render('Products/Edit', [
            'product' => $productModel,
            'categories' => Category::all(),
            'taxes' => Tax::where('status', true)->get(),
            'units' => Unit::all(),
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'tax_id' => 'nullable|exists:taxes,id',
            'tax_ids' => 'nullable|array',
            'tax_ids.*' => 'exists:taxes,id',
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
            'product_units' => 'required|array|min:1',
            'product_units.*.unit_id' => 'required|exists:units,id',
            'product_units.*.conversion_factor' => 'required|numeric|min:1',
            'product_units.*.selling_price' => 'required|numeric|min:0',
            'product_units.*.is_base_unit' => 'required|boolean',
        ]);

        DB::transaction(function () use ($request, $validated, $product) {
            $taxIds = collect($validated['tax_ids'] ?? [])
                ->filter()
                ->values();

            if ($taxIds->isEmpty() && !empty($validated['tax_id'])) {
                $taxIds = collect([$validated['tax_id']]);
            }

            // Default to "Tax Free" (0% tax) if nothing selected
            if ($taxIds->isEmpty()) {
                $taxFree = \App\Models\Tax::where('name', 'Tax Free')->first();
                if ($taxFree) {
                    $taxIds = collect([$taxFree->id]);
                }
            }

            $validated['tax_id'] = $taxIds->first();

            if ($request->hasFile('image')) {
                if ($product->image_path) {
                    Storage::disk('public')->delete($product->image_path);
                }
                $validated['image_path'] = $request->file('image')->store('product-images', 'public');
            }

            $product->update($validated);

            $product->taxes()->sync($taxIds->all());

            // Update product units
            $product->product_units()->delete();
            foreach ($validated['product_units'] as $unitData) {
                $product->product_units()->create($unitData);
            }
        });

        return redirect()->back()->with('success', 'Medicine updated successfully.');
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

    public function printLabels(Request $request)
    {
        $itemsData = json_decode($request->get('items', '[]'), true);
        if (empty($itemsData)) {
            return "No items selected for printing.";
        }

        $productIds = collect($itemsData)->pluck('id')->all();
        $products = Product::with(['product_units.unit', 'batches' => function($q) {
            $q->where('quantity', '>', 0)->orderBy('expiry_date', 'asc');
        }])->whereIn('id', $productIds)->get()->keyBy('id');

        $labelSettings = [
            'width' => (int) \App\Models\Setting::get('label.width', '40'),
            'height' => (int) \App\Models\Setting::get('label.height', '30'),
            'per_row' => (int) \App\Models\Setting::get('label.per_row', '1'),
            'show_pharmacy' => \App\Models\Setting::get('label.show_pharmacy', '1') === '1',
            'show_product' => \App\Models\Setting::get('label.show_product', '1') === '1',
            'show_generic' => \App\Models\Setting::get('label.show_generic', '0') === '1',
            'show_price' => \App\Models\Setting::get('label.show_price', '1') === '1',
            'show_expiry' => \App\Models\Setting::get('label.show_expiry', '1') === '1',
            'show_batch' => \App\Models\Setting::get('label.show_batch', '0') === '1',
            'font_size' => (int) \App\Models\Setting::get('label.font_size', '8'),
            'barcode_height' => (int) \App\Models\Setting::get('label.barcode_height', '10'),
            'symbology' => \App\Models\Setting::get('label.symbology', 'CODE_128'),
            'pharmacy_name' => \App\Models\Setting::get('invoice.pharmacy_name', config('app.name')),
            'currency' => \App\Models\Setting::get('app.currency_symbol', '$'),
        ];

        $generator = new \Picqer\Barcode\BarcodeGeneratorSVG();
        $barcodeType = match($labelSettings['symbology']) {
            'EAN_13' => $generator::TYPE_EAN_13,
            'QR_CODE' => 'QR',
            default => $generator::TYPE_CODE_128,
        };

        $labels = [];
        foreach ($itemsData as $item) {
            $product = $products->get($item['id']);
            if (!$product) continue;

            $baseUnit = $product->product_units->where('is_base_unit', true)->first();
            $price = $baseUnit ? $baseUnit->selling_price : 0;

            // Get the earliest expiry date from active batches
            $earliestBatch = $product->batches->first();
            $expiryDate = $earliestBatch ? $earliestBatch->expiry_date->format('d/m/y') : 'N/A';
            $batchNumber = $earliestBatch ? $earliestBatch->batch_number : 'N/A';

            // Generate barcode SVG
            $barcodeSvg = '';
            if ($product->barcode) {
                try {
                    $barcodeSvg = $generator->getBarcode($product->barcode, $barcodeType, 1, $labelSettings['barcode_height']);
                } catch (\Exception $e) {
                    $barcodeSvg = 'Invalid Barcode';
                }
            }

            for ($i = 0; $i < $item['quantity']; $i++) {
                $labels[] = [
                    'product' => $product,
                    'price' => $price,
                    'barcode_svg' => $barcodeSvg,
                    'expiry_date' => $expiryDate,
                    'batch_number' => $batchNumber,
                ];
            }
        }

        return view('print.labels', [
            'labels' => $labels,
            'settings' => $labelSettings
        ]);
    }
}
