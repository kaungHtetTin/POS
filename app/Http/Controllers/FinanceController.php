<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Purchase;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Support\Spa;

class FinanceController extends Controller
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
            $branchIds = $branchIds->merge($user->branches()->pluck('branches.id'));
        } catch (\Throwable $e) {
            // Keep the direct branch scope if the optional relation is unavailable.
        }

        return $branchIds->unique()->values();
    }

    protected function resolveBranchScope(Request $request, $user, $accessibleBranchIds): array
    {
        if ($this->canAccessAllBranches($user) && $request->get('branch_id') === 'all') {
            return ['all' => true, 'branch_id' => null];
        }

        $branchId = $request->get('branch_id');

        if (!$branchId) {
            $branchId = $user->currentBranchId() ?: $accessibleBranchIds->first();
        }

        if (!in_array($branchId, $accessibleBranchIds->toArray(), true)) {
            $branchId = $accessibleBranchIds->first();
        }

        return ['all' => false, 'branch_id' => $branchId];
    }

    public function outstandingBalance(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);
        $today = Carbon::today();

        $filters = [
            'branch_id' => (string) $request->get('branch_id', ''),
            'payment_status' => (string) $request->get('payment_status', 'all'),
            'due_status' => (string) $request->get('due_status', 'all'),
            'from_date' => trim((string) $request->get('from_date', '')),
            'to_date' => trim((string) $request->get('to_date', '')),
            'search' => trim((string) $request->get('search', '')),
        ];

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $baseQuery = Purchase::query()
            ->with(['supplier:id,name,phone,email,balance', 'branch:id,name'])
            ->withCount('payments')
            ->whereIn('branch_id', $accessibleBranchIds)
            ->where('due_amount', '>', 0);

        if (!$branchScope['all']) {
            $baseQuery->where('branch_id', $branchScope['branch_id']);
        }

        if (in_array($filters['payment_status'], ['Partial', 'Due'], true)) {
            $baseQuery->where('payment_status', $filters['payment_status']);
        }

        if ($filters['from_date'] !== '') {
            $baseQuery->whereDate('due_date', '>=', $filters['from_date']);
        }

        if ($filters['to_date'] !== '') {
            $baseQuery->whereDate('due_date', '<=', $filters['to_date']);
        }

        if ($filters['due_status'] === 'overdue') {
            $baseQuery->whereDate('due_date', '<', $today->toDateString());
        } elseif ($filters['due_status'] === 'due_today') {
            $baseQuery->whereDate('due_date', $today->toDateString());
        } elseif ($filters['due_status'] === 'next_7') {
            $baseQuery->whereBetween('due_date', [$today->toDateString(), $today->copy()->addDays(7)->toDateString()]);
        } elseif ($filters['due_status'] === 'upcoming') {
            $baseQuery->whereDate('due_date', '>', $today->copy()->addDays(7)->toDateString());
        }

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $baseQuery->where(function ($query) use ($search) {
                $query->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($supplierQuery) use ($search) {
                        $supplierQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $summaryRows = (clone $baseQuery)->get(['id', 'supplier_id', 'total_amount', 'paid_amount', 'due_amount', 'due_date']);
        $summary = [
            'purchase_count' => $summaryRows->count(),
            'supplier_count' => $summaryRows->pluck('supplier_id')->unique()->count(),
            'total_amount' => (float) $summaryRows->sum('total_amount'),
            'paid_amount' => (float) $summaryRows->sum('paid_amount'),
            'due_amount' => (float) $summaryRows->sum('due_amount'),
            'overdue_amount' => (float) $summaryRows
                ->filter(fn ($purchase) => $purchase->due_date && Carbon::parse($purchase->due_date)->lt($today))
                ->sum('due_amount'),
        ];

        $purchases = $baseQuery
            ->orderBy('due_date')
            ->orderBy('purchase_date')
            ->orderBy('invoice_number')
            ->paginate(15)
            ->withQueryString()
            ->through(function ($purchase) use ($today) {
                $dueDate = $purchase->due_date ? Carbon::parse($purchase->due_date) : null;

                return [
                    'id' => $purchase->id,
                    'invoice_number' => $purchase->invoice_number,
                    'purchase_date' => optional($purchase->purchase_date)->toDateString(),
                    'due_date' => optional($purchase->due_date)->toDateString(),
                    'days_until_due' => $dueDate ? (int) $today->diffInDays($dueDate, false) : null,
                    'payment_status' => $purchase->payment_status,
                    'total_amount' => (float) $purchase->total_amount,
                    'paid_amount' => (float) $purchase->paid_amount,
                    'due_amount' => (float) $purchase->due_amount,
                    'payments_count' => (int) $purchase->payments_count,
                    'supplier' => $purchase->supplier ? [
                        'id' => $purchase->supplier->id,
                        'name' => $purchase->supplier->name,
                        'phone' => $purchase->supplier->phone,
                        'email' => $purchase->supplier->email,
                        'balance' => (float) $purchase->supplier->balance,
                    ] : null,
                    'branch' => $purchase->branch ? [
                        'id' => $purchase->branch->id,
                        'name' => $purchase->branch->name,
                    ] : null,
                ];
            });

        return Spa::render('Finance/OutstandingBalance', [
            'branches' => $branches,
            'filters' => array_merge($filters, [
                'branch_id' => $branchScope['all'] ? 'all' : $branchScope['branch_id'],
            ]),
            'summary' => $summary,
            'purchases' => $purchases,
        ]);
    }

    public function amountReceivable(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);
        $receivableExpression = 'GREATEST(sales.grand_total - LEAST(COALESCE(sales.amount_received, 0), sales.grand_total), 0)';

        $filters = [
            'branch_id' => (string) $request->get('branch_id', ''),
            'payment_status' => (string) $request->get('payment_status', 'all'),
            'payment_method' => (string) $request->get('payment_method', 'all'),
            'from_date' => trim((string) $request->get('from_date', '')),
            'to_date' => trim((string) $request->get('to_date', '')),
            'min_amount' => trim((string) $request->get('min_amount', '')),
            'max_amount' => trim((string) $request->get('max_amount', '')),
            'sort' => (string) $request->get('sort', 'oldest'),
            'search' => trim((string) $request->get('search', '')),
        ];

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $baseQuery = Sale::query()
            ->with(['customer:id,name,phone,email', 'branch:id,name'])
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->whereNotNull('sales.customer_id')
            ->whereIn('sales.payment_status', ['Partial', 'Due'])
            ->whereRaw("{$receivableExpression} > 0")
            ->where(function ($query) {
                $query->whereNull('sales.status')
                    ->orWhere('sales.status', '!=', 'Voided');
            });

        if (!$branchScope['all']) {
            $baseQuery->where('sales.branch_id', $branchScope['branch_id']);
        }

        if (in_array($filters['payment_status'], ['Partial', 'Due'], true)) {
            $baseQuery->where('sales.payment_status', $filters['payment_status']);
        }

        if (in_array($filters['payment_method'], ['Cash', 'Card', 'Mobile', 'Wallet'], true)) {
            $baseQuery->where('sales.payment_method', $filters['payment_method']);
        }

        if ($filters['from_date'] !== '') {
            $baseQuery->whereDate('sales.sale_date', '>=', $filters['from_date']);
        }

        if ($filters['to_date'] !== '') {
            $baseQuery->whereDate('sales.sale_date', '<=', $filters['to_date']);
        }

        if (is_numeric($filters['min_amount'])) {
            $baseQuery->whereRaw("{$receivableExpression} >= ?", [(float) $filters['min_amount']]);
        }

        if (is_numeric($filters['max_amount'])) {
            $baseQuery->whereRaw("{$receivableExpression} <= ?", [(float) $filters['max_amount']]);
        }

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $baseQuery->where(function ($query) use ($search) {
                $query->where('sales.invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $summaryRows = (clone $baseQuery)
            ->select('sales.id', 'sales.customer_id', 'sales.grand_total', 'sales.amount_received')
            ->selectRaw("{$receivableExpression} as receivable_amount")
            ->get();

        $summary = [
            'sale_count' => $summaryRows->count(),
            'customer_count' => $summaryRows->pluck('customer_id')->unique()->count(),
            'grand_total' => (float) $summaryRows->sum('grand_total'),
            'received_amount' => (float) $summaryRows->sum('amount_received'),
            'receivable_amount' => (float) $summaryRows->sum('receivable_amount'),
            'average_receivable' => (float) ($summaryRows->count() ? $summaryRows->avg('receivable_amount') : 0),
        ];

        $salesQuery = $baseQuery
            ->select('sales.*')
            ->selectRaw("{$receivableExpression} as receivable_amount");

        match ($filters['sort']) {
            'newest' => $salesQuery->latest('sales.sale_date')->latest('sales.created_at'),
            'highest' => $salesQuery->orderByDesc('receivable_amount')->latest('sales.sale_date'),
            'lowest' => $salesQuery->orderBy('receivable_amount')->latest('sales.sale_date'),
            default => $salesQuery->orderBy('sales.sale_date')->orderBy('sales.created_at'),
        };

        $sales = $salesQuery
            ->paginate(15)
            ->withQueryString()
            ->through(function ($sale) {
                return [
                    'id' => $sale->id,
                    'invoice_number' => $sale->invoice_number,
                    'sale_date' => optional($sale->sale_date)->toDateTimeString(),
                    'payment_method' => $sale->payment_method,
                    'payment_status' => $sale->payment_status,
                    'grand_total' => (float) $sale->grand_total,
                    'amount_received' => (float) $sale->amount_received,
                    'receivable_amount' => (float) $sale->receivable_amount,
                    'customer' => $sale->customer ? [
                        'id' => $sale->customer->id,
                        'name' => $sale->customer->name,
                        'phone' => $sale->customer->phone,
                        'email' => $sale->customer->email,
                    ] : null,
                    'branch' => $sale->branch ? [
                        'id' => $sale->branch->id,
                        'name' => $sale->branch->name,
                    ] : null,
                ];
            });

        return Spa::render('Finance/AmountReceivable', [
            'branches' => $branches,
            'filters' => array_merge($filters, [
                'branch_id' => $branchScope['all'] ? 'all' : $branchScope['branch_id'],
            ]),
            'paymentMethods' => ['Cash', 'Card', 'Mobile', 'Wallet'],
            'summary' => $summary,
            'sales' => $sales,
        ]);
    }

    public function receiveReceivablePayment(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:999999999999.99',
            'payment_method' => 'required|in:Cash,Card,Mobile,Wallet',
        ]);

        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);

        if (!in_array($sale->branch_id, $accessibleBranchIds->toArray(), true)) {
            abort(403);
        }

        DB::transaction(function () use ($sale, $validated) {
            $lockedSale = Sale::query()->lockForUpdate()->findOrFail($sale->id);

            if ($lockedSale->status === 'Voided') {
                throw ValidationException::withMessages([
                    'amount' => 'Voided sales cannot receive payments.',
                ]);
            }

            if (!$lockedSale->customer_id) {
                throw ValidationException::withMessages([
                    'amount' => 'Walk-in sales cannot be used for amount receivable.',
                ]);
            }

            $grandTotal = (float) $lockedSale->grand_total;
            $currentReceived = min(max((float) $lockedSale->amount_received, 0), $grandTotal);
            $receivableAmount = max($grandTotal - $currentReceived, 0);
            $receiveAmount = (float) $validated['amount'];

            if ($receivableAmount <= 0) {
                throw ValidationException::withMessages([
                    'amount' => 'This sale has no amount receivable.',
                ]);
            }

            if ($receiveAmount > $receivableAmount) {
                throw ValidationException::withMessages([
                    'amount' => 'Receive amount cannot exceed the amount receivable.',
                ]);
            }

            $newReceived = min($grandTotal, $currentReceived + $receiveAmount);

            $lockedSale->forceFill([
                'amount_received' => $newReceived,
                'change_due' => 0,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $newReceived >= $grandTotal ? 'Paid' : 'Partial',
                'is_synced' => false,
                'synced_at' => null,
            ])->save();
        });

        return redirect()->back()->with('success', 'Customer payment received successfully.');
    }
}
