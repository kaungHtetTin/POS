<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Purchase;
use App\Models\ReturnEntry;
use App\Models\ReturnItem;
use App\Models\Sale;
use App\Services\ReturnPricing;
use App\Services\ReturnService;
use Illuminate\Http\Request;
use App\Support\Spa;

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
                'settlements',
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

        $settlementSummary = ReturnEntry::whereIn('branch_id', $accessibleBranchIds)
            ->when($request->filled('branch_id'), fn ($query) => $query->where('branch_id', $request->branch_id))
            ->where('status', 'Approved')
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'Customer' THEN settlement_due - settlement_paid ELSE 0 END), 0) as customer_refunds_due")
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'Supplier' THEN settlement_due - settlement_paid ELSE 0 END), 0) as supplier_refunds_due")
            ->first();

        return Spa::render('Returns/Index', [
            'returns' => $returns,
            'branches' => $branches,
            'filters' => $request->only(['type', 'status', 'branch_id']),
            'settlementSummary' => $settlementSummary,
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
                'customer:id,name',
                'items' => function ($q) {
                    $q->with(['product:id,name', 'unit:id,name,short_name', 'batch:id,batch_number,expiry_date']);
                },
            ])
            ->first();

        if (!$sale) {
            return response()->json(null, 404);
        }

        $returnedBaseQuantities = ReturnItem::query()
            ->whereIn('source_sale_item_id', $sale->items->pluck('id'))
            ->whereHas('returnEntry', fn ($query) => $query->where('status', '!=', 'Rejected'))
            ->selectRaw('source_sale_item_id, COALESCE(SUM(base_quantity), 0) as returned_base_quantity')
            ->groupBy('source_sale_item_id')
            ->pluck('returned_base_quantity', 'source_sale_item_id');

        $sale->load('items');
        $lineAmounts = app(ReturnPricing::class)->saleLineAmounts($sale);

        return response()->json([
            'id' => $sale->id,
            'invoice_number' => $sale->invoice_number,
            'branch_id' => $sale->branch_id,
            'branch_name' => $sale->branch?->name,
            'sale_date' => $sale->sale_date?->format('Y-m-d H:i:s'),
            'grand_total' => (float) $sale->grand_total,
            'party_name' => $sale->customer?->name ?? 'Walk-in customer',
            'amount_received' => (float) $sale->amount_received,
            'payment_method' => $sale->payment_method,
            'customer_id' => $sale->customer_id,
            'return_credit_amount' => (float) $sale->return_credit_amount,
            'items' => $sale->items->map(function ($item) use ($returnedBaseQuantities, $lineAmounts) {
                $conversionFactor = (int) round(((int) $item->base_quantity) / ((float) $item->quantity ?: 1));
                $returnableBaseQuantity = max(
                    (int) $item->base_quantity - (int) ($returnedBaseQuantities[$item->id] ?? 0),
                    0
                );

                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product?->name,
                    'unit_id' => $item->unit_id,
                    'unit_name' => $item->unit?->short_name ?: $item->unit?->name,
                    'batch_id' => $item->batch_id,
                    'batch_number' => $item->batch?->batch_number,
                    'expiry_date' => $item->batch?->expiry_date?->format('Y-m-d'),
                    'quantity' => $conversionFactor > 0 ? $returnableBaseQuantity / $conversionFactor : 0,
                    'base_quantity' => (int) $item->base_quantity,
                    'returnable_base_quantity' => $returnableBaseQuantity,
                    'previously_returned_quantity' => $conversionFactor > 0 ? (int) ($returnedBaseQuantities[$item->id] ?? 0) / $conversionFactor : 0,
                    'original_quantity' => (float) $item->quantity,
                    'unit_price' => (float) $item->quantity > 0 ? round(($lineAmounts[$item->id] ?? 0) / 100 / (float) $item->quantity, 2) : 0,
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
                'supplier:id,name',
                'items' => function ($q) {
                    $q->with(['product:id,name', 'unit:id,name,short_name']);
                },
            ])
            ->first();

        if (!$purchase) {
            return response()->json(null, 404);
        }

        $previous = ReturnItem::query()
            ->whereIn('source_purchase_item_id', $purchase->items->pluck('id'))
            ->whereHas('returnEntry', fn ($query) => $query->where('status', '!=', 'Rejected'))
            ->get()->groupBy('source_purchase_item_id');

        return response()->json([
            'id' => $purchase->id,
            'invoice_number' => $purchase->invoice_number,
            'branch_id' => $purchase->branch_id,
            'branch_name' => $purchase->branch?->name,
            'purchase_date' => $purchase->purchase_date,
            'total_amount' => (float) $purchase->total_amount,
            'party_name' => $purchase->supplier?->name,
            'paid_amount' => (float) $purchase->paid_amount,
            'due_amount' => (float) $purchase->due_amount,
            'return_credit_amount' => (float) $purchase->return_credit_amount,
            'items' => $purchase->items->map(function ($item) use ($previous) {
                $returned = $previous->get($item->id, collect());
                $remainingPaid = max((float) $item->quantity - (float) $returned->sum('paid_quantity'), 0);
                $remainingFoc = max((float) ($item->foc_quantity ?? 0) - (float) $returned->sum('foc_quantity'), 0);
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
                    'remaining_paid_quantity' => $remainingPaid,
                    'remaining_foc_quantity' => $remainingFoc,
                    'previously_returned_quantity' => (float) $returned->sum('quantity'),
                    'base_quantity' => (int) $item->base_quantity,
                    'foc_base_quantity' => (int) ($item->foc_base_quantity ?? 0),
                    'unit_price' => (float) $item->unit_price,
                ];
            })->values(),
        ]);
    }

    public function store(Request $request, ReturnService $service)
    {
        $validated = $request->validate([
            'type' => 'required|in:Customer,Supplier',
            'reference_id' => 'required|uuid',
            'reason' => 'required|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.reference_item_id' => 'required|uuid',
            'items.*.quantity' => 'required|numeric|min:0|max:999999.99',
            'items.*.foc_quantity' => 'nullable|numeric|min:0|max:999999.99',
            'items.*.restock' => 'nullable|boolean',
            'payment_method' => 'required|in:Cash,Card,Mobile,Wallet',
            'payment_reference' => 'nullable|string|max:255',
        ]);

        $service->complete($validated, $this->accessibleBranchIds($request->user()), $request->user());

        return redirect()->back()->with('success', 'Return approved and refund completed.');
    }

    public function updateStatus(Request $request, ReturnEntry $return, ReturnService $service)
    {
        $validated = $request->validate([
            'status' => 'required|in:Approved,Rejected',
        ]);

        if (!$this->accessibleBranchIds($request->user())->contains($return->branch_id)) {
            abort(403);
        }

        $service->decide($return, $validated['status']);

        return redirect()->back()->with('success', 'Return status updated.');
    }

    public function settle(Request $request, ReturnEntry $return, ReturnService $service)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:999999999999.99',
            'payment_method' => 'required|in:Cash,Card,Mobile,Wallet',
            'reference_number' => 'required_unless:payment_method,Cash|nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
        ]);

        if (!$this->accessibleBranchIds($request->user())->contains($return->branch_id)) {
            abort(403);
        }

        $service->settle($return, $request->user(), $validated);

        return redirect()->back()->with('success', $return->type === 'Customer'
            ? 'Customer refund recorded.'
            : 'Supplier refund received.');
    }
}
