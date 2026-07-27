<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\ReturnEntry;
use App\Models\ReturnItem;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReturnsController extends Controller
{
    protected function canAccessAllBranches($user): bool
    {
        return $user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches');
    }

    protected function accessibleBranchIds($user)
    {
        if ($this->canAccessAllBranches($user)) {
            return Branch::pluck('id');
        }

        $branchIds = collect([$user->branch_id, $user->active_branch_id])->filter()->values();

        try {
            $extraIds = $user->branches()->pluck('branches.id');
            $branchIds = $branchIds->merge($extraIds)->unique()->values();
        } catch (\Throwable $e) {
        }

        return $branchIds;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);

        $query = ReturnEntry::query()
            ->with([
                'branch:id,name',
                'items' => function ($q) {
                    $q->with(['product:id,name', 'unit:id,name,short_name']);
                },
            ])
            ->whereIn('branch_id', $accessibleBranchIds)
            ->when($request->filled('type'), function ($q) use ($request) {
                $q->where('type', $request->type);
            })
            ->when($request->filled('status'), function ($q) use ($request) {
                $q->where('status', $request->status);
            })
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id);
            });

        $returns = $query->latest()->paginate(15)->withQueryString();
        $returnRows = $returns->getCollection();

        $saleIds = $returnRows->where('type', 'Customer')->pluck('reference_id')->unique()->values();
        $purchaseIds = $returnRows->where('type', 'Supplier')->pluck('reference_id')->unique()->values();

        $sales = Sale::whereIn('id', $saleIds)->pluck('invoice_number', 'id');
        $purchases = Purchase::whereIn('id', $purchaseIds)->pluck('invoice_number', 'id');

        $returns->setCollection($returnRows->map(function ($r) use ($sales, $purchases) {
            $referenceNumber = null;
            if ($r->type === 'Customer') {
                $referenceNumber = $sales[$r->reference_id] ?? null;
            }
            if ($r->type === 'Supplier') {
                $referenceNumber = $purchases[$r->reference_id] ?? null;
            }

            $r->reference_number = $referenceNumber;
            return $r;
        }));

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        return Inertia::render('Returns/Index', [
            'returns' => $returns,
            'branches' => $branches,
            'filters' => $request->only(['type', 'status', 'branch_id']),
        ]);
    }

    public function lookupSale(Request $request)
    {
        $validated = $request->validate([
            'invoice_number' => 'required|string|max:255',
        ]);

        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);

        $sale = Sale::query()
            ->where('invoice_number', $validated['invoice_number'])
            ->whereIn('branch_id', $accessibleBranchIds)
            ->where('status', '!=', 'Voided')
            ->with([
                'branch:id,name',
                'items' => function ($q) {
                    $q->with(['product:id,name', 'unit:id,name,short_name', 'batch:id,batch_number,expiry_date']);
                },
            ])
            ->first();

        if (!$sale) {
            return response()->json(null, 404);
        }

        return response()->json([
            'id' => $sale->id,
            'invoice_number' => $sale->invoice_number,
            'branch_id' => $sale->branch_id,
            'branch_name' => $sale->branch?->name,
            'sale_date' => $sale->sale_date?->format('Y-m-d H:i:s'),
            'grand_total' => (float) $sale->grand_total,
            'items' => $sale->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product?->name,
                    'unit_id' => $item->unit_id,
                    'unit_name' => $item->unit?->short_name ?: $item->unit?->name,
                    'batch_id' => $item->batch_id,
                    'batch_number' => $item->batch?->batch_number,
                    'expiry_date' => $item->batch?->expiry_date?->format('Y-m-d'),
                    'quantity' => (float) $item->quantity,
                    'base_quantity' => (int) $item->base_quantity,
                    'unit_price' => (float) $item->unit_price,
                ];
            })->values(),
        ]);
    }

    public function lookupPurchase(Request $request)
    {
        $validated = $request->validate([
            'invoice_number' => 'required|string|max:255',
        ]);

        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);

        $purchase = Purchase::query()
            ->where('invoice_number', $validated['invoice_number'])
            ->whereIn('branch_id', $accessibleBranchIds)
            ->with([
                'branch:id,name',
                'items' => function ($q) {
                    $q->with(['product:id,name', 'unit:id,name,short_name']);
                },
            ])
            ->first();

        if (!$purchase) {
            return response()->json(null, 404);
        }

        return response()->json([
            'id' => $purchase->id,
            'invoice_number' => $purchase->invoice_number,
            'branch_id' => $purchase->branch_id,
            'branch_name' => $purchase->branch?->name,
            'purchase_date' => $purchase->purchase_date,
            'total_amount' => (float) $purchase->total_amount,
            'items' => $purchase->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product?->name,
                    'unit_id' => $item->unit_id,
                    'unit_name' => $item->unit?->short_name ?: $item->unit?->name,
                    'batch_number' => $item->batch_number,
                    'expiry_date' => $item->expiry_date?->format('Y-m-d'),
                    'quantity' => (int) $item->quantity,
                    'foc_quantity' => (int) ($item->foc_quantity ?? 0),
                    'received_quantity' => (int) $item->quantity + (int) ($item->foc_quantity ?? 0),
                    'base_quantity' => (int) $item->base_quantity,
                    'foc_base_quantity' => (int) ($item->foc_base_quantity ?? 0),
                    'unit_price' => (float) $item->unit_price,
                ];
            })->values(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:Customer,Supplier',
            'reference_id' => 'required|uuid',
            'reason' => 'required|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.reference_item_id' => 'required|uuid',
            'items.*.quantity' => 'required|numeric|min:0.01|max:999999.99',
            'items.*.refund_price' => 'required|numeric|min:0|max:999999999999.99',
        ]);

        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);

        if ($validated['type'] === 'Customer') {
            $sale = Sale::where('id', $validated['reference_id'])
                ->whereIn('branch_id', $accessibleBranchIds)
                ->where('status', '!=', 'Voided')
                ->firstOrFail();

            $referenceItems = SaleItem::where('sale_id', $sale->id)->get()->keyBy('id');

            $preparedItems = collect($validated['items'])->map(function ($item) use ($referenceItems) {
                $ref = $referenceItems->get($item['reference_item_id']);
                if (!$ref) {
                    abort(422);
                }

                $conversionFactor = (int) round(((int) $ref->base_quantity) / ((float) $ref->quantity ?: 1));
                if ($conversionFactor < 1) {
                    abort(422);
                }

                $rawBaseQuantity = (float) $item['quantity'] * $conversionFactor;
                $baseQuantity = (int) round($rawBaseQuantity);
                if (abs($rawBaseQuantity - $baseQuantity) > 0.0001) {
                    abort(422);
                }

                return [
                    'product_id' => $ref->product_id,
                    'batch_id' => $ref->batch_id,
                    'unit_id' => $ref->unit_id,
                    'quantity' => (float) $item['quantity'],
                    'base_quantity' => $baseQuantity,
                    'refund_price' => (float) $item['refund_price'],
                ];
            });

            $refundAmount = (float) $preparedItems->sum(function ($i) {
                return (float) $i['quantity'] * (float) $i['refund_price'];
            });

            DB::transaction(function () use ($sale, $validated, $preparedItems, $refundAmount) {
                $return = ReturnEntry::create([
                    'type' => 'Customer',
                    'reference_id' => $sale->id,
                    'branch_id' => $sale->branch_id,
                    'reason' => $validated['reason'],
                    'refund_amount' => $refundAmount,
                    'status' => 'Pending',
                ]);

                foreach ($preparedItems as $item) {
                    ReturnItem::create([
                        'return_id' => $return->id,
                        'product_id' => $item['product_id'],
                        'batch_id' => $item['batch_id'],
                        'unit_id' => $item['unit_id'],
                        'quantity' => $item['quantity'],
                        'base_quantity' => $item['base_quantity'],
                        'refund_price' => $item['refund_price'],
                        'created_at' => now(),
                    ]);
                }
            });

            return redirect()->back()->with('success', 'Return created.');
        }

        $purchase = Purchase::where('id', $validated['reference_id'])
            ->whereIn('branch_id', $accessibleBranchIds)
            ->firstOrFail();

        $referenceItems = PurchaseItem::where('purchase_id', $purchase->id)->get()->keyBy('id');
        $productUnitRows = DB::table('product_units')
            ->select('product_id', 'unit_id', 'conversion_factor')
            ->whereIn('product_id', $referenceItems->pluck('product_id')->unique()->values())
            ->whereIn('unit_id', $referenceItems->pluck('unit_id')->unique()->values())
            ->get();

        $preparedItems = collect($validated['items'])->map(function ($item) use ($referenceItems, $productUnitRows, $purchase) {
            $ref = $referenceItems->get($item['reference_item_id']);
            if (!$ref) {
                abort(422);
            }

            $productUnit = $productUnitRows->first(function ($row) use ($ref) {
                return $row->product_id === $ref->product_id && $row->unit_id === $ref->unit_id;
            });

            $conversionFactor = $productUnit
                ? (int) $productUnit->conversion_factor
                : (int) round(((int) $ref->base_quantity) / ((int) $ref->quantity ?: 1));

            if ($conversionFactor < 1) {
                abort(422);
            }

            $rawBaseQuantity = (float) $item['quantity'] * $conversionFactor;
            $baseQuantity = (int) round($rawBaseQuantity);
            if (abs($rawBaseQuantity - $baseQuantity) > 0.0001) {
                abort(422);
            }

            $batch = InventoryBatch::where('branch_id', $purchase->branch_id)
                ->where('product_id', $ref->product_id)
                ->where('batch_number', $ref->batch_number)
                ->whereDate('expiry_date', $ref->expiry_date)
                ->first();

            if (!$batch) {
                abort(422);
            }

            return [
                'product_id' => $ref->product_id,
                'batch_id' => $batch->id,
                'unit_id' => $ref->unit_id,
                'quantity' => (float) $item['quantity'],
                'base_quantity' => $baseQuantity,
                'refund_price' => (float) $item['refund_price'],
            ];
        });

        $refundAmount = (float) $preparedItems->sum(function ($i) {
            return (float) $i['quantity'] * (float) $i['refund_price'];
        });

        DB::transaction(function () use ($purchase, $validated, $preparedItems, $refundAmount) {
            $return = ReturnEntry::create([
                'type' => 'Supplier',
                'reference_id' => $purchase->id,
                'branch_id' => $purchase->branch_id,
                'reason' => $validated['reason'],
                'refund_amount' => $refundAmount,
                'status' => 'Pending',
            ]);

            foreach ($preparedItems as $item) {
                ReturnItem::create([
                    'return_id' => $return->id,
                    'product_id' => $item['product_id'],
                    'batch_id' => $item['batch_id'],
                    'unit_id' => $item['unit_id'],
                    'quantity' => $item['quantity'],
                    'base_quantity' => $item['base_quantity'],
                    'refund_price' => $item['refund_price'],
                    'created_at' => now(),
                ]);
            }
        });

        return redirect()->back()->with('success', 'Return created.');
    }

    public function updateStatus(Request $request, string $locale, ReturnEntry $return)
    {
        $validated = $request->validate([
            'status' => 'required|in:Pending,Approved,Rejected',
        ]);

        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);

        if (!$this->canAccessAllBranches($user) && !in_array($return->branch_id, $accessibleBranchIds->toArray(), true)) {
            abort(403);
        }

        if ($return->status === $validated['status']) {
            return redirect()->back();
        }

        if ($return->status !== 'Pending') {
            abort(422);
        }

        DB::transaction(function () use ($return, $validated) {
            if ($validated['status'] === 'Approved') {
                $items = $return->items()->get();

                foreach ($items as $item) {
                    $baseQty = (int) ($item->base_quantity ?? 0);
                    if ($baseQty <= 0) {
                        continue;
                    }

                    $batch = $item->batch_id ? InventoryBatch::lockForUpdate()->find($item->batch_id) : null;

                    $inventory = Inventory::lockForUpdate()->firstOrCreate(
                        ['branch_id' => $return->branch_id, 'product_id' => $item->product_id],
                        ['quantity' => 0]
                    );

                    if ($return->type === 'Customer') {
                        if ($batch) {
                            $batch->update(['quantity' => (int) $batch->quantity + $baseQty]);
                        }
                        $inventory->update(['quantity' => (int) $inventory->quantity + $baseQty]);
                    } else {
                        if ($batch) {
                            $newQty = (int) $batch->quantity - $baseQty;
                            $batch->update(['quantity' => max($newQty, 0)]);
                        }
                        $newInv = (int) $inventory->quantity - $baseQty;
                        $inventory->update(['quantity' => max($newInv, 0)]);
                    }
                }
            }

            $return->update(['status' => $validated['status']]);
        });

        return redirect()->back()->with('success', 'Return status updated.');
    }
}
