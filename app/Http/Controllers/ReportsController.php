<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Expense;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ReturnEntry;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportsController extends Controller
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

        $groupBy = $request->get('group_by', 'daily');
        if (!in_array($groupBy, ['daily', 'monthly', 'yearly'], true)) {
            $groupBy = 'daily';
        }

        $expiryDays = (int) $request->get('expiry_days', 30);
        if ($expiryDays < 1) {
            $expiryDays = 30;
        }
        if ($expiryDays > 365) {
            $expiryDays = 365;
        }

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $salesBase = Sale::query()
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('sales.branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('sales.sale_date', [$fromDate, $toDate]);

        $salesSummary = (clone $salesBase)->selectRaw('
            COUNT(*) as sales_count,
            COALESCE(SUM(total_amount), 0) as total_amount,
            COALESCE(SUM(discount), 0) as discount,
            COALESCE(SUM(tax), 0) as tax,
            COALESCE(SUM(grand_total), 0) as grand_total
        ')->first();

        $cogs = (clone $salesBase)
            ->join('sale_items', 'sales.id', '=', 'sale_items.sale_id')
            ->join('inventory_batches', 'sale_items.batch_id', '=', 'inventory_batches.id')
            ->selectRaw('COALESCE(SUM(sale_items.base_quantity * inventory_batches.purchase_price), 0) as cogs')
            ->value('cogs');

        $returnsBase = ReturnEntry::query()
            ->whereIn('branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('branch_id', $branchScope['branch_id']);
            })
            ->where('status', 'Approved')
            ->whereBetween('created_at', [$fromDate, $toDate]);

        $customerReturns = (clone $returnsBase)
            ->where('type', 'Customer')
            ->selectRaw('COALESCE(SUM(refund_amount), 0) as refund_total')
            ->value('refund_total');

        $supplierReturns = (clone $returnsBase)
            ->where('type', 'Supplier')
            ->selectRaw('COALESCE(SUM(refund_amount), 0) as refund_total')
            ->value('refund_total');

        $expensesTotal = Expense::query()
            ->whereIn('branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('expense_date', [$fromDate->toDateString(), $toDate->toDateString()])
            ->selectRaw('COALESCE(SUM(amount), 0) as total')
            ->value('total');

        $salesNetOfTax = (float) $salesSummary->grand_total - (float) $salesSummary->tax;
        $salesNetOfTaxAndReturns = $salesNetOfTax - (float) $customerReturns;
        $grossProfit = $salesNetOfTaxAndReturns - (float) $cogs;
        $netProfit = $grossProfit - (float) $expensesTotal;

        $dateExpr = match ($groupBy) {
            'yearly' => DB::raw("DATE_FORMAT(sales.sale_date, '%Y-01-01')"),
            'monthly' => DB::raw("DATE_FORMAT(sales.sale_date, '%Y-%m-01')"),
            default => DB::raw("DATE(sales.sale_date)"),
        };

        $salesTrend = (clone $salesBase)
            ->selectRaw(match ($groupBy) {
                'yearly' => "DATE_FORMAT(sales.sale_date, '%Y-01-01') as period",
                'monthly' => "DATE_FORMAT(sales.sale_date, '%Y-%m-01') as period",
                default => "DATE(sales.sale_date) as period",
            })
            ->selectRaw('COALESCE(SUM(grand_total), 0) as grand_total')
            ->selectRaw('COALESCE(SUM(tax), 0) as tax')
            ->selectRaw('COALESCE(SUM(discount), 0) as discount')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
            ->groupBy($dateExpr)
            ->orderBy($dateExpr)
            ->get();

        $returnsPeriodExpr = match ($groupBy) {
            'yearly' => DB::raw("DATE_FORMAT(created_at, '%Y-01-01')"),
            'monthly' => DB::raw("DATE_FORMAT(created_at, '%Y-%m-01')"),
            default => DB::raw("DATE(created_at)"),
        };

        $expensesPeriodExpr = match ($groupBy) {
            'yearly' => DB::raw("DATE_FORMAT(expense_date, '%Y-01-01')"),
            'monthly' => DB::raw("DATE_FORMAT(expense_date, '%Y-%m-01')"),
            default => DB::raw("DATE(expense_date)"),
        };

        $cogsTrend = (clone $salesBase)
            ->join('sale_items', 'sales.id', '=', 'sale_items.sale_id')
            ->join('inventory_batches', 'sale_items.batch_id', '=', 'inventory_batches.id')
            ->selectRaw(match ($groupBy) {
                'yearly' => "DATE_FORMAT(sales.sale_date, '%Y-01-01') as period",
                'monthly' => "DATE_FORMAT(sales.sale_date, '%Y-%m-01') as period",
                default => "DATE(sales.sale_date) as period",
            })
            ->selectRaw('COALESCE(SUM(sale_items.base_quantity * inventory_batches.purchase_price), 0) as cogs')
            ->groupBy($dateExpr)
            ->orderBy($dateExpr)
            ->get();

        $customerReturnsTrend = (clone $returnsBase)
            ->where('type', 'Customer')
            ->selectRaw(match ($groupBy) {
                'yearly' => "DATE_FORMAT(created_at, '%Y-01-01') as period",
                'monthly' => "DATE_FORMAT(created_at, '%Y-%m-01') as period",
                default => "DATE(created_at) as period",
            })
            ->selectRaw('COALESCE(SUM(refund_amount), 0) as customer_returns')
            ->groupBy($returnsPeriodExpr)
            ->orderBy($returnsPeriodExpr)
            ->get();

        $expensesTrend = Expense::query()
            ->whereIn('branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('expense_date', [$fromDate->toDateString(), $toDate->toDateString()])
            ->selectRaw(match ($groupBy) {
                'yearly' => "DATE_FORMAT(expense_date, '%Y-01-01') as period",
                'monthly' => "DATE_FORMAT(expense_date, '%Y-%m-01') as period",
                default => "DATE(expense_date) as period",
            })
            ->selectRaw('COALESCE(SUM(amount), 0) as expenses_total')
            ->groupBy($expensesPeriodExpr)
            ->orderBy($expensesPeriodExpr)
            ->get();

        $salesTrendByPeriod = $salesTrend->keyBy('period');
        $cogsTrendByPeriod = $cogsTrend->keyBy('period');
        $returnsTrendByPeriod = $customerReturnsTrend->keyBy('period');
        $expensesTrendByPeriod = $expensesTrend->keyBy('period');

        $profitPeriods = collect([])
            ->merge($salesTrendByPeriod->keys())
            ->merge($cogsTrendByPeriod->keys())
            ->merge($returnsTrendByPeriod->keys())
            ->merge($expensesTrendByPeriod->keys())
            ->unique()
            ->sort()
            ->values();

        $profitTrend = $profitPeriods->map(function ($period) use ($salesTrendByPeriod, $cogsTrendByPeriod, $returnsTrendByPeriod, $expensesTrendByPeriod) {
            $salesRow = $salesTrendByPeriod->get($period);
            $cogsRow = $cogsTrendByPeriod->get($period);
            $returnsRow = $returnsTrendByPeriod->get($period);
            $expensesRow = $expensesTrendByPeriod->get($period);

            $grandTotal = (float) ($salesRow->grand_total ?? 0);
            $tax = (float) ($salesRow->tax ?? 0);
            $netSales = $grandTotal - $tax;
            $customerReturnsAmount = (float) ($returnsRow->customer_returns ?? 0);
            $cogsAmount = (float) ($cogsRow->cogs ?? 0);
            $expensesAmount = (float) ($expensesRow->expenses_total ?? 0);

            $grossProfitAmount = ($netSales - $customerReturnsAmount) - $cogsAmount;
            $netProfitAmount = $grossProfitAmount - $expensesAmount;

            return [
                'period' => $period,
                'net_sales' => $netSales,
                'customer_returns' => $customerReturnsAmount,
                'cogs' => $cogsAmount,
                'expenses_total' => $expensesAmount,
                'gross_profit' => $grossProfitAmount,
                'net_profit' => $netProfitAmount,
            ];
        });

        $expensesByCategory = Expense::query()
            ->whereIn('expenses.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('expenses.branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('expenses.expense_date', [$fromDate->toDateString(), $toDate->toDateString()])
            ->leftJoin('expense_categories', 'expenses.expense_category_id', '=', 'expense_categories.id')
            ->selectRaw("COALESCE(expense_categories.name, 'Uncategorized') as category_name")
            ->selectRaw('COALESCE(SUM(expenses.amount), 0) as total')
            ->groupBy('category_name')
            ->orderByDesc('total')
            ->get();

        $branchPerformance = Sale::query()
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->whereBetween('sales.sale_date', [$fromDate, $toDate])
            ->join('branches', 'sales.branch_id', '=', 'branches.id')
            ->selectRaw('branches.id as branch_id, branches.name as branch_name')
            ->selectRaw('COALESCE(SUM(sales.grand_total), 0) as grand_total')
            ->selectRaw('COALESCE(SUM(sales.tax), 0) as tax')
            ->selectRaw('COALESCE(SUM(sales.discount), 0) as discount')
            ->selectRaw('COALESCE(SUM(sales.total_amount), 0) as total_amount')
            ->selectRaw('COUNT(*) as sales_count')
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('grand_total')
            ->get();

        $inventoryValuation = InventoryBatch::query()
            ->whereIn('inventory_batches.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('inventory_batches.branch_id', $branchScope['branch_id']);
            })
            ->selectRaw('COALESCE(SUM(quantity * purchase_price), 0) as purchase_value')
            ->selectRaw('COALESCE(SUM(quantity * selling_price), 0) as selling_value')
            ->first();

        $expiryCutoff = now()->addDays($expiryDays)->toDateString();
        $expiringBatches = InventoryBatch::query()
            ->whereIn('inventory_batches.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('inventory_batches.branch_id', $branchScope['branch_id']);
            })
            ->where('quantity', '>', 0)
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->whereDate('expiry_date', '<=', $expiryCutoff)
            ->with(['product:id,name', 'branch:id,name'])
            ->orderBy('expiry_date')
            ->limit(100)
            ->get();

        return Inertia::render('Reports/Index', [
            'branches' => $branches,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
                'group_by' => $groupBy,
                'expiry_days' => $expiryDays,
            ],
            'summary' => [
                'sales_count' => (int) ($salesSummary->sales_count ?? 0),
                'total_amount' => (float) ($salesSummary->total_amount ?? 0),
                'discount' => (float) ($salesSummary->discount ?? 0),
                'tax' => (float) ($salesSummary->tax ?? 0),
                'grand_total' => (float) ($salesSummary->grand_total ?? 0),
                'cogs' => (float) $cogs,
                'customer_returns' => (float) $customerReturns,
                'supplier_returns' => (float) $supplierReturns,
                'expenses_total' => (float) $expensesTotal,
                'gross_profit' => (float) $grossProfit,
                'net_profit' => (float) $netProfit,
                'inventory_purchase_value' => (float) ($inventoryValuation->purchase_value ?? 0),
                'inventory_selling_value' => (float) ($inventoryValuation->selling_value ?? 0),
            ],
            'sales_trend' => $salesTrend,
            'profit_trend' => $profitTrend,
            'expenses_by_category' => $expensesByCategory,
            'branch_performance' => $branchPerformance,
            'expiring_batches' => $expiringBatches,
        ]);
    }

    public function expiry(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);
        $fromInput = trim((string) $request->get('from_date', ''));
        $toInput = trim((string) $request->get('to_date', ''));

        $fromDate = null;
        if ($fromInput !== '') {
            try {
                $fromDate = Carbon::parse($fromInput)->startOfDay();
            } catch (\Throwable $e) {
                $fromDate = null;
            }
        }

        $toDate = null;
        if ($toInput !== '') {
            try {
                $toDate = Carbon::parse($toInput)->endOfDay();
            } catch (\Throwable $e) {
                $toDate = null;
            }
        }

        if ($fromDate && $toDate && $fromDate->greaterThan($toDate)) {
            [$fromDate, $toDate] = [$toDate->copy()->startOfDay(), $fromDate->copy()->endOfDay()];
        }

        $productId = (string) $request->get('product_id', '');
        if ($productId !== '') {
            $productExists = Product::where('id', $productId)->exists();
            if (!$productExists) {
                $productId = '';
            }
        }

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $products = Product::select('id', 'name')
            ->where('status', 'Active')
            ->orderBy('name')
            ->get();

        $batches = InventoryBatch::query()
            ->whereIn('inventory_batches.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('inventory_batches.branch_id', $branchScope['branch_id']);
            })
            ->where('inventory_batches.quantity', '>', 0)
            ->when($productId !== '', function ($q) use ($productId) {
                $q->where('inventory_batches.product_id', $productId);
            })
            ->when($fromDate, function ($q) use ($fromDate) {
                $q->whereDate('inventory_batches.expiry_date', '>=', $fromDate->toDateString());
            })
            ->when($toDate, function ($q) use ($toDate) {
                $q->whereDate('inventory_batches.expiry_date', '<=', $toDate->toDateString());
            })
            ->with(['product:id,name', 'branch:id,name'])
            ->orderBy('inventory_batches.expiry_date')
            ->orderBy('inventory_batches.batch_number')
            ->get()
            ->map(function ($batch) {
                $daysLeft = now()->startOfDay()->diffInDays(Carbon::parse($batch->expiry_date)->startOfDay(), false);
                return [
                    'id' => $batch->id,
                    'batch_number' => $batch->batch_number,
                    'product_name' => $batch->product?->name ?? '-',
                    'branch_name' => $batch->branch?->name ?? '-',
                    'quantity' => (int) $batch->quantity,
                    'expiry_date' => Carbon::parse($batch->expiry_date)->toDateString(),
                    'days_left' => $daysLeft,
                ];
            })
            ->values();

        return Inertia::render('Reports/Expiry', [
            'branches' => $branches,
            'products' => $products,
            'batches' => $batches,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'product_id' => $productId,
                'from_date' => $fromDate?->toDateString() ?? '',
                'to_date' => $toDate?->toDateString() ?? '',
            ],
        ]);
    }

    public function cashSessions(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);
        [$fromDate, $toDate] = $this->parseDateRange($request);

        $status = (string) $request->get('status', 'all');
        if (!in_array($status, ['all', 'open', 'closed'], true)) {
            $status = 'all';
        }

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $baseQuery = CashSession::query()
            ->whereIn('cash_sessions.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('cash_sessions.branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('cash_sessions.opened_at', [$fromDate, $toDate])
            ->when($status !== 'all', function ($q) use ($status) {
                $q->where('cash_sessions.status', $status);
            });

        $sessions = (clone $baseQuery)
            ->with([
                'branch:id,name',
                'user:id,name',
                'closedByUser:id,name',
            ])
            ->orderByDesc('cash_sessions.opened_at')
            ->limit(500)
            ->get()
            ->map(function ($session) {
                return [
                    'id' => $session->id,
                    'branch_name' => $session->branch?->name ?? '-',
                    'opened_by' => $session->user?->name ?? '-',
                    'closed_by' => $session->closedByUser?->name ?? null,
                    'status' => $session->status,
                    'opened_at' => optional($session->opened_at)->toDateTimeString(),
                    'closed_at' => optional($session->closed_at)->toDateTimeString(),
                    'opening_amount' => (float) $session->opening_amount,
                    'cash_received_total' => (float) $session->cash_received_total,
                    'change_given_total' => (float) $session->change_given_total,
                    'net_cash_sales' => (float) $session->net_cash_sales,
                    'expected_amount' => (float) $session->expected_amount,
                    'closing_counted_amount' => $session->closing_counted_amount !== null ? (float) $session->closing_counted_amount : null,
                    'difference' => $session->difference !== null ? (float) $session->difference : null,
                    'notes' => $session->notes,
                ];
            })
            ->values();

        $summary = (clone $baseQuery)
            ->selectRaw('COUNT(*) as sessions_count')
            ->selectRaw('SUM(CASE WHEN status = "open" THEN 1 ELSE 0 END) as open_sessions')
            ->selectRaw('SUM(CASE WHEN status = "closed" THEN 1 ELSE 0 END) as closed_sessions')
            ->selectRaw('COALESCE(SUM(opening_amount), 0) as opening_amount_total')
            ->selectRaw('COALESCE(SUM(cash_received_total), 0) as cash_received_total')
            ->selectRaw('COALESCE(SUM(change_given_total), 0) as change_given_total')
            ->selectRaw('COALESCE(SUM(net_cash_sales), 0) as net_cash_sales_total')
            ->selectRaw('COALESCE(SUM(expected_amount), 0) as expected_amount_total')
            ->selectRaw('COALESCE(SUM(closing_counted_amount), 0) as counted_amount_total')
            ->selectRaw('COALESCE(SUM(difference), 0) as difference_total')
            ->first();

        $byBranch = (clone $baseQuery)
            ->join('branches', 'cash_sessions.branch_id', '=', 'branches.id')
            ->selectRaw('branches.id as branch_id, branches.name as branch_name')
            ->selectRaw('COUNT(*) as sessions_count')
            ->selectRaw('COALESCE(SUM(cash_sessions.net_cash_sales), 0) as net_cash_sales_total')
            ->selectRaw('COALESCE(SUM(cash_sessions.difference), 0) as difference_total')
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('net_cash_sales_total')
            ->get();

        $byDate = (clone $baseQuery)
            ->selectRaw('DATE(opened_at) as session_date')
            ->selectRaw('COUNT(*) as sessions_count')
            ->selectRaw('COALESCE(SUM(net_cash_sales), 0) as net_cash_sales_total')
            ->selectRaw('COALESCE(SUM(difference), 0) as difference_total')
            ->groupBy(DB::raw('DATE(opened_at)'))
            ->orderBy(DB::raw('DATE(opened_at)'))
            ->get();

        return Inertia::render('Reports/CashSessions', [
            'branches' => $branches,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
                'status' => $status,
            ],
            'summary' => [
                'sessions_count' => (int) ($summary?->sessions_count ?? 0),
                'open_sessions' => (int) ($summary?->open_sessions ?? 0),
                'closed_sessions' => (int) ($summary?->closed_sessions ?? 0),
                'opening_amount_total' => (float) ($summary?->opening_amount_total ?? 0),
                'cash_received_total' => (float) ($summary?->cash_received_total ?? 0),
                'change_given_total' => (float) ($summary?->change_given_total ?? 0),
                'net_cash_sales_total' => (float) ($summary?->net_cash_sales_total ?? 0),
                'expected_amount_total' => (float) ($summary?->expected_amount_total ?? 0),
                'counted_amount_total' => (float) ($summary?->counted_amount_total ?? 0),
                'difference_total' => (float) ($summary?->difference_total ?? 0),
            ],
            'by_branch' => $byBranch,
            'by_date' => $byDate,
            'sessions' => $sessions,
        ]);
    }
}

