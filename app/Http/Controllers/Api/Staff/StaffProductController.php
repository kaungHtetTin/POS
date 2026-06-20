<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Category;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Tax;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class StaffProductController extends Controller
{
    public function index(Request $request)
    {
        if (!$this->canManageInventory($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'status' => ['nullable', 'in:Active,Inactive,all'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Product::query()
            ->with(['category:id,name', 'taxes:id,name,rate', 'product_units.unit:id,name,short_name']);

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('generic_name', 'like', "%{$search}%")
                    ->orWhere('brand_name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (($validated['status'] ?? null) !== 'all') {
            $query->where('status', $validated['status'] ?? 'Active');
        }

        $products = $query
            ->orderBy('name')
            ->paginate($validated['per_page'] ?? 50)
            ->through(function (Product $product) {
                return $this->productPayload($product);
            });

        return response()->json($products);
    }

    public function lookupData(Request $request)
    {
        if (!$this->canManageInventory($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
            'taxes' => Tax::select('id', 'name', 'rate')
                ->whereIn('status', [1, '1', true, 'Active', 'active'])
                ->orderBy('name')
                ->get(),
            'units' => Unit::select('id', 'name', 'short_name')->orderBy('name')->get(),
            'default_tax_id' => Setting::get('invoice.default_tax_id', ''),
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->canManageInventory($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $this->validateProduct($request);

        $product = DB::transaction(function () use ($request, $validated) {
            $taxIds = $this->taxIdsFrom($validated);
            $payload = $this->productAttributes($validated);
            $payload['tax_id'] = $taxIds->first();

            if ($request->hasFile('image')) {
                $payload['image_path'] = $request->file('image')->store('product-images', 'public');
            }

            $product = Product::create($payload);
            $product->taxes()->sync($taxIds->all());

            foreach ($validated['product_units'] as $unitData) {
                $unitData['wholesale_price'] = $unitData['wholesale_price'] ?? $unitData['selling_price'];
                $product->product_units()->create($unitData);
            }

            return $product;
        });

        $product->load(['category:id,name', 'taxes:id,name,rate', 'product_units.unit:id,name,short_name']);

        return response()->json([
            'message' => 'Product created successfully.',
            'product' => $this->productPayload($product),
        ], 201);
    }

    public function show(Request $request, Product $product)
    {
        if (!$this->canManageInventory($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $product->load(['category:id,name', 'taxes:id,name,rate', 'product_units.unit:id,name,short_name']);

        return response()->json($this->productPayload($product));
    }

    public function update(Request $request, Product $product)
    {
        if (!$this->canManageInventory($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $this->validateProduct($request, $product);

        DB::transaction(function () use ($request, $validated, $product) {
            $taxIds = $this->taxIdsFrom($validated);
            $payload = $this->productAttributes($validated);
            $payload['tax_id'] = $taxIds->first();

            if ($request->hasFile('image')) {
                if ($product->image_path) {
                    Storage::disk('public')->delete($product->image_path);
                }

                $payload['image_path'] = $request->file('image')->store('product-images', 'public');
            }

            $product->update($payload);
            $product->taxes()->sync($taxIds->all());
            $product->product_units()->delete();

            foreach ($validated['product_units'] as $unitData) {
                $unitData['wholesale_price'] = $unitData['wholesale_price'] ?? $unitData['selling_price'];
                $product->product_units()->create($unitData);
            }
        });

        $product->refresh()->load(['category:id,name', 'taxes:id,name,rate', 'product_units.unit:id,name,short_name']);

        return response()->json([
            'message' => 'Product updated successfully.',
            'product' => $this->productPayload($product),
        ]);
    }

    public function destroy(Request $request, Product $product)
    {
        if (!$this->canManageInventory($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($product->batches()->exists()) {
            return response()->json([
                'message' => 'Product cannot be deleted because it has inventory batches.',
            ], 422);
        }

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully.',
        ]);
    }

    public function stock(Request $request)
    {
        if (!$this->canManageInventory($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'],
            'search' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'product_status' => ['nullable', 'in:Active,Inactive,all'],
            'stock_status' => ['nullable', 'in:In Stock,Low Stock,Out of Stock'],
            'include_batches' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $branch = Branch::select('id', 'name', 'address', 'phone')->findOrFail($validated['branch_id']);
        $branchId = $branch->id;

        $query = Product::query()
            ->select('id', 'name', 'generic_name', 'barcode', 'category_id', 'min_stock_level', 'status')
            ->with(['category:id,name'])
            ->withSum(['inventories' => function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            }], 'quantity');

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('generic_name', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (($validated['product_status'] ?? null) !== 'all') {
            $query->where('status', $validated['product_status'] ?? 'Active');
        }

        $products = $query
            ->orderBy('name')
            ->paginate($validated['per_page'] ?? 50)
            ->through(function (Product $product) use ($branchId, $validated) {
                $stock = (int) ($product->inventories_sum_quantity ?? 0);
                $stockStatus = $this->stockStatus($stock, (int) $product->min_stock_level);
                $payload = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'generic_name' => $product->generic_name,
                    'barcode' => $product->barcode,
                    'category' => $product->category ? [
                        'id' => $product->category->id,
                        'name' => $product->category->name,
                    ] : null,
                    'min_stock_level' => (int) $product->min_stock_level,
                    'current_stock' => $stock,
                    'product_status' => $product->status,
                    'stock_status' => $stockStatus,
                ];

                if (!empty($validated['include_batches'])) {
                    $payload['batches'] = InventoryBatch::query()
                        ->select('id', 'batch_number', 'expiry_date', 'quantity', 'purchase_price', 'selling_price')
                        ->where('branch_id', $branchId)
                        ->where('product_id', $product->id)
                        ->where('quantity', '>', 0)
                        ->orderBy('expiry_date')
                        ->get();
                }

                return $payload;
            });

        if (!empty($validated['stock_status'])) {
            $filtered = collect($products->items())
                ->filter(function ($product) use ($validated) {
                    return $product['stock_status'] === $validated['stock_status'];
                })
                ->values();

            $products->setCollection($filtered);
        }

        return response()->json([
            'branch' => $branch,
            'stock' => $products,
        ]);
    }

    public function inventoryBatches(Request $request, Product $product)
    {
        if (!$this->canManageInventory($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'branch_id' => ['nullable', 'exists:branches,id'],
        ]);

        $branchId = $validated['branch_id'] ?? null;
        $product->load(['category:id,name']);

        $batches = InventoryBatch::query()
            ->select('id', 'branch_id', 'product_id', 'batch_number', 'expiry_date', 'quantity', 'purchase_price', 'selling_price')
            ->with(['branch:id,name,address,phone'])
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
                        'address' => $branch->address,
                        'phone' => $branch->phone,
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

        return response()->json([
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'generic_name' => $product->generic_name,
                'barcode' => $product->barcode,
                'category' => $product->category ? [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                ] : null,
                'min_stock_level' => (int) $product->min_stock_level,
                'status' => $product->status,
            ],
            'summary' => [
                'batch_quantity' => $batchQuantity,
                'aggregate_quantity' => $aggregateQuantity,
                'quantity_difference' => $aggregateQuantity - $batchQuantity,
                'stock_status' => $this->stockStatus($aggregateQuantity, (int) $product->min_stock_level),
            ],
            'branch_groups' => $branchGroups,
        ]);
    }

    private function validateProduct(Request $request, ?Product $product = null): array
    {
        return $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'tax_id' => ['nullable', 'exists:taxes,id'],
            'tax_ids' => ['nullable', 'array'],
            'tax_ids.*' => ['exists:taxes,id'],
            'name' => ['required', 'string', 'max:255'],
            'generic_name' => ['nullable', 'string', 'max:255'],
            'brand_name' => ['nullable', 'string', 'max:255'],
            'manufacturer' => ['nullable', 'string', 'max:255'],
            'strength' => ['nullable', 'string', 'max:100'],
            'barcode' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('products', 'barcode')->ignore($product?->id),
            ],
            'description' => ['nullable', 'string'],
            'min_stock_level' => ['nullable', 'integer', 'min:0'],
            'discount_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_method' => ['required', 'in:Exclusive,Inclusive'],
            'status' => ['required', 'in:Active,Inactive'],
            'image' => ['nullable', 'image', 'max:2048'],
            'product_units' => ['required', 'array', 'min:1'],
            'product_units.*.unit_id' => ['required', 'exists:units,id'],
            'product_units.*.conversion_factor' => ['required', 'numeric', 'min:1'],
            'product_units.*.selling_price' => ['required', 'numeric', 'min:0'],
            'product_units.*.wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'product_units.*.is_base_unit' => ['required', 'boolean'],
        ]);
    }

    private function productAttributes(array $validated): array
    {
        return [
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'generic_name' => $validated['generic_name'] ?? null,
            'brand_name' => $validated['brand_name'] ?? null,
            'manufacturer' => $validated['manufacturer'] ?? null,
            'strength' => $validated['strength'] ?? null,
            'barcode' => $validated['barcode'] ?? null,
            'description' => $validated['description'] ?? null,
            'min_stock_level' => $validated['min_stock_level'] ?? 0,
            'discount_percentage' => (float) ($validated['discount_percentage'] ?? 0),
            'tax_method' => $validated['tax_method'],
            'status' => $validated['status'],
        ];
    }

    private function taxIdsFrom(array $validated)
    {
        $taxIds = collect($validated['tax_ids'] ?? [])
            ->filter()
            ->values();

        if ($taxIds->isEmpty() && !empty($validated['tax_id'])) {
            $taxIds = collect([$validated['tax_id']]);
        }

        if ($taxIds->isEmpty()) {
            $taxFree = Tax::where('name', 'Tax Free')->first();
            if ($taxFree) {
                $taxIds = collect([$taxFree->id]);
            }
        }

        if ($taxIds->isEmpty()) {
            throw ValidationException::withMessages([
                'tax_id' => 'A tax is required when no Tax Free default tax exists.',
            ]);
        }

        return $taxIds;
    }

    private function productPayload(Product $product): array
    {
        return [
            'id' => $product->id,
            'category_id' => $product->category_id,
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
            ] : null,
            'tax_id' => $product->tax_id,
            'tax_ids' => $product->taxes->pluck('id')->values(),
            'taxes' => $product->taxes->map(function ($tax) {
                return [
                    'id' => $tax->id,
                    'name' => $tax->name,
                    'rate' => $tax->rate,
                ];
            })->values(),
            'name' => $product->name,
            'generic_name' => $product->generic_name,
            'brand_name' => $product->brand_name,
            'manufacturer' => $product->manufacturer,
            'strength' => $product->strength,
            'barcode' => $product->barcode,
            'description' => $product->description,
            'min_stock_level' => (int) $product->min_stock_level,
            'discount_percentage' => (float) ($product->discount_percentage ?? 0),
            'tax_method' => $product->tax_method,
            'status' => $product->status,
            'image_url' => $product->image_path ? url('storage/' . $product->image_path) : null,
            'units' => $product->product_units->map(function ($productUnit) {
                return [
                    'id' => $productUnit->id,
                    'unit_id' => $productUnit->unit_id,
                    'unit_name' => $productUnit->unit->name ?? '',
                    'unit_short_name' => $productUnit->unit->short_name ?? '',
                    'conversion_factor' => (int) $productUnit->conversion_factor,
                    'selling_price' => $productUnit->selling_price,
                    'wholesale_price' => $productUnit->wholesale_price ?? $productUnit->selling_price,
                    'is_base_unit' => (bool) $productUnit->is_base_unit,
                ];
            })->values(),
        ];
    }

    private function stockStatus(int $stock, int $minStockLevel): string
    {
        if ($stock <= 0) {
            return 'Out of Stock';
        }

        return $stock < $minStockLevel ? 'Low Stock' : 'In Stock';
    }

    private function canManageInventory(Request $request): bool
    {
        return $request->user()->hasPermission('manage_inventory');
    }
}
