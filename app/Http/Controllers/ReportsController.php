<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\ReturnEntry;
use App\Models\ReturnItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use App\Support\Spa;

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
            ->where('sales.status', '!=', 'Voided')
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
            ->selectRaw('COALESCE(SUM(sale_items.cost_total), 0) as cogs')
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

        $customerReturnCogs = ReturnItem::query()
            ->join('returns', 'return_items.return_id', '=', 'returns.id')
            ->whereIn('returns.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('returns.branch_id', $branchScope['branch_id']);
            })
            ->where('returns.type', 'Customer')
            ->where('returns.status', 'Approved')
            ->whereBetween('returns.created_at', [$fromDate, $toDate])
            ->selectRaw('COALESCE(SUM(return_items.cost_total), 0) as return_cogs')
            ->value('return_cogs');

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
        $netCogs = (float) $cogs - (float) $customerReturnCogs;
        $grossProfit = $salesNetOfTaxAndReturns - $netCogs;
        $netProfit = $grossProfit - (float) $expensesTotal;

        $buildFinancialTrend = function (string $trendGroupBy) use ($salesBase, $returnsBase, $accessibleBranchIds, $branchScope, $fromDate, $toDate) {
            if (!in_array($trendGroupBy, ['daily', 'monthly', 'yearly'], true)) {
                $trendGroupBy = 'daily';
            }

            $salesPeriodExpr = match ($trendGroupBy) {
                'yearly' => DB::raw("DATE_FORMAT(sales.sale_date, '%Y-01-01')"),
                'monthly' => DB::raw("DATE_FORMAT(sales.sale_date, '%Y-%m-01')"),
                default => DB::raw("DATE(sales.sale_date)"),
            };

            $salesPeriodSelect = match ($trendGroupBy) {
                'yearly' => "DATE_FORMAT(sales.sale_date, '%Y-01-01') as period",
                'monthly' => "DATE_FORMAT(sales.sale_date, '%Y-%m-01') as period",
                default => "DATE(sales.sale_date) as period",
            };

            $returnsPeriodExpr = match ($trendGroupBy) {
                'yearly' => DB::raw("DATE_FORMAT(created_at, '%Y-01-01')"),
                'monthly' => DB::raw("DATE_FORMAT(created_at, '%Y-%m-01')"),
                default => DB::raw("DATE(created_at)"),
            };

            $returnsPeriodSelect = match ($trendGroupBy) {
                'yearly' => "DATE_FORMAT(created_at, '%Y-01-01') as period",
                'monthly' => "DATE_FORMAT(created_at, '%Y-%m-01') as period",
                default => "DATE(created_at) as period",
            };

            $expensesPeriodExpr = match ($trendGroupBy) {
                'yearly' => DB::raw("DATE_FORMAT(expense_date, '%Y-01-01')"),
                'monthly' => DB::raw("DATE_FORMAT(expense_date, '%Y-%m-01')"),
                default => DB::raw("DATE(expense_date)"),
            };

            $expensesPeriodSelect = match ($trendGroupBy) {
                'yearly' => "DATE_FORMAT(expense_date, '%Y-01-01') as period",
                'monthly' => "DATE_FORMAT(expense_date, '%Y-%m-01') as period",
                default => "DATE(expense_date) as period",
            };

            $salesTrend = (clone $salesBase)
                ->selectRaw($salesPeriodSelect)
                ->selectRaw('COALESCE(SUM(grand_total), 0) as grand_total')
                ->selectRaw('COALESCE(SUM(tax), 0) as tax')
                ->selectRaw('COALESCE(SUM(discount), 0) as discount')
                ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
                ->groupBy($salesPeriodExpr)
                ->orderBy($salesPeriodExpr)
                ->get();

            $cogsTrend = (clone $salesBase)
                ->join('sale_items', 'sales.id', '=', 'sale_items.sale_id')
                ->selectRaw($salesPeriodSelect)
                ->selectRaw('COALESCE(SUM(sale_items.cost_total), 0) as cogs')
                ->groupBy($salesPeriodExpr)
                ->orderBy($salesPeriodExpr)
                ->get();

            $customerReturnsTrend = (clone $returnsBase)
                ->where('type', 'Customer')
                ->selectRaw($returnsPeriodSelect)
                ->selectRaw('COALESCE(SUM(refund_amount), 0) as customer_returns')
                ->groupBy($returnsPeriodExpr)
                ->orderBy($returnsPeriodExpr)
                ->get();

            $returnCostPeriodExpr = match ($trendGroupBy) {
                'yearly' => DB::raw("DATE_FORMAT(returns.created_at, '%Y-01-01')"),
                'monthly' => DB::raw("DATE_FORMAT(returns.created_at, '%Y-%m-01')"),
                default => DB::raw('DATE(returns.created_at)'),
            };

            $returnCostPeriodSelect = match ($trendGroupBy) {
                'yearly' => "DATE_FORMAT(returns.created_at, '%Y-01-01') as period",
                'monthly' => "DATE_FORMAT(returns.created_at, '%Y-%m-01') as period",
                default => 'DATE(returns.created_at) as period',
            };

            $customerReturnCogsTrend = ReturnItem::query()
                ->join('returns', 'return_items.return_id', '=', 'returns.id')
                ->whereIn('returns.branch_id', $accessibleBranchIds)
                ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                    $q->where('returns.branch_id', $branchScope['branch_id']);
                })
                ->where('returns.type', 'Customer')
                ->where('returns.status', 'Approved')
                ->whereBetween('returns.created_at', [$fromDate, $toDate])
                ->selectRaw($returnCostPeriodSelect)
                ->selectRaw('COALESCE(SUM(return_items.cost_total), 0) as return_cogs')
                ->groupBy($returnCostPeriodExpr)
                ->orderBy($returnCostPeriodExpr)
                ->get();

            $expensesTrend = Expense::query()
                ->whereIn('branch_id', $accessibleBranchIds)
                ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                    $q->where('branch_id', $branchScope['branch_id']);
                })
                ->whereBetween('expense_date', [$fromDate->toDateString(), $toDate->toDateString()])
                ->selectRaw($expensesPeriodSelect)
                ->selectRaw('COALESCE(SUM(amount), 0) as expenses_total')
                ->groupBy($expensesPeriodExpr)
                ->orderBy($expensesPeriodExpr)
                ->get();

            $salesTrendByPeriod = $salesTrend->keyBy('period');
            $cogsTrendByPeriod = $cogsTrend->keyBy('period');
            $returnsTrendByPeriod = $customerReturnsTrend->keyBy('period');
            $returnCogsTrendByPeriod = $customerReturnCogsTrend->keyBy('period');
            $expensesTrendByPeriod = $expensesTrend->keyBy('period');

            $profitPeriods = collect([])
                ->merge($salesTrendByPeriod->keys())
                ->merge($cogsTrendByPeriod->keys())
                ->merge($returnsTrendByPeriod->keys())
                ->merge($returnCogsTrendByPeriod->keys())
                ->merge($expensesTrendByPeriod->keys())
                ->unique()
                ->sort()
                ->values();

            $profitTrend = $profitPeriods->map(function ($period) use ($salesTrendByPeriod, $cogsTrendByPeriod, $returnsTrendByPeriod, $returnCogsTrendByPeriod, $expensesTrendByPeriod) {
                $salesRow = $salesTrendByPeriod->get($period);
                $cogsRow = $cogsTrendByPeriod->get($period);
                $returnsRow = $returnsTrendByPeriod->get($period);
                $returnCogsRow = $returnCogsTrendByPeriod->get($period);
                $expensesRow = $expensesTrendByPeriod->get($period);

                $grandTotal = (float) ($salesRow->grand_total ?? 0);
                $tax = (float) ($salesRow->tax ?? 0);
                $netSales = $grandTotal - $tax;
                $customerReturnsAmount = (float) ($returnsRow->customer_returns ?? 0);
                $cogsAmount = (float) ($cogsRow->cogs ?? 0) - (float) ($returnCogsRow->return_cogs ?? 0);
                $expensesAmount = (float) ($expensesRow->expenses_total ?? 0);

                $grossProfitAmount = ($netSales - $customerReturnsAmount) - $cogsAmount;
                $netProfitAmount = $grossProfitAmount - $expensesAmount;

                return [
                    'period' => $period,
                    'sales' => $grandTotal,
                    'net_sales' => $netSales,
                    'customer_returns' => $customerReturnsAmount,
                    'cogs' => $cogsAmount,
                    'expenses_total' => $expensesAmount,
                    'gross_profit' => $grossProfitAmount,
                    'net_profit' => $netProfitAmount,
                ];
            });

            return [
                'sales_trend' => $salesTrend,
                'profit_trend' => $profitTrend,
            ];
        };

        $selectedFinancialTrend = $buildFinancialTrend($groupBy);
        $monthlyFinancialTrend = $buildFinancialTrend('monthly');
        $yearlyFinancialTrend = $buildFinancialTrend('yearly');

        $salesTrend = $selectedFinancialTrend['sales_trend'];
        $profitTrend = $selectedFinancialTrend['profit_trend'];

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
            ->where('sales.status', '!=', 'Voided')
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

        $salesReceivable = Sale::query()
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('sales.branch_id', $branchScope['branch_id']);
            })
            ->where('sales.status', '!=', 'Voided')
            ->whereDate('sales.sale_date', '<=', $toDate->toDateString())
            ->selectRaw("
                COALESCE(SUM(
                    CASE
                        WHEN sales.payment_status = 'Due' THEN sales.grand_total
                        WHEN sales.payment_status = 'Partial' THEN sales.grand_total - CASE
                            WHEN COALESCE(sales.amount_received, 0) > sales.grand_total THEN sales.grand_total
                            ELSE COALESCE(sales.amount_received, 0)
                        END
                        ELSE 0
                    END
                ), 0) as receivable_total
            ")
            ->value('receivable_total');

        $supplierPayable = Purchase::query()
            ->whereIn('purchases.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('purchases.branch_id', $branchScope['branch_id']);
            })
            ->whereDate('purchases.purchase_date', '<=', $toDate->toDateString())
            ->where('purchases.payment_status', '!=', 'Paid')
            ->selectRaw('COALESCE(SUM(purchases.due_amount), 0) as payable_total')
            ->value('payable_total');

        $balanceAssets = (float) ($inventoryValuation->purchase_value ?? 0) + (float) $salesReceivable;
        $balanceLiabilities = (float) $supplierPayable;

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

        return Spa::render('Reports/Index', [
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
                'cogs' => $netCogs,
                'gross_cogs' => (float) $cogs,
                'customer_return_cogs' => (float) $customerReturnCogs,
                'customer_returns' => (float) $customerReturns,
                'supplier_returns' => (float) $supplierReturns,
                'expenses_total' => (float) $expensesTotal,
                'gross_profit' => (float) $grossProfit,
                'net_profit' => (float) $netProfit,
                'inventory_purchase_value' => (float) ($inventoryValuation->purchase_value ?? 0),
                'inventory_selling_value' => (float) ($inventoryValuation->selling_value ?? 0),
            ],
            'balance_sheet' => [
                'inventory_asset' => (float) ($inventoryValuation->purchase_value ?? 0),
                'customer_receivables' => (float) $salesReceivable,
                'total_assets' => (float) $balanceAssets,
                'supplier_payables' => (float) $supplierPayable,
                'total_liabilities' => (float) $balanceLiabilities,
                'net_position' => (float) ($balanceAssets - $balanceLiabilities),
                'period_profit' => (float) $netProfit,
                'as_of_date' => $toDate->toDateString(),
            ],
            'sales_trend' => $salesTrend,
            'profit_trend' => $profitTrend,
            'financial_trends' => [
                'monthly' => $monthlyFinancialTrend['profit_trend'],
                'yearly' => $yearlyFinancialTrend['profit_trend'],
            ],
            'expenses_by_category' => $expensesByCategory,
            'branch_performance' => $branchPerformance,
            'expiring_batches' => $expiringBatches,
        ]);
    }

    public function saleRepresentatives(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);

        $duration = (string) $request->get('duration', 'month');
        if (!in_array($duration, ['week', 'month', 'year', 'custom'], true)) {
            $duration = 'month';
        }

        [$fromDate, $toDate] = $this->salesCustomerDateRange($request, $duration);
        $search = trim((string) $request->get('search', ''));

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $salesMetricScope = function ($query) use ($accessibleBranchIds, $branchScope, $fromDate, $toDate) {
            $query->whereIn('sales.branch_id', $accessibleBranchIds)
                ->whereBetween('sales.sale_date', [$fromDate, $toDate])
                ->where(function ($statusQuery) {
                    $statusQuery->whereNull('sales.status')
                        ->orWhere('sales.status', '!=', 'Voided');
                });

            if ($branchScope['mode'] !== 'all') {
                $query->where('sales.branch_id', $branchScope['branch_id']);
            }
        };

        $representativeQuery = User::query()
            ->select('users.*')
            ->with(['roles:id,name', 'branch:id,name', 'branches:id,name'])
            ->whereHas('roles', function ($query) {
                $query->where('name', '!=', 'Root');
            })
            ->where(function ($query) use ($accessibleBranchIds, $branchScope) {
                $targetBranchIds = $branchScope['mode'] === 'all'
                    ? $accessibleBranchIds
                    : collect([$branchScope['branch_id']])->filter();

                $query->whereIn('branch_id', $targetBranchIds)
                    ->orWhereHas('branches', function ($branchQuery) use ($targetBranchIds) {
                        $branchQuery->whereIn('branches.id', $targetBranchIds);
                    });
            })
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhereHas('branch', function ($branchQuery) use ($search) {
                            $branchQuery->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->withCount(['saleStaffSales as sales_count' => $salesMetricScope])
            ->withSum(['saleStaffSales as sale_power' => $salesMetricScope], 'grand_total')
            ->withAvg(['saleStaffSales as average_sale' => $salesMetricScope], 'grand_total')
            ->withMax(['saleStaffSales as last_sale_at' => $salesMetricScope], 'sale_date')
            ->orderByDesc('sale_power')
            ->orderBy('name');

        $allRepresentatives = (clone $representativeQuery)->get();

        $summary = [
            'representative_count' => $allRepresentatives->count(),
            'active_count' => $allRepresentatives->where('sales_count', '>', 0)->count(),
            'sales_count' => (int) $allRepresentatives->sum('sales_count'),
            'sale_power' => (float) $allRepresentatives->sum('sale_power'),
            'average_sale' => (float) ($allRepresentatives->sum('sales_count') > 0
                ? $allRepresentatives->sum('sale_power') / $allRepresentatives->sum('sales_count')
                : 0),
        ];

        $salesPowerChart = $allRepresentatives
            ->sortByDesc(fn ($representative) => (float) ($representative->sale_power ?? 0))
            ->take(12)
            ->map(fn ($representative) => [
                'id' => $representative->id,
                'name' => $representative->name,
                'sale_power' => (float) ($representative->sale_power ?? 0),
                'sales_count' => (int) ($representative->sales_count ?? 0),
                'average_sale' => (float) ($representative->average_sale ?? 0),
            ])
            ->values();

        $representatives = $representativeQuery
            ->paginate(15)
            ->withQueryString()
            ->through(function ($representative) {
                return [
                    'id' => $representative->id,
                    'name' => $representative->name,
                    'email' => $representative->email,
                    'phone' => $representative->phone,
                    'image_path' => $representative->image_path,
                    'sales_count' => (int) ($representative->sales_count ?? 0),
                    'sale_power' => (float) ($representative->sale_power ?? 0),
                    'average_sale' => (float) ($representative->average_sale ?? 0),
                    'last_sale_at' => $representative->last_sale_at,
                    'roles' => $representative->roles->map(fn ($role) => [
                        'id' => $role->id,
                        'name' => $role->name,
                    ])->values(),
                    'branch' => $representative->branch ? [
                        'id' => $representative->branch->id,
                        'name' => $representative->branch->name,
                    ] : null,
                    'branches' => $representative->branches->map(fn ($branch) => [
                        'id' => $branch->id,
                        'name' => $branch->name,
                    ])->values(),
                ];
            });

        return Spa::render('Finance/SaleRepresentative', [
            'branches' => $branches,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'duration' => $duration,
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
                'search' => $search,
            ],
            'summary' => $summary,
            'sales_power_chart' => $salesPowerChart,
            'representatives' => $representatives,
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

        $products = Product::select('id', 'name', 'generic_name', 'barcode')
            ->where('status', 'Active')
            ->orderBy('name')
            ->get();

        $batchQuery = InventoryBatch::query()
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
            ->with(['product:id,name', 'branch:id,name']);

        $expirySummary = [
            'total' => (clone $batchQuery)->count(),
            'expired' => (clone $batchQuery)->whereDate('inventory_batches.expiry_date', '<', now()->toDateString())->count(),
            'near30' => (clone $batchQuery)
                ->whereDate('inventory_batches.expiry_date', '>=', now()->toDateString())
                ->whereDate('inventory_batches.expiry_date', '<=', now()->addDays(30)->toDateString())
                ->count(),
        ];

        $batches = $batchQuery
            ->orderBy('inventory_batches.expiry_date')
            ->orderBy('inventory_batches.batch_number')
            ->paginate(15)
            ->withQueryString()
            ->through(function ($batch) {
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
            });

        return Spa::render('Reports/Expiry', [
            'branches' => $branches,
            'products' => $products,
            'batches' => $batches,
            'summary' => $expirySummary,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'product_id' => $productId,
                'from_date' => $fromDate?->toDateString() ?? '',
                'to_date' => $toDate?->toDateString() ?? '',
            ],
        ]);
    }

    public function lowBalance(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);

        $search = trim((string) $request->get('search', ''));
        $categoryId = (string) $request->get('category_id', '');
        $productStatus = (string) $request->get('product_status', 'Active');
        $stockStatus = (string) $request->get('stock_status', 'attention');

        if (!in_array($productStatus, ['all', 'Active', 'Inactive'], true)) {
            $productStatus = 'Active';
        }

        if (!in_array($stockStatus, ['attention', 'out', 'low', 'all'], true)) {
            $stockStatus = 'attention';
        }

        if ($categoryId !== '' && !Category::where('id', $categoryId)->exists()) {
            $categoryId = '';
        }

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $categories = Category::select('id', 'name')
            ->orderBy('name')
            ->get();

        $branchLabel = $branchScope['mode'] === 'all'
            ? 'All Accessible'
            : ($branches->firstWhere('id', $branchScope['branch_id'])?->name ?? 'Current Branch');

        $query = Product::query()
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('inventories', function ($join) use ($branchScope, $accessibleBranchIds) {
                $join->on('inventories.product_id', '=', 'products.id');

                if ($branchScope['mode'] === 'all') {
                    $join->whereIn('inventories.branch_id', $accessibleBranchIds);
                } else {
                    $join->where('inventories.branch_id', $branchScope['branch_id']);
                }
            })
            ->select([
                'products.id',
                'products.name',
                'products.generic_name',
                'products.barcode',
                'products.min_stock_level',
                'products.status',
                'categories.name as category_name',
            ])
            ->selectRaw('COALESCE(SUM(inventories.quantity), 0) as current_quantity')
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('products.name', 'like', "%{$search}%")
                        ->orWhere('products.generic_name', 'like', "%{$search}%")
                        ->orWhere('products.barcode', 'like', "%{$search}%");
                });
            })
            ->when($categoryId !== '', function ($q) use ($categoryId) {
                $q->where('products.category_id', $categoryId);
            })
            ->when($productStatus !== 'all', function ($q) use ($productStatus) {
                $q->where('products.status', $productStatus);
            })
            ->groupBy([
                'products.id',
                'products.name',
                'products.generic_name',
                'products.barcode',
                'products.min_stock_level',
                'products.status',
                'categories.name',
            ]);

        $mapLowBalanceRow = function ($product) use ($branchLabel) {
            $currentQuantity = (int) $product->current_quantity;
            $minLevel = (int) ($product->min_stock_level ?? 0);
            $shortage = max($minLevel - $currentQuantity, 0);

            if ($currentQuantity <= 0) {
                $status = 'Out of Stock';
            } elseif ($currentQuantity <= $minLevel) {
                $status = 'Low Balance';
            } else {
                $status = 'Healthy';
            }

            return [
                'id' => $product->id,
                'name' => $product->name,
                'generic_name' => $product->generic_name,
                'barcode' => $product->barcode,
                'category_name' => $product->category_name ?? 'N/A',
                'branch_name' => $branchLabel,
                'current_quantity' => $currentQuantity,
                'min_stock_level' => $minLevel,
                'shortage' => $shortage,
                'product_status' => $product->status,
                'stock_status' => $status,
            ];
        };

        $summaryRows = (clone $query)->get()
            ->map($mapLowBalanceRow)
            ->filter(function ($row) use ($stockStatus) {
                return match ($stockStatus) {
                    'out' => $row['current_quantity'] <= 0,
                    'low' => $row['current_quantity'] > 0 && $row['current_quantity'] <= $row['min_stock_level'],
                    'all' => true,
                    default => $row['current_quantity'] <= $row['min_stock_level'],
                };
            })
            ->sort(function ($a, $b) {
                $shortageComparison = $b['shortage'] <=> $a['shortage'];

                return $shortageComparison !== 0
                    ? $shortageComparison
                    : strcasecmp($a['name'], $b['name']);
            })
            ->values();

        $summary = [
            'total' => $summaryRows->count(),
            'out' => $summaryRows->where('stock_status', 'Out of Stock')->count(),
            'low' => $summaryRows->where('stock_status', 'Low Balance')->count(),
            'shortage' => (int) $summaryRows->sum('shortage'),
        ];

        if ($stockStatus === 'out') {
            $query->havingRaw('current_quantity <= 0');
        } elseif ($stockStatus === 'low') {
            $query->havingRaw('current_quantity > 0 AND current_quantity <= products.min_stock_level');
        } elseif ($stockStatus === 'attention') {
            $query->havingRaw('current_quantity <= products.min_stock_level');
        }

        return Spa::render('Reports/LowBalance', [
            'branches' => $branches,
            'categories' => $categories,
            'items' => $query
                ->orderByRaw('GREATEST(products.min_stock_level - COALESCE(SUM(inventories.quantity), 0), 0) DESC')
                ->orderBy('products.name')
                ->paginate(15)
                ->withQueryString()
                ->through($mapLowBalanceRow),
            'summary' => $summary,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'search' => $search,
                'category_id' => $categoryId,
                'product_status' => $productStatus,
                'stock_status' => $stockStatus,
            ],
        ]);
    }

    protected function purchaseReportFilters(Request $request): array
    {
        $paymentStatus = (string) $request->get('payment_status', 'all');
        if (!in_array($paymentStatus, ['all', 'Paid', 'Partial', 'Due'], true)) {
            $paymentStatus = 'all';
        }

        return [
            'payment_status' => $paymentStatus,
            'search' => trim((string) $request->get('search', '')),
        ];
    }

    protected function salesCustomerReportFilters(Request $request): array
    {
        $duration = (string) $request->get('duration', 'month');
        if (!in_array($duration, ['week', 'month', 'year', 'custom'], true)) {
            $duration = 'month';
        }

        return [
            'duration' => $duration,
        ];
    }

    protected function salesCustomerDateRange(Request $request, string $duration): array
    {
        $hasExplicitDates = $request->filled('from_date') || $request->filled('to_date');

        if ($duration === 'custom' || $hasExplicitDates) {
            return $this->parseDateRange($request);
        }

        return match ($duration) {
            'week' => [now()->startOfWeek()->startOfDay(), now()->endOfWeek()->endOfDay()],
            'year' => [now()->startOfYear()->startOfDay(), now()->endOfYear()->endOfDay()],
            default => [now()->startOfMonth()->startOfDay(), now()->endOfMonth()->endOfDay()],
        };
    }

    protected function applySalesCustomerReportScope($query, $accessibleBranchIds, array $branchScope, Carbon $fromDate, Carbon $toDate)
    {
        return $query
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('sales.branch_id', $branchScope['branch_id']);
            })
            ->where('sales.status', '!=', 'Voided')
            ->whereBetween('sales.sale_date', [$fromDate, $toDate]);
    }

    protected function salesCustomerBaseQuery($accessibleBranchIds, array $branchScope, Carbon $fromDate, Carbon $toDate)
    {
        return $this->applySalesCustomerReportScope(
            Sale::query(),
            $accessibleBranchIds,
            $branchScope,
            $fromDate,
            $toDate
        );
    }

    protected function salesCustomerAggregateQuery($accessibleBranchIds, array $branchScope, Carbon $fromDate, Carbon $toDate, string $search = '')
    {
        $returnSubquery = ReturnEntry::query()
            ->join('sales as return_sales', 'returns.reference_id', '=', 'return_sales.id')
            ->where('returns.type', 'Customer')
            ->where('returns.status', 'Approved')
            ->whereIn('returns.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('returns.branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('returns.created_at', [$fromDate, $toDate])
            ->groupBy('return_sales.customer_id')
            ->selectRaw('return_sales.customer_id')
            ->selectRaw('COALESCE(SUM(returns.refund_amount), 0) as return_amount');

        return Customer::query()
            ->join('sales', function ($join) use ($accessibleBranchIds, $branchScope, $fromDate, $toDate) {
                $join->on('sales.customer_id', '=', 'customers.id')
                    ->whereIn('sales.branch_id', $accessibleBranchIds)
                    ->where('sales.status', '!=', 'Voided')
                    ->whereBetween('sales.sale_date', [$fromDate, $toDate]);

                if ($branchScope['mode'] !== 'all') {
                    $join->where('sales.branch_id', $branchScope['branch_id']);
                }
            })
            ->leftJoinSub($returnSubquery, 'customer_returns', function ($join) {
                $join->on('customer_returns.customer_id', '=', 'customers.id');
            })
            ->select([
                'customers.id',
                'customers.name',
                'customers.phone',
                'customers.email',
                'customers.address',
            ])
            ->selectRaw('COUNT(sales.id) as sale_count')
            ->selectRaw('COALESCE(SUM(sales.total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(sales.discount), 0) as discount')
            ->selectRaw('COALESCE(SUM(sales.tax), 0) as tax')
            ->selectRaw('COALESCE(SUM(sales.grand_total), 0) as grand_total')
            ->selectRaw('COALESCE(AVG(sales.grand_total), 0) as average_sale')
            ->selectRaw('MIN(sales.sale_date) as first_sale_date')
            ->selectRaw('MAX(sales.sale_date) as last_sale_date')
            ->selectRaw('COALESCE(MAX(customer_returns.return_amount), 0) as return_amount')
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('customers.name', 'like', "%{$search}%")
                        ->orWhere('customers.phone', 'like', "%{$search}%")
                        ->orWhere('customers.email', 'like', "%{$search}%");
                });
            })
            ->groupBy([
                'customers.id',
                'customers.name',
                'customers.phone',
                'customers.email',
                'customers.address',
            ]);
    }

    public function salesByCustomers(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);
        $reportFilters = $this->salesCustomerReportFilters($request);
        $duration = $reportFilters['duration'];
        [$fromDate, $toDate] = $this->salesCustomerDateRange($request, $duration);

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $base = $this->salesCustomerBaseQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate);

        $summary = (clone $base)
            ->selectRaw('COUNT(*) as sale_count')
            ->selectRaw('COUNT(DISTINCT customer_id) as customer_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(discount), 0) as discount')
            ->selectRaw('COALESCE(SUM(tax), 0) as tax')
            ->selectRaw('COALESCE(SUM(grand_total), 0) as grand_total')
            ->selectRaw('COALESCE(AVG(grand_total), 0) as average_sale')
            ->first();

        $knownCustomerSummary = (clone $base)
            ->whereNotNull('customer_id')
            ->selectRaw('COUNT(*) as sale_count')
            ->selectRaw('COALESCE(SUM(grand_total), 0) as grand_total')
            ->first();

        $walkInSummary = (clone $base)
            ->whereNull('customer_id')
            ->selectRaw('COUNT(*) as sale_count')
            ->selectRaw('COALESCE(SUM(grand_total), 0) as grand_total')
            ->first();

        $customerReturns = ReturnEntry::query()
            ->join('sales', 'returns.reference_id', '=', 'sales.id')
            ->where('returns.type', 'Customer')
            ->where('returns.status', 'Approved')
            ->whereIn('returns.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('returns.branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('returns.created_at', [$fromDate, $toDate])
            ->selectRaw('COALESCE(SUM(returns.refund_amount), 0) as return_total')
            ->value('return_total');

        $salesTrend = (clone $base)
            ->selectRaw('DATE(sale_date) as period')
            ->selectRaw('COUNT(*) as sale_count')
            ->selectRaw('COUNT(DISTINCT customer_id) as customer_count')
            ->selectRaw('COALESCE(SUM(grand_total), 0) as grand_total')
            ->groupBy(DB::raw('DATE(sale_date)'))
            ->orderBy(DB::raw('DATE(sale_date)'))
            ->get();

        $topProducts = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('sales.branch_id', $branchScope['branch_id']);
            })
            ->where('sales.status', '!=', 'Voided')
            ->whereBetween('sales.sale_date', [$fromDate, $toDate])
            ->selectRaw('products.id as product_id')
            ->selectRaw("COALESCE(products.name, 'Unknown Product') as product_name")
            ->selectRaw('COALESCE(products.generic_name, "") as generic_name')
            ->selectRaw('COUNT(DISTINCT sales.id) as sale_count')
            ->selectRaw('COUNT(DISTINCT sales.customer_id) as customer_count')
            ->selectRaw('COALESCE(SUM(sale_items.quantity), 0) as quantity')
            ->selectRaw('COALESCE(SUM(COALESCE(sale_items.foc_quantity, 0)), 0) as foc_quantity')
            ->selectRaw('COALESCE(SUM(sale_items.base_quantity + COALESCE(sale_items.foc_base_quantity, 0)), 0) as base_quantity')
            ->selectRaw('COALESCE(SUM(sale_items.total_price), 0) as sale_amount')
            ->groupBy('products.id', 'products.name', 'products.generic_name')
            ->orderByDesc('sale_amount')
            ->limit(10)
            ->get();

        $topCustomers = $this->salesCustomerAggregateQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate)
            ->orderByDesc('grand_total')
            ->orderBy('customers.name')
            ->limit(8)
            ->get()
            ->map(function ($customer) {
                return [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'email' => $customer->email,
                    'sale_count' => (int) $customer->sale_count,
                    'total_amount' => (float) $customer->total_amount,
                    'discount' => (float) $customer->discount,
                    'tax' => (float) $customer->tax,
                    'grand_total' => (float) $customer->grand_total,
                    'average_sale' => (float) $customer->average_sale,
                    'return_amount' => (float) $customer->return_amount,
                    'net_amount' => (float) $customer->grand_total - (float) $customer->return_amount,
                    'first_sale_date' => $customer->first_sale_date,
                    'last_sale_date' => $customer->last_sale_date,
                ];
            });

        return Spa::render('Reports/SalesByCustomers', [
            'branches' => $branches,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'duration' => $duration,
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
            ],
            'summary' => [
                'sale_count' => (int) ($summary->sale_count ?? 0),
                'customer_count' => (int) ($summary->customer_count ?? 0),
                'total_amount' => (float) ($summary->total_amount ?? 0),
                'discount' => (float) ($summary->discount ?? 0),
                'tax' => (float) ($summary->tax ?? 0),
                'grand_total' => (float) ($summary->grand_total ?? 0),
                'average_sale' => (float) ($summary->average_sale ?? 0),
                'known_customer_sale_count' => (int) ($knownCustomerSummary->sale_count ?? 0),
                'known_customer_grand_total' => (float) ($knownCustomerSummary->grand_total ?? 0),
                'walk_in_sale_count' => (int) ($walkInSummary->sale_count ?? 0),
                'walk_in_grand_total' => (float) ($walkInSummary->grand_total ?? 0),
                'customer_returns' => (float) $customerReturns,
                'net_amount' => (float) ($summary->grand_total ?? 0) - (float) $customerReturns,
            ],
            'sales_trend' => $salesTrend,
            'top_customers' => $topCustomers,
            'top_products' => $topProducts,
        ]);
    }

    protected function applyPurchaseReportScope($query, $accessibleBranchIds, array $branchScope, Carbon $fromDate, Carbon $toDate, string $paymentStatus, ?string $supplierId = null)
    {
        return $query
            ->whereIn('purchases.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('purchases.branch_id', $branchScope['branch_id']);
            })
            ->when($supplierId, function ($q) use ($supplierId) {
                $q->where('purchases.supplier_id', $supplierId);
            })
            ->when($paymentStatus !== 'all', function ($q) use ($paymentStatus) {
                $q->where('purchases.payment_status', $paymentStatus);
            })
            ->whereBetween('purchases.purchase_date', [$fromDate->toDateString(), $toDate->toDateString()]);
    }

    protected function purchaseBaseQuery($accessibleBranchIds, array $branchScope, Carbon $fromDate, Carbon $toDate, string $paymentStatus, ?string $supplierId = null)
    {
        return $this->applyPurchaseReportScope(
            Purchase::query(),
            $accessibleBranchIds,
            $branchScope,
            $fromDate,
            $toDate,
            $paymentStatus,
            $supplierId
        );
    }

    protected function purchaseItemBaseQuery($accessibleBranchIds, array $branchScope, Carbon $fromDate, Carbon $toDate, string $paymentStatus, ?string $supplierId = null)
    {
        return $this->applyPurchaseReportScope(
            DB::table('purchase_items')->join('purchases', 'purchase_items.purchase_id', '=', 'purchases.id'),
            $accessibleBranchIds,
            $branchScope,
            $fromDate,
            $toDate,
            $paymentStatus,
            $supplierId
        );
    }

    protected function purchaseSupplierAggregateQuery($accessibleBranchIds, array $branchScope, Carbon $fromDate, Carbon $toDate, string $paymentStatus, string $search = '')
    {
        return Supplier::query()
            ->leftJoin('purchases', function ($join) use ($accessibleBranchIds, $branchScope, $fromDate, $toDate, $paymentStatus) {
                $join->on('purchases.supplier_id', '=', 'suppliers.id')
                    ->whereIn('purchases.branch_id', $accessibleBranchIds)
                    ->whereBetween('purchases.purchase_date', [$fromDate->toDateString(), $toDate->toDateString()]);

                if ($branchScope['mode'] !== 'all') {
                    $join->where('purchases.branch_id', $branchScope['branch_id']);
                }

                if ($paymentStatus !== 'all') {
                    $join->where('purchases.payment_status', $paymentStatus);
                }
            })
            ->select([
                'suppliers.id',
                'suppliers.name',
                'suppliers.phone',
                'suppliers.email',
                'suppliers.payment_terms',
                'suppliers.credit_limit',
                'suppliers.balance',
            ])
            ->selectRaw('COUNT(purchases.id) as purchase_count')
            ->selectRaw('COALESCE(SUM(purchases.total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(purchases.paid_amount), 0) as paid_amount')
            ->selectRaw('COALESCE(SUM(purchases.due_amount), 0) as due_amount')
            ->selectRaw('COALESCE(AVG(purchases.total_amount), 0) as average_purchase')
            ->selectRaw('MAX(purchases.purchase_date) as last_purchase_date')
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('suppliers.name', 'like', "%{$search}%")
                        ->orWhere('suppliers.phone', 'like', "%{$search}%")
                        ->orWhere('suppliers.email', 'like', "%{$search}%");
                });
            })
            ->groupBy([
                'suppliers.id',
                'suppliers.name',
                'suppliers.phone',
                'suppliers.email',
                'suppliers.payment_terms',
                'suppliers.credit_limit',
                'suppliers.balance',
            ])
            ->havingRaw('COUNT(purchases.id) > 0');
    }

    public function purchases(Request $request)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);
        [$fromDate, $toDate] = $this->parseDateRange($request);
        $reportFilters = $this->purchaseReportFilters($request);
        $paymentStatus = $reportFilters['payment_status'];
        $search = $reportFilters['search'];

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $base = $this->purchaseBaseQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate, $paymentStatus);

        $summary = (clone $base)
            ->selectRaw('COUNT(*) as purchase_count')
            ->selectRaw('COUNT(DISTINCT supplier_id) as supplier_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(paid_amount), 0) as paid_amount')
            ->selectRaw('COALESCE(SUM(due_amount), 0) as due_amount')
            ->selectRaw('COALESCE(AVG(total_amount), 0) as average_purchase')
            ->first();

        $itemSummary = $this->purchaseItemBaseQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate, $paymentStatus)
            ->selectRaw('COUNT(*) as line_count')
            ->selectRaw('COALESCE(SUM(purchase_items.quantity), 0) as quantity')
            ->selectRaw('COALESCE(SUM(COALESCE(purchase_items.foc_quantity, 0)), 0) as foc_quantity')
            ->selectRaw('COALESCE(SUM(purchase_items.total_price), 0) as item_total')
            ->first();

        $statusBreakdown = (clone $base)
            ->select('payment_status')
            ->selectRaw('COUNT(*) as purchase_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(due_amount), 0) as due_amount')
            ->groupBy('payment_status')
            ->orderBy('payment_status')
            ->get();

        $purchaseTrend = (clone $base)
            ->selectRaw('DATE(purchase_date) as period')
            ->selectRaw('COUNT(*) as purchase_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(paid_amount), 0) as paid_amount')
            ->selectRaw('COALESCE(SUM(due_amount), 0) as due_amount')
            ->groupBy(DB::raw('DATE(purchase_date)'))
            ->orderBy(DB::raw('DATE(purchase_date)'))
            ->get();

        $topSuppliers = $this->purchaseSupplierAggregateQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate, $paymentStatus)
            ->orderByDesc('total_amount')
            ->limit(8)
            ->get();

        $suppliers = $this->purchaseSupplierAggregateQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate, $paymentStatus, $search)
            ->orderByDesc('total_amount')
            ->orderBy('suppliers.name')
            ->paginate(10)
            ->withQueryString()
            ->through(function ($supplier) {
                return [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'phone' => $supplier->phone,
                    'email' => $supplier->email,
                    'payment_terms' => $supplier->payment_terms,
                    'credit_limit' => (float) $supplier->credit_limit,
                    'balance' => (float) $supplier->balance,
                    'purchase_count' => (int) $supplier->purchase_count,
                    'total_amount' => (float) $supplier->total_amount,
                    'paid_amount' => (float) $supplier->paid_amount,
                    'due_amount' => (float) $supplier->due_amount,
                    'average_purchase' => (float) $supplier->average_purchase,
                    'last_purchase_date' => $supplier->last_purchase_date,
                ];
            });

        return Spa::render('Reports/Purchases', [
            'branches' => $branches,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
                'payment_status' => $paymentStatus,
                'search' => $search,
            ],
            'summary' => [
                'purchase_count' => (int) ($summary->purchase_count ?? 0),
                'supplier_count' => (int) ($summary->supplier_count ?? 0),
                'total_amount' => (float) ($summary->total_amount ?? 0),
                'paid_amount' => (float) ($summary->paid_amount ?? 0),
                'due_amount' => (float) ($summary->due_amount ?? 0),
                'average_purchase' => (float) ($summary->average_purchase ?? 0),
                'line_count' => (int) ($itemSummary->line_count ?? 0),
                'quantity' => (int) ($itemSummary->quantity ?? 0),
                'foc_quantity' => (int) ($itemSummary->foc_quantity ?? 0),
                'item_total' => (float) ($itemSummary->item_total ?? 0),
            ],
            'status_breakdown' => $statusBreakdown,
            'purchase_trend' => $purchaseTrend,
            'top_suppliers' => $topSuppliers,
            'suppliers' => $suppliers,
        ]);
    }

    public function purchaseSupplier(Request $request, Supplier $supplier)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);
        [$fromDate, $toDate] = $this->parseDateRange($request);
        $reportFilters = $this->purchaseReportFilters($request);
        $paymentStatus = $reportFilters['payment_status'];

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $base = $this->purchaseBaseQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate, $paymentStatus, $supplier->id);

        $summary = (clone $base)
            ->selectRaw('COUNT(*) as purchase_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(paid_amount), 0) as paid_amount')
            ->selectRaw('COALESCE(SUM(due_amount), 0) as due_amount')
            ->selectRaw('COALESCE(AVG(total_amount), 0) as average_purchase')
            ->selectRaw('MIN(purchase_date) as first_purchase_date')
            ->selectRaw('MAX(purchase_date) as last_purchase_date')
            ->first();

        $itemSummary = $this->purchaseItemBaseQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate, $paymentStatus, $supplier->id)
            ->selectRaw('COUNT(*) as line_count')
            ->selectRaw('COALESCE(SUM(purchase_items.quantity), 0) as quantity')
            ->selectRaw('COALESCE(SUM(COALESCE(purchase_items.foc_quantity, 0)), 0) as foc_quantity')
            ->selectRaw('COALESCE(SUM(purchase_items.total_price), 0) as item_total')
            ->first();

        $statusBreakdown = (clone $base)
            ->select('payment_status')
            ->selectRaw('COUNT(*) as purchase_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(due_amount), 0) as due_amount')
            ->groupBy('payment_status')
            ->orderBy('payment_status')
            ->get();

        $purchaseTrend = (clone $base)
            ->selectRaw('DATE(purchase_date) as period')
            ->selectRaw('COUNT(*) as purchase_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(paid_amount), 0) as paid_amount')
            ->selectRaw('COALESCE(SUM(due_amount), 0) as due_amount')
            ->groupBy(DB::raw('DATE(purchase_date)'))
            ->orderBy(DB::raw('DATE(purchase_date)'))
            ->get();

        $categorySummary = $this->purchaseItemBaseQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate, $paymentStatus, $supplier->id)
            ->leftJoin('products', 'purchase_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->selectRaw("COALESCE(categories.name, 'Uncategorized') as category_name")
            ->selectRaw('COUNT(*) as line_count')
            ->selectRaw('COALESCE(SUM(purchase_items.total_price), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(purchase_items.quantity + COALESCE(purchase_items.foc_quantity, 0)), 0) as received_quantity')
            ->groupBy('category_name')
            ->orderByDesc('total_amount')
            ->limit(12)
            ->get();

        $productSummary = $this->purchaseItemBaseQuery($accessibleBranchIds, $branchScope, $fromDate, $toDate, $paymentStatus, $supplier->id)
            ->leftJoin('products', 'purchase_items.product_id', '=', 'products.id')
            ->selectRaw('products.id as product_id')
            ->selectRaw("COALESCE(products.name, 'Unknown product') as product_name")
            ->selectRaw('COUNT(DISTINCT purchases.id) as purchase_count')
            ->selectRaw('COUNT(*) as line_count')
            ->selectRaw('COALESCE(SUM(purchase_items.quantity + COALESCE(purchase_items.foc_quantity, 0)), 0) as received_quantity')
            ->selectRaw('COALESCE(SUM(purchase_items.total_price), 0) as total_amount')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_amount')
            ->limit(15)
            ->get();

        $paymentsBase = SupplierPayment::query()
            ->where('supplier_id', $supplier->id)
            ->whereIn('branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('branch_id', $branchScope['branch_id']);
            })
            ->whereBetween('payment_date', [$fromDate->toDateString(), $toDate->toDateString()]);

        $paymentSummary = (clone $paymentsBase)
            ->selectRaw('COUNT(*) as payment_count')
            ->selectRaw('COALESCE(SUM(amount), 0) as payment_total')
            ->first();

        $payments = (clone $paymentsBase)
            ->with(['branch:id,name', 'purchase:id,invoice_number', 'user:id,name'])
            ->orderByDesc('payment_date')
            ->limit(20)
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'payment_date' => optional($payment->payment_date)->toDateString(),
                    'amount' => (float) $payment->amount,
                    'payment_method' => $payment->payment_method,
                    'reference_number' => $payment->reference_number,
                    'branch_name' => $payment->branch?->name ?? '-',
                    'invoice_number' => $payment->purchase?->invoice_number ?? '-',
                    'user_name' => $payment->user?->name ?? '-',
                ];
            });

        $purchases = (clone $base)
            ->with(['branch:id,name', 'user:id,name'])
            ->withCount('items')
            ->orderByDesc('purchase_date')
            ->orderByDesc('created_at')
            ->paginate(12)
            ->withQueryString()
            ->through(function ($purchase) {
                return [
                    'id' => $purchase->id,
                    'invoice_number' => $purchase->invoice_number,
                    'purchase_date' => optional($purchase->purchase_date)->toDateString(),
                    'branch_name' => $purchase->branch?->name ?? '-',
                    'user_name' => $purchase->user?->name ?? '-',
                    'payment_status' => $purchase->payment_status,
                    'items_count' => (int) $purchase->items_count,
                    'total_amount' => (float) $purchase->total_amount,
                    'paid_amount' => (float) $purchase->paid_amount,
                    'due_amount' => (float) $purchase->due_amount,
                ];
            });

        return Spa::render('Reports/PurchaseSupplier', [
            'branches' => $branches,
            'supplier' => [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
                'payment_terms' => $supplier->payment_terms,
                'credit_limit' => (float) $supplier->credit_limit,
                'balance' => (float) $supplier->balance,
            ],
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
                'payment_status' => $paymentStatus,
            ],
            'summary' => [
                'purchase_count' => (int) ($summary->purchase_count ?? 0),
                'total_amount' => (float) ($summary->total_amount ?? 0),
                'paid_amount' => (float) ($summary->paid_amount ?? 0),
                'due_amount' => (float) ($summary->due_amount ?? 0),
                'average_purchase' => (float) ($summary->average_purchase ?? 0),
                'first_purchase_date' => $summary->first_purchase_date ?? null,
                'last_purchase_date' => $summary->last_purchase_date ?? null,
                'line_count' => (int) ($itemSummary->line_count ?? 0),
                'quantity' => (int) ($itemSummary->quantity ?? 0),
                'foc_quantity' => (int) ($itemSummary->foc_quantity ?? 0),
                'item_total' => (float) ($itemSummary->item_total ?? 0),
                'payment_count' => (int) ($paymentSummary->payment_count ?? 0),
                'payment_total' => (float) ($paymentSummary->payment_total ?? 0),
            ],
            'status_breakdown' => $statusBreakdown,
            'purchase_trend' => $purchaseTrend,
            'category_summary' => $categorySummary,
            'product_summary' => $productSummary,
            'payments' => $payments,
            'purchases' => $purchases,
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
            ->paginate(15)
            ->withQueryString()
            ->through(function ($session) {
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
            });

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

        return Spa::render('Reports/CashSessions', [
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

