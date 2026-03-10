<?php

namespace App\Http\Controllers;

use App\Models\Branch;
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
        $query = Purchase::with(['supplier:id,name', 'branch:id,name'])
            ->withCount('items');

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
            'products' => Product::select('id', 'name')
                ->with([
                    'product_units' => function ($unitQuery) {
                        $unitQuery->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'is_base_unit')
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
            'items.*.batch_number' => 'required|string|max:255',
            'items.*.expiry_date' => 'required|date|after:today',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0.01|max:999999999999.99',
            'items.*.selling_price' => 'required|numeric|min:0.01|max:999999999999.99',
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

            $baseQuantity = (int) $item['quantity'] * $conversionFactor;
            $lineTotal = (float) $item['quantity'] * (float) $item['unit_price'];

            $preparedItems[] = array_merge($item, [
                'conversion_factor' => $conversionFactor,
                'base_quantity' => $baseQuantity,
                'base_unit_price' => (float) $item['unit_price'] / $conversionFactor,
                'base_selling_price' => (float) $item['selling_price'] / $conversionFactor,
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
                    'base_quantity' => $item['base_quantity'],
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
                    $batch->update([
                        'quantity' => $batch->quantity + $item['base_quantity'],
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
            }

            $supplier->update([
                'balance' => (float) $supplier->balance + $dueAmount,
            ]);
        });

        return redirect()->back()->with('success', 'Purchase order created and stock received successfully.');
    }
}
