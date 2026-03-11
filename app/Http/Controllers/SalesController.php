<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

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
        $today = now()->toDateString();
        $from = $request->get('from_date', $today);
        $to = $request->get('to_date', $today);

        try {
            $fromDate = Carbon::parse($from)->startOfDay();
        } catch (\Throwable $e) {
            $fromDate = Carbon::parse($today)->startOfDay();
        }

        try {
            $toDate = Carbon::parse($to)->endOfDay();
        } catch (\Throwable $e) {
            $toDate = Carbon::parse($today)->endOfDay();
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

        $query = Sale::query()
            ->with(['branch:id,name', 'user:id,name', 'customer:id,name'])
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('sales.branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('sales.sale_date', [$fromDate, $toDate])
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = trim((string) $request->search);
                $q->where('sales.invoice_number', 'like', "%{$search}%");
            });

        $sales = $query->latest('sales.sale_date')->latest()->get();

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'branches' => $branches,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
                'search' => (string) $request->get('search', ''),
            ],
        ]);
    }
}

