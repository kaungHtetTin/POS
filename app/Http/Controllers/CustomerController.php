<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\ReturnEntry;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CustomerController extends Controller
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
            return ['mode' => 'all', 'branch_id' => null];
        }

        $branchId = $request->get('branch_id');

        if ($branchId === null || $branchId === '' || $branchId === 'all') {
            return ['mode' => 'all', 'branch_id' => null];
        }

        if (!in_array($branchId, $accessibleBranchIds->toArray(), true)) {
            abort(403);
        }

        return ['mode' => 'specific', 'branch_id' => $branchId];
    }

    protected function parseNullableDateRange(Request $request): array
    {
        $fromDate = null;
        $toDate = null;

        if ($request->filled('from_date')) {
            try {
                $fromDate = Carbon::parse($request->get('from_date'))->startOfDay();
            } catch (\Throwable $e) {
                $fromDate = null;
            }
        }

        if ($request->filled('to_date')) {
            try {
                $toDate = Carbon::parse($request->get('to_date'))->endOfDay();
            } catch (\Throwable $e) {
                $toDate = null;
            }
        }

        if ($fromDate && $toDate && $fromDate->greaterThan($toDate)) {
            [$fromDate, $toDate] = [$toDate->copy()->startOfDay(), $fromDate->copy()->endOfDay()];
        }

        return [$fromDate, $toDate];
    }

    public function index(Request $request)
    {
        $query = Customer::query()->withCount('sales');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('phone', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        return Inertia::render('Customers/Index', [
            'customers' => $query->latest()->paginate(15)->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function show(Request $request, string $locale, Customer $customer)
    {
        $user = $request->user();
        $accessibleBranchIds = $this->accessibleBranchIds($user);
        $branchScope = $this->resolveBranchScope($request, $user, $accessibleBranchIds);
        [$fromDate, $toDate] = $this->parseNullableDateRange($request);

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $salesBase = Sale::query()
            ->where('sales.customer_id', $customer->id)
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('sales.branch_id', $branchScope['branch_id']);
            })
            ->where('sales.status', '!=', 'Voided')
            ->when($fromDate, function ($q) use ($fromDate) {
                $q->where('sales.sale_date', '>=', $fromDate);
            })
            ->when($toDate, function ($q) use ($toDate) {
                $q->where('sales.sale_date', '<=', $toDate);
            });

        $summary = (clone $salesBase)
            ->selectRaw('COUNT(*) as sale_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_amount')
            ->selectRaw('COALESCE(SUM(discount), 0) as discount')
            ->selectRaw('COALESCE(SUM(tax), 0) as tax')
            ->selectRaw('COALESCE(SUM(grand_total), 0) as grand_total')
            ->selectRaw('COALESCE(AVG(grand_total), 0) as average_sale')
            ->selectRaw('MIN(sale_date) as first_sale_date')
            ->selectRaw('MAX(sale_date) as last_sale_date')
            ->first();

        $returnsBase = ReturnEntry::query()
            ->join('sales', 'returns.reference_id', '=', 'sales.id')
            ->where('returns.type', 'Customer')
            ->where('returns.status', 'Approved')
            ->where('sales.customer_id', $customer->id)
            ->whereIn('returns.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('returns.branch_id', $branchScope['branch_id']);
            })
            ->when($fromDate, function ($q) use ($fromDate) {
                $q->where('returns.created_at', '>=', $fromDate);
            })
            ->when($toDate, function ($q) use ($toDate) {
                $q->where('returns.created_at', '<=', $toDate);
            });

        $customerReturns = (clone $returnsBase)
            ->selectRaw('COALESCE(SUM(returns.refund_amount), 0) as refund_total')
            ->value('refund_total');

        $salesTrend = (clone $salesBase)
            ->selectRaw("DATE_FORMAT(sales.sale_date, '%Y-%m-01') as period")
            ->selectRaw('COUNT(*) as sale_count')
            ->selectRaw('COALESCE(SUM(grand_total), 0) as grand_total')
            ->selectRaw('COALESCE(SUM(tax), 0) as tax')
            ->groupBy(DB::raw("DATE_FORMAT(sales.sale_date, '%Y-%m-01')"))
            ->orderBy(DB::raw("DATE_FORMAT(sales.sale_date, '%Y-%m-01')"))
            ->get();

        $topProducts = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.customer_id', $customer->id)
            ->whereIn('sales.branch_id', $accessibleBranchIds)
            ->when($branchScope['mode'] !== 'all', function ($q) use ($branchScope) {
                $q->where('sales.branch_id', $branchScope['branch_id']);
            })
            ->where('sales.status', '!=', 'Voided')
            ->when($fromDate, function ($q) use ($fromDate) {
                $q->where('sales.sale_date', '>=', $fromDate);
            })
            ->when($toDate, function ($q) use ($toDate) {
                $q->where('sales.sale_date', '<=', $toDate);
            })
            ->selectRaw('products.id as product_id')
            ->selectRaw("COALESCE(products.name, 'Unknown Product') as product_name")
            ->selectRaw('COALESCE(products.generic_name, "") as generic_name')
            ->selectRaw('COUNT(DISTINCT sales.id) as sale_count')
            ->selectRaw('COALESCE(SUM(sale_items.quantity), 0) as quantity')
            ->selectRaw('COALESCE(SUM(COALESCE(sale_items.foc_quantity, 0)), 0) as foc_quantity')
            ->selectRaw('COALESCE(SUM(sale_items.total_price), 0) as sale_amount')
            ->groupBy('products.id', 'products.name', 'products.generic_name')
            ->orderByDesc('sale_amount')
            ->limit(10)
            ->get();

        $sales = (clone $salesBase)
            ->with(['branch:id,name', 'user:id,name', 'saleStaff:id,name'])
            ->latest('sales.sale_date')
            ->latest('sales.created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(function ($sale) {
                return [
                    'id' => $sale->id,
                    'invoice_number' => $sale->invoice_number,
                    'sale_date' => optional($sale->sale_date)->toDateTimeString(),
                    'branch_name' => $sale->branch?->name ?? '-',
                    'cashier_name' => $sale->user?->name ?? '-',
                    'sale_staff_name' => $sale->saleStaff?->name ?? $sale->user?->name ?? '-',
                    'total_amount' => (float) $sale->total_amount,
                    'discount' => (float) $sale->discount,
                    'tax' => (float) $sale->tax,
                    'grand_total' => (float) $sale->grand_total,
                    'payment_method' => $sale->payment_method,
                    'payment_status' => $sale->payment_status,
                ];
            });

        return Inertia::render('Customers/Show', [
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'address' => $customer->address,
                'created_at' => optional($customer->created_at)->toDateTimeString(),
            ],
            'branches' => $branches,
            'filters' => [
                'branch_id' => $branchScope['mode'] === 'all' ? 'all' : $branchScope['branch_id'],
                'from_date' => $fromDate?->toDateString() ?? '',
                'to_date' => $toDate?->toDateString() ?? '',
            ],
            'summary' => [
                'sale_count' => (int) ($summary->sale_count ?? 0),
                'total_amount' => (float) ($summary->total_amount ?? 0),
                'discount' => (float) ($summary->discount ?? 0),
                'tax' => (float) ($summary->tax ?? 0),
                'grand_total' => (float) ($summary->grand_total ?? 0),
                'average_sale' => (float) ($summary->average_sale ?? 0),
                'customer_returns' => (float) $customerReturns,
                'net_amount' => (float) ($summary->grand_total ?? 0) - (float) $customerReturns,
                'first_sale_date' => $summary->first_sale_date ?? null,
                'last_sale_date' => $summary->last_sale_date ?? null,
            ],
            'sales_trend' => $salesTrend,
            'top_products' => $topProducts,
            'sales' => $sales,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        Customer::create($validated);

        return redirect()->back()->with('success', 'Customer created successfully.');
    }

    public function update(Request $request, string $locale, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        $customer->update($validated);

        return redirect()->back()->with('success', 'Customer updated successfully.');
    }

    public function destroy(string $locale, Customer $customer)
    {
        if ($customer->sales()->exists()) {
            return redirect()->back()->with('error', 'Customer cannot be deleted because they have related sales.');
        }

        $customer->delete();

        return redirect()->back()->with('success', 'Customer deleted successfully.');
    }
}
