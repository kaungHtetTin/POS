<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\ReturnEntry;
use App\Models\Sale;
use App\Models\User;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use App\Support\Spa;

class SalesController extends Controller
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

    protected function resolveBranchScope(Request $request, $user, $accessibleBranchIds): array
    {
        if (!$request->has('branch_id')) {
            return ['mode' => 'current', 'branch_id' => $user->currentBranchId()];
        }

        $branchId = $request->get('branch_id');

        if ($branchId === null || $branchId === '') {
            return ['mode' => 'current', 'branch_id' => $user->currentBranchId()];
        }

        if ($branchId === 'all') {
            return ['mode' => 'all', 'branch_id' => null];
        }

        if (!in_array($branchId, $accessibleBranchIds->toArray(), true)) {
            abort(403);
        }

        return ['mode' => 'specific', 'branch_id' => $branchId];
    }

    protected function parseDateRange(Request $request): array
    {
        $defaultFrom = now()->startOfMonth()->toDateString();
        $defaultTo = now()->endOfMonth()->toDateString();
        
        $from = $request->get('from_date', $defaultFrom);
        $to = $request->get('to_date', $defaultTo);

        try {
            $fromDate = Carbon::parse($from)->startOfDay();
        } catch (\Throwable $e) {
            $fromDate = Carbon::parse($defaultFrom)->startOfDay();
        }

        try {
            $toDate = Carbon::parse($to)->endOfDay();
        } catch (\Throwable $e) {
            $toDate = Carbon::parse($defaultTo)->endOfDay();
        }

        if ($fromDate->greaterThan($toDate)) {
            [$fromDate, $toDate] = [$toDate->copy()->startOfDay(), $fromDate->copy()->endOfDay()];
        }

        return [$fromDate, $toDate];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);
        [$fromDate, $toDate] = $this->parseDateRange($request);

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $salesStaff = User::query()
            ->select('id', 'name', 'branch_id')
            ->with('branch:id,name')
            ->whereHas('roles', function ($q) {
                $q->where('name', '!=', 'Root');
            })
            ->where(function ($q) use ($accessibleBranchIds) {
                $q->whereIn('branch_id', $accessibleBranchIds)
                    ->orWhereHas('branches', function ($branchQuery) use ($accessibleBranchIds) {
                        $branchQuery->whereIn('branches.id', $accessibleBranchIds);
                    });
            })
            ->orderBy('name')
            ->get();

        $query = Sale::query()
            ->with(['branch:id,name', 'user:id,name', 'saleStaff:id,name', 'voidedByUser:id,name', 'customer:id,name'])
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('sales.branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('sales.sale_date', [$fromDate, $toDate])
            ->when($request->filled('sale_staff_id'), function ($q) use ($request) {
                $q->where('sales.sale_staff_id', $request->get('sale_staff_id'));
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = trim((string) $request->search);
                $q->where(function ($inner) use ($search) {
                    $inner->where('sales.invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('customer', function ($customerQuery) use ($search) {
                            $customerQuery->where('name', 'like', "%{$search}%");
                        });
                });
            });

        $summary = (clone $query)
            ->selectRaw('COUNT(*) as sales_count')
            ->selectRaw("SUM(CASE WHEN COALESCE(status, 'Completed') = 'Voided' THEN 1 ELSE 0 END) as voided_count")
            ->selectRaw("COALESCE(SUM(CASE WHEN COALESCE(status, 'Completed') != 'Voided' THEN grand_total ELSE 0 END), 0) as active_total")
            ->first();

        $sales = $query
            ->latest('sales.sale_date')
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Spa::render('Sales/Index', [
            'sales' => $sales,
            'summary' => [
                'sales_count' => (int) ($summary->sales_count ?? 0),
                'voided_count' => (int) ($summary->voided_count ?? 0),
                'active_total' => (float) ($summary->active_total ?? 0),
            ],
            'branches' => $branches,
            'salesStaff' => $salesStaff,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'sale_staff_id' => (string) $request->get('sale_staff_id', ''),
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
                'search' => (string) $request->get('search', ''),
            ],
        ]);
    }

    public function show(Request $request, Sale $sale)
    {
        $accessibleBranchIds = $this->accessibleBranchIds($request->user());

        if (!in_array($sale->branch_id, $accessibleBranchIds->toArray(), true)) {
            abort(403);
        }

        $sale->load([
            'branch:id,name,address,phone,email',
            'user:id,name,email',
            'saleStaff:id,name,email',
            'customer:id,name,phone,email,address',
            'cashSession:id,status,opened_at,closed_at',
            'voidedByUser:id,name',
            'items.product:id,name,generic_name,barcode',
            'items.unit:id,name,short_name',
            'items.focUnit:id,name,short_name',
            'items.batch:id,batch_number,expiry_date',
        ]);

        $returns = ReturnEntry::query()
            ->where('type', 'Customer')
            ->where('reference_id', $sale->id)
            ->with([
                'branch:id,name',
                'items.product:id,name',
                'items.unit:id,name,short_name',
            ])
            ->latest()
            ->get();

        $costTotal = (float) $sale->items->sum('cost_total');
        $refundTotal = (float) $returns->where('status', 'Approved')->sum('refund_amount');
        $netRevenue = (float) $sale->grand_total - (float) $sale->tax;

        return Spa::render('Sales/Show', [
            'sale' => $sale,
            'returns' => $returns,
            'summary' => [
                'items_count' => $sale->items->count(),
                'quantity' => (float) $sale->items->sum('quantity'),
                'cost_total' => $costTotal,
                'net_revenue' => $netRevenue,
                'gross_profit' => $netRevenue - $costTotal,
                'approved_refunds' => $refundTotal,
                'net_after_refunds' => (float) $sale->grand_total - $refundTotal,
            ],
        ]);
    }

    public function void(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:3|max:2000',
        ]);

        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);

        if (!in_array($sale->branch_id, $accessibleBranchIds->toArray(), true)) {
            abort(403);
        }

        if ($sale->status === 'Voided') {
            return redirect()->back()->withErrors([
                'void' => 'This sale has already been voided.',
            ]);
        }

        $hasReturns = ReturnEntry::query()
            ->where('type', 'Customer')
            ->where('reference_id', $sale->id)
            ->exists();

        if ($hasReturns) {
            return redirect()->back()->withErrors([
                'void' => 'This sale has return records. Reject/delete those returns or use the return flow instead.',
            ]);
        }

        DB::transaction(function () use ($sale, $user, $validated) {
            $lockedSale = Sale::query()
                ->whereKey($sale->id)
                ->with('items')
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedSale->status === 'Voided') {
                return;
            }

            foreach ($lockedSale->items as $item) {
                $baseQuantity = (int) ($item->base_quantity ?? 0) + (int) ($item->foc_base_quantity ?? 0);

                if ($baseQuantity <= 0) {
                    continue;
                }

                $batch = InventoryBatch::query()
                    ->whereKey($item->batch_id)
                    ->lockForUpdate()
                    ->first();

                if ($batch) {
                    $existingQuantity = (int) $batch->quantity;
                    $newQuantity = $existingQuantity + $baseQuantity;
                    $restoredCost = (float) $item->base_unit_cost;
                    $restoredAverageCost = $newQuantity > 0
                        ? (($existingQuantity * (float) $batch->purchase_price) + ($baseQuantity * $restoredCost)) / $newQuantity
                        : $restoredCost;

                    $batch->update([
                        'quantity' => $newQuantity,
                        'purchase_price' => $restoredAverageCost,
                    ]);
                }

                $inventory = Inventory::query()
                    ->where('branch_id', $lockedSale->branch_id)
                    ->where('product_id', $item->product_id)
                    ->lockForUpdate()
                    ->first();

                if (!$inventory) {
                    $inventory = Inventory::create([
                        'branch_id' => $lockedSale->branch_id,
                        'product_id' => $item->product_id,
                        'quantity' => 0,
                    ]);
                }

                $inventory->update([
                    'quantity' => (int) $inventory->quantity + $baseQuantity,
                ]);
            }

            $lockedSale->update([
                'status' => 'Voided',
                'voided_by_user_id' => $user->id,
                'voided_at' => now(),
                'void_reason' => $validated['reason'],
            ]);

            $this->recalculateCashSessionTotals($lockedSale);
        });

        ActivityLogger::log($request, 'void_sale', "Voided sale {$sale->invoice_number}", [
            'sale_id' => $sale->id,
            'invoice_number' => $sale->invoice_number,
            'reason' => $validated['reason'],
        ]);

        return redirect()->back()->with('success', 'Sale voided and stock restored.');
    }

    protected function recalculateCashSessionTotals(Sale $sale): void
    {
        if (!$sale->cash_session_id) {
            return;
        }

        $session = $sale->cashSession()->lockForUpdate()->first();

        if (!$session) {
            return;
        }

        $totals = Sale::query()
            ->where('cash_session_id', $session->id)
            ->where('payment_method', 'Cash')
            ->where('status', '!=', 'Voided')
            ->selectRaw('COALESCE(SUM(amount_received), 0) as cash_received_total')
            ->selectRaw('COALESCE(SUM(change_due), 0) as change_given_total')
            ->first();

        $cashReceivedTotal = (float) ($totals?->cash_received_total ?? 0);
        $changeGivenTotal = (float) ($totals?->change_given_total ?? 0);
        $netCashSales = $cashReceivedTotal - $changeGivenTotal;
        $expectedAmount = (float) $session->opening_amount + $netCashSales;
        $countedAmount = $session->closing_counted_amount !== null ? (float) $session->closing_counted_amount : null;

        $session->update([
            'cash_received_total' => $cashReceivedTotal,
            'change_given_total' => $changeGivenTotal,
            'net_cash_sales' => $netCashSales,
            'expected_amount' => $expectedAmount,
            'difference' => $countedAmount !== null ? $countedAmount - $expectedAmount : $session->difference,
        ]);
    }
}
