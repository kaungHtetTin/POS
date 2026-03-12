<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PosController extends Controller
{
    public function index()
    {
        return Inertia::render('POS/Index', [
            'paymentMethods' => ['Cash', 'Card', 'Mobile', 'Wallet'],
            'paymentStatuses' => ['Paid', 'Partial', 'Due'],
        ]);
    }

    public function products(Request $request)
    {
        $branchId = $request->user()->currentBranchId();
        $query = trim((string) $request->query('query', ''));

        if ($query === '') {
            return response()->json([]);
        }

        $products = Product::query()
            ->where('status', 'Active')
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('barcode', 'like', "%{$query}%")
                    ->orWhere('generic_name', 'like', "%{$query}%");
            })
            ->leftJoin('inventories', function ($join) use ($branchId) {
                $join->on('inventories.product_id', '=', 'products.id')
                    ->where('inventories.branch_id', '=', $branchId);
            })
            ->select([
                'products.id',
                'products.name',
                'products.barcode',
                'products.image_path',
                'products.tax_id',
                'products.tax_method',
                'inventories.quantity as stock_quantity',
            ])
            ->with([
                'tax:id,name,rate',
                'taxes:id,name,rate',
                'product_units' => function ($q) {
                    $q->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'is_base_unit')
                        ->with(['unit:id,name,short_name']);
                },
            ])
            ->orderBy('products.name')
            ->limit(25)
            ->get()
            ->map(function ($product) {
                $taxes = $product->taxes && $product->taxes->count() > 0
                    ? $product->taxes
                    : ($product->tax ? collect([$product->tax]) : collect());

                $totalTaxRate = (float) $taxes->sum(function ($tax) {
                    return (float) $tax->rate;
                });

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'barcode' => $product->barcode,
                    'image_path' => $product->image_path,
                    'tax_method' => $product->tax_method,
                    'taxes' => $taxes->map(function ($tax) {
                        return [
                            'id' => $tax->id,
                            'name' => $tax->name,
                            'rate' => (float) $tax->rate,
                        ];
                    })->values(),
                    'total_tax_rate' => $totalTaxRate,
                    'stock_quantity' => (int) ($product->stock_quantity ?? 0),
                    'units' => $product->product_units->map(function ($pu) {
                        return [
                            'id' => $pu->id,
                            'unit_id' => $pu->unit_id,
                            'name' => $pu->unit?->name,
                            'short_name' => $pu->unit?->short_name,
                            'conversion_factor' => (int) $pu->conversion_factor,
                            'selling_price' => (float) $pu->selling_price,
                            'is_base_unit' => (bool) $pu->is_base_unit,
                        ];
                    })->values(),
                ];
            });

        return response()->json($products);
    }

    public function categories(Request $request)
    {
        return response()->json(
            Category::select('id', 'name')
                ->orderBy('name')
                ->get()
        );
    }

    public function catalog(Request $request)
    {
        $branchId = $request->user()->currentBranchId();
        $categoryId = $request->query('category_id');
        $perPage = (int) $request->query('per_page', 60);
        $perPage = max(12, min($perPage, 120));

        $query = Product::query()
            ->where('status', 'Active')
            ->when($categoryId, function ($q) use ($categoryId) {
                $q->where('category_id', $categoryId);
            })
            ->leftJoin('inventories', function ($join) use ($branchId) {
                $join->on('inventories.product_id', '=', 'products.id')
                    ->where('inventories.branch_id', '=', $branchId);
            })
            ->select([
                'products.id',
                'products.name',
                'products.barcode',
                'products.image_path',
                'products.tax_id',
                'products.tax_method',
                'inventories.quantity as stock_quantity',
            ])
            ->with([
                'tax:id,name,rate',
                'taxes:id,name,rate',
                'product_units' => function ($q) {
                    $q->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'is_base_unit')
                        ->with(['unit:id,name,short_name']);
                },
            ])
            ->orderBy('products.name');

        $paginator = $query->paginate($perPage);

        $items = $paginator->getCollection()->map(function ($product) {
            $taxes = $product->taxes && $product->taxes->count() > 0
                ? $product->taxes
                : ($product->tax ? collect([$product->tax]) : collect());

            $totalTaxRate = (float) $taxes->sum(function ($tax) {
                return (float) $tax->rate;
            });

            return [
                'id' => $product->id,
                'name' => $product->name,
                'barcode' => $product->barcode,
                'image_path' => $product->image_path,
                'tax_method' => $product->tax_method,
                'taxes' => $taxes->map(function ($tax) {
                    return [
                        'id' => $tax->id,
                        'name' => $tax->name,
                        'rate' => (float) $tax->rate,
                    ];
                })->values(),
                'total_tax_rate' => $totalTaxRate,
                'stock_quantity' => (int) ($product->stock_quantity ?? 0),
                'units' => $product->product_units->map(function ($pu) {
                    return [
                        'id' => $pu->id,
                        'unit_id' => $pu->unit_id,
                        'name' => $pu->unit?->name,
                        'short_name' => $pu->unit?->short_name,
                        'conversion_factor' => (int) $pu->conversion_factor,
                        'selling_price' => (float) $pu->selling_price,
                        'is_base_unit' => (bool) $pu->is_base_unit,
                    ];
                })->values(),
            ];
        })->values();

        $paginator->setCollection($items);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function scan(Request $request)
    {
        $branchId = $request->user()->currentBranchId();
        $barcode = trim((string) $request->query('barcode', ''));

        if ($barcode === '') {
            return response()->json(null, 404);
        }

        $product = Product::query()
            ->where('status', 'Active')
            ->where('barcode', $barcode)
            ->leftJoin('inventories', function ($join) use ($branchId) {
                $join->on('inventories.product_id', '=', 'products.id')
                    ->where('inventories.branch_id', '=', $branchId);
            })
            ->select([
                'products.id',
                'products.name',
                'products.barcode',
                'products.image_path',
                'products.tax_id',
                'products.tax_method',
                'inventories.quantity as stock_quantity',
            ])
            ->with([
                'tax:id,name,rate',
                'taxes:id,name,rate',
                'product_units' => function ($q) {
                    $q->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'is_base_unit')
                        ->with(['unit:id,name,short_name']);
                },
            ])
            ->first();

        if (!$product) {
            return response()->json(null, 404);
        }

        $taxes = $product->taxes && $product->taxes->count() > 0
            ? $product->taxes
            : ($product->tax ? collect([$product->tax]) : collect());

        $totalTaxRate = (float) $taxes->sum(function ($tax) {
            return (float) $tax->rate;
        });

        return response()->json([
            'id' => $product->id,
            'name' => $product->name,
            'barcode' => $product->barcode,
            'image_path' => $product->image_path,
            'tax_method' => $product->tax_method,
            'taxes' => $taxes->map(function ($tax) {
                return [
                    'id' => $tax->id,
                    'name' => $tax->name,
                    'rate' => (float) $tax->rate,
                ];
            })->values(),
            'total_tax_rate' => $totalTaxRate,
            'stock_quantity' => (int) ($product->stock_quantity ?? 0),
            'units' => $product->product_units->map(function ($pu) {
                return [
                    'id' => $pu->id,
                    'unit_id' => $pu->unit_id,
                    'name' => $pu->unit?->name,
                    'short_name' => $pu->unit?->short_name,
                    'conversion_factor' => (int) $pu->conversion_factor,
                    'selling_price' => (float) $pu->selling_price,
                    'is_base_unit' => (bool) $pu->is_base_unit,
                ];
            })->values(),
        ]);
    }

    public function checkout(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'discount' => 'nullable|numeric|min:0|max:999999999999.99',
            'payment_method' => 'required|in:Cash,Card,Mobile,Wallet',
            'payment_status' => 'required|in:Paid,Partial,Due',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.unit_id' => 'required|exists:units,id',
            'items.*.quantity' => 'required|numeric|min:0.01|max:999999.99',
        ]);

        $branchId = $request->user()->currentBranchId();
        $userId = $request->user()->id;
        $discount = (float) ($validated['discount'] ?? 0);

        $items = collect($validated['items'])->map(function ($item) {
            $item['quantity'] = (float) $item['quantity'];
            return $item;
        });

        $productIds = $items->pluck('product_id')->unique()->values();
        $products = Product::whereIn('id', $productIds)
            ->with(['tax:id,rate', 'taxes:id,rate', 'product_units:product_id,unit_id,conversion_factor,selling_price,is_base_unit'])
            ->get()
            ->keyBy('id');

        $lineComputations = [];
        $totalAmount = 0.0;
        $taxAmount = 0.0;

        foreach ($items as $index => $item) {
            $product = $products->get($item['product_id']);

            if (!$product) {
                return redirect()->back()->withErrors([
                    "items.$index.product_id" => 'Invalid product.',
                ]);
            }

            $productUnit = $product->product_units->firstWhere('unit_id', $item['unit_id']);

            if (!$productUnit) {
                return redirect()->back()->withErrors([
                    "items.$index.unit_id" => 'Selected unit does not belong to the selected product.',
                ]);
            }

            $conversionFactor = (int) $productUnit->conversion_factor;
            if ($conversionFactor < 1) {
                return redirect()->back()->withErrors([
                    "items.$index.unit_id" => 'Invalid conversion factor for selected product unit.',
                ]);
            }

            $rawBaseQuantity = $item['quantity'] * $conversionFactor;
            $baseQuantity = (int) round($rawBaseQuantity);

            if (abs($rawBaseQuantity - $baseQuantity) > 0.0001) {
                return redirect()->back()->withErrors([
                    "items.$index.quantity" => 'Quantity is not compatible with selected unit conversion.',
                ]);
            }

            $unitPrice = (float) $productUnit->selling_price;
            $taxes = $product->taxes && $product->taxes->count() > 0
                ? $product->taxes
                : ($product->tax ? collect([$product->tax]) : collect());

            $rate = (float) $taxes->sum(function ($tax) {
                return (float) $tax->rate;
            });
            $taxMethod = (string) $product->tax_method;

            $lineTotal = $item['quantity'] * $unitPrice;

            if ($taxMethod === 'Inclusive' && $rate > 0) {
                $preTax = $lineTotal / (1 + ($rate / 100));
                $lineTax = $lineTotal - $preTax;
                $totalAmount += $preTax;
                $taxAmount += $lineTax;
            } else {
                $preTax = $lineTotal;
                $lineTax = $preTax * ($rate / 100);
                $totalAmount += $preTax;
                $taxAmount += $lineTax;
                $lineTotal = $preTax + $lineTax;
            }

            $lineComputations[] = [
                'product_id' => $product->id,
                'unit_id' => $productUnit->unit_id,
                'conversion_factor' => $conversionFactor,
                'unit_price' => $unitPrice,
                'quantity' => $item['quantity'],
                'base_quantity' => $baseQuantity,
            ];
        }

        $grandTotal = max(($totalAmount + $taxAmount) - $discount, 0);

        DB::transaction(function () use ($validated, $branchId, $userId, $lineComputations, $totalAmount, $taxAmount, $discount, $grandTotal) {
            $sale = Sale::create([
                'branch_id' => $branchId,
                'user_id' => $userId,
                'customer_id' => $validated['customer_id'] ?? null,
                'invoice_number' => $this->generateInvoiceNumber(),
                'total_amount' => $totalAmount,
                'discount' => $discount,
                'tax' => $taxAmount,
                'grand_total' => $grandTotal,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $validated['payment_status'],
                'sale_date' => now(),
                'is_synced' => false,
            ]);

            foreach ($lineComputations as $line) {
                $baseToDeduct = (int) $line['base_quantity'];

                $batches = InventoryBatch::where('branch_id', $branchId)
                    ->where('product_id', $line['product_id'])
                    ->where('quantity', '>', 0)
                    ->whereDate('expiry_date', '>=', now()->toDateString())
                    ->orderBy('expiry_date')
                    ->lockForUpdate()
                    ->get();

                $available = (int) $batches->sum('quantity');

                if ($available < $baseToDeduct) {
                    throw new \RuntimeException('Insufficient stock for selected product.');
                }

                $remaining = $baseToDeduct;

                foreach ($batches as $batch) {
                    if ($remaining <= 0) {
                        break;
                    }

                    $deduct = min($remaining, (int) $batch->quantity);

                    $batch->update([
                        'quantity' => (int) $batch->quantity - $deduct,
                    ]);

                    $quantityInUnit = $deduct / (int) $line['conversion_factor'];
                    $totalPrice = $quantityInUnit * (float) $line['unit_price'];

                    $sale->items()->create([
                        'product_id' => $line['product_id'],
                        'batch_id' => $batch->id,
                        'unit_id' => $line['unit_id'],
                        'quantity' => $quantityInUnit,
                        'base_quantity' => $deduct,
                        'unit_price' => $line['unit_price'],
                        'total_price' => $totalPrice,
                        'created_at' => now(),
                    ]);

                    $remaining -= $deduct;
                }

                $inventory = Inventory::firstOrCreate(
                    ['branch_id' => $branchId, 'product_id' => $line['product_id']],
                    ['quantity' => 0]
                );

                $inventory->update([
                    'quantity' => max(0, (int) $inventory->quantity - $baseToDeduct),
                ]);
            }
        });

        return redirect()->back()->with('success', 'Sale completed successfully.');
    }

    protected function generateInvoiceNumber(): string
    {
        do {
            $candidate = sprintf(
                'S%s-%s',
                now()->format('Ymd'),
                strtoupper(bin2hex(random_bytes(4)))
            );
        } while (Sale::where('invoice_number', $candidate)->exists());

        return $candidate;
    }

    /**
     * Search customers for POS autocomplete (JSON).
     */
    public function customers(Request $request)
    {
        $query = trim((string) $request->query('query', ''));
        $limit = min(25, max(5, (int) $request->query('limit', 15)));

        $customers = Customer::query()
            ->when($query !== '', function ($q) use ($query) {
                $q->where(function ($q) use ($query) {
                    $q->where('name', 'like', "%{$query}%")
                        ->orWhere('phone', 'like', "%{$query}%")
                        ->orWhere('email', 'like', "%{$query}%");
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'phone', 'email', 'address']);

        return response()->json($customers);
    }

    /**
     * Quick-create a customer from POS (JSON).
     */
    public function storeCustomer(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        $customer = Customer::create($validated);

        return response()->json([
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'address' => $customer->address,
        ]);
    }
}
