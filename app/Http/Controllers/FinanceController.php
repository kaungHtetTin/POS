<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Purchase;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

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

        return Inertia::render('Finance/OutstandingBalance', [
            'branches' => $branches,
            'filters' => array_merge($filters, [
                'branch_id' => $branchScope['all'] ? 'all' : $branchScope['branch_id'],
            ]),
            'summary' => $summary,
            'purchases' => $purchases,
        ]);
    }
}
