<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Category;
use App\Models\CashSession;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PosController extends Controller
{
    public function index()
    {
        $branchId = request()->user()->currentBranchId();
        $userId = request()->user()->id;
        $activeSession = $this->getActiveSession($branchId, $userId);

        return Inertia::render('POS/Index', [
            'paymentMethods' => ['Cash', 'Card', 'Mobile', 'Wallet'],
            'paymentStatuses' => ['Paid', 'Partial', 'Due'],
            'posDefaults' => [
                'default_view' => Setting::get('pos.default_view', 'table'),
                'default_payment_method' => Setting::get('pos.default_payment_method', 'Cash'),
                'auto_print_receipt' => Setting::get('pos.auto_print_receipt', '0') === '1',
                'barcode_focus' => Setting::get('pos.barcode_focus', '1') === '1',
                'show_generic_first' => Setting::get('pos.show_generic_first', '0') === '1',
                'receipt_width' => (int) Setting::get('pos.receipt_width', '80'),
                'silent_print' => Setting::get('pos.silent_print', '0') === '1',
                'silent_printer_name' => Setting::get('pos.silent_printer_name', ''),
            ],
            'activeSession' => $activeSession ? $this->buildSessionPayload($activeSession) : null,
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
                'products.generic_name',
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
                    'generic_name' => $product->generic_name,
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
                'products.generic_name',
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
                'generic_name' => $product->generic_name,
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
                'products.generic_name',
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
            'generic_name' => $product->generic_name,
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
            'amount_received' => 'nullable|numeric|min:0|max:999999999999.99',
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
        $activeSession = $this->getActiveSession($branchId, $userId);

        if (!$activeSession) {
            return redirect()->back()->withErrors([
                'session' => 'Open a cashier session before completing a sale.',
            ]);
        }

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
        $amountReceived = 0.0;
        $changeDue = 0.0;
        if ($validated['payment_method'] === 'Cash') {
            $amountReceived = max((float) ($validated['amount_received'] ?? 0), 0);
            if ($validated['payment_status'] === 'Paid' && $amountReceived < $grandTotal) {
                return redirect()->back()->withErrors([
                    'amount_received' => 'Cash received must be at least equal to the grand total for paid cash sales.',
                ]);
            }
            $changeDue = max($amountReceived - $grandTotal, 0);
        }

        $createdSale = null;
        DB::transaction(function () use ($validated, $branchId, $userId, $lineComputations, $totalAmount, $taxAmount, $discount, $grandTotal, $amountReceived, $changeDue, $activeSession, &$createdSale) {
            $sale = Sale::create([
                'branch_id' => $branchId,
                'user_id' => $userId,
                'customer_id' => $validated['customer_id'] ?? null,
                'cash_session_id' => $activeSession->id,
                'invoice_number' => $this->generateInvoiceNumber(),
                'total_amount' => $totalAmount,
                'discount' => $discount,
                'tax' => $taxAmount,
                'grand_total' => $grandTotal,
                'amount_received' => $amountReceived,
                'change_due' => $changeDue,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $validated['payment_status'],
                'sale_date' => now(),
                'is_synced' => false,
            ]);

            $createdSale = $sale;

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

        $customerName = null;
        if (!empty($validated['customer_id'])) {
            $customerName = Customer::where('id', $validated['customer_id'])->value('name');
        }

        $receiptItems = collect($lineComputations)->map(function ($line) use ($products) {
            $product = $products->get($line['product_id']);
            return [
                'name' => $product?->name ?? 'Item',
                'quantity' => (float) $line['quantity'],
                'unit_price' => (float) $line['unit_price'],
                'total_price' => (float) $line['quantity'] * (float) $line['unit_price'],
            ];
        })->values();

        $saleReceipt = [
            'invoice_number' => $createdSale?->invoice_number,
            'sale_date' => optional($createdSale?->sale_date)->toDateTimeString(),
            'customer_name' => $customerName,
            'payment_method' => $validated['payment_method'],
            'payment_status' => $validated['payment_status'],
            'subtotal' => (float) $totalAmount,
            'tax' => (float) $taxAmount,
            'discount' => (float) $discount,
            'grand_total' => (float) $grandTotal,
            'amount_received' => (float) $amountReceived,
            'change_due' => (float) $changeDue,
            'items' => $receiptItems,
        ];

        return redirect()
            ->route('pos.index', ['locale' => app()->getLocale()])
            ->with('success', 'Sale completed successfully.')
            ->with('sale_receipt', $saleReceipt);
    }

    public function openSession(Request $request)
    {
        $validated = $request->validate([
            'opening_amount' => 'required|numeric|min:0|max:999999999999.99',
        ]);

        $branchId = $request->user()->currentBranchId();
        $userId = $request->user()->id;

        $existing = $this->getActiveSession($branchId, $userId);
        if ($existing) {
            return redirect()
                ->route('pos.index', ['locale' => app()->getLocale()])
                ->withErrors(['session' => 'You already have an open cashier session.']);
        }

        $openingAmount = (float) $validated['opening_amount'];
        CashSession::create([
            'branch_id' => $branchId,
            'user_id' => $userId,
            'opening_amount' => $openingAmount,
            'cash_received_total' => 0,
            'change_given_total' => 0,
            'net_cash_sales' => 0,
            'expected_amount' => $openingAmount,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        return redirect()
            ->route('pos.index', ['locale' => app()->getLocale()])
            ->with('success', 'Cashier session started.');
    }

    public function closeSession(Request $request)
    {
        $validated = $request->validate([
            'closing_counted_amount' => 'required|numeric|min:0|max:999999999999.99',
            'notes' => 'nullable|string|max:2000',
        ]);

        $branchId = $request->user()->currentBranchId();
        $userId = $request->user()->id;
        $activeSession = $this->getActiveSession($branchId, $userId);

        if (!$activeSession) {
            return redirect()
                ->route('pos.index', ['locale' => app()->getLocale()])
                ->withErrors(['session' => 'No open cashier session to close.']);
        }

        $totals = $this->getSessionCashTotals($activeSession);
        $expectedAmount = (float) $activeSession->opening_amount + (float) $totals['net_cash_sales'];
        $countedAmount = (float) $validated['closing_counted_amount'];
        $difference = $countedAmount - $expectedAmount;

        $activeSession->update([
            'cash_received_total' => $totals['cash_received_total'],
            'change_given_total' => $totals['change_given_total'],
            'net_cash_sales' => $totals['net_cash_sales'],
            'expected_amount' => $expectedAmount,
            'closing_counted_amount' => $countedAmount,
            'difference' => $difference,
            'notes' => $validated['notes'] ?? null,
            'closed_by_user_id' => $userId,
            'closed_at' => now(),
            'status' => 'closed',
        ]);

        $statusText = $difference === 0.0 ? 'balanced' : ($difference > 0 ? 'over' : 'short');

        return redirect()
            ->route('pos.index', ['locale' => app()->getLocale()])
            ->with('success', "Cashier session closed ({$statusText}).");
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

    protected function getActiveSession(string $branchId, string $userId): ?CashSession
    {
        return CashSession::query()
            ->where('branch_id', $branchId)
            ->where('user_id', $userId)
            ->where('status', 'open')
            ->whereNull('closed_at')
            ->latest('opened_at')
            ->first();
    }

    protected function getSessionCashTotals(CashSession $session): array
    {
        $totals = Sale::query()
            ->where('cash_session_id', $session->id)
            ->where('payment_method', 'Cash')
            ->selectRaw('COALESCE(SUM(amount_received), 0) as cash_received_total')
            ->selectRaw('COALESCE(SUM(change_due), 0) as change_given_total')
            ->first();

        $cashReceivedTotal = (float) ($totals?->cash_received_total ?? 0);
        $changeGivenTotal = (float) ($totals?->change_given_total ?? 0);

        return [
            'cash_received_total' => $cashReceivedTotal,
            'change_given_total' => $changeGivenTotal,
            'net_cash_sales' => $cashReceivedTotal - $changeGivenTotal,
        ];
    }

    protected function buildSessionPayload(CashSession $session): array
    {
        $totals = $this->getSessionCashTotals($session);
        $expectedAmount = (float) $session->opening_amount + (float) $totals['net_cash_sales'];
        $countedAmount = $session->closing_counted_amount !== null ? (float) $session->closing_counted_amount : null;

        return [
            'id' => $session->id,
            'status' => $session->status,
            'opening_amount' => (float) $session->opening_amount,
            'opened_at' => optional($session->opened_at)->toDateTimeString(),
            'closed_at' => optional($session->closed_at)->toDateTimeString(),
            'cash_received_total' => (float) $totals['cash_received_total'],
            'change_given_total' => (float) $totals['change_given_total'],
            'net_cash_sales' => (float) $totals['net_cash_sales'],
            'expected_amount' => (float) $expectedAmount,
            'closing_counted_amount' => $countedAmount,
            'difference' => $countedAmount !== null ? $countedAmount - $expectedAmount : null,
            'notes' => $session->notes,
        ];
    }
}
