<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Purchase;
use App\Models\ReturnEntry;
use App\Models\Sale;
use App\Models\Setting;
use App\Models\StockTransfer;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tightenco\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? array_merge($request->user()->toArray(), [
                    'roles' => $request->user()->roles->pluck('name'),
                    'permissions' => $request->user()->roles->flatMap->permissions->pluck('slug')->unique()->values(),
                    'current_branch_id' => $request->user()->currentBranchId(),
                    'accessible_branches' => $this->getAccessibleBranches($request),
                ]) : null,
            ],
            'locale' => app()->getLocale(),
            'translations' => function () {
                $locale = app()->getLocale();
                $file = base_path("lang/{$locale}.json");
                if (file_exists($file)) {
                    return json_decode(file_get_contents($file), true);
                }
                return [];
            },
            'ziggy' => function () use ($request) {
                $locale = app()->getLocale();
                $ziggy = (new Ziggy(null, $request->url()))->toArray();
                $path = parse_url(url('/'), PHP_URL_PATH) ?: '';
                
                return array_merge($ziggy, [
                    'location' => $request->url(),
                    'base' => $path,
                    'locale' => $locale,
                    'defaults' => array_merge($ziggy['defaults'] ?? [], [
                        'locale' => $locale,
                    ]),
                ]);
            },
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'sale_receipt' => $request->session()->get('sale_receipt'),
            ],
            'nav_counts' => fn () => $this->getNavigationCounts($request),
            'pending_returns_count' => function () use ($request) {
                return $this->getNavigationCounts($request)['returns'] ?? 0;
            },
            'settings' => [
                'app' => [
                    'currency_symbol' => Setting::get('app.currency_symbol', '$'),
                    'date_format' => Setting::get('app.date_format', 'Y-m-d'),
                    'theme_primary_color' => Setting::get('app.theme_primary_color', '#00796b'),
                ],
                'invoice' => [
                    'pharmacy_name' => Setting::get('invoice.pharmacy_name', config('app.name')),
                    'logo_path' => Setting::get('invoice.logo_path', ''),
                    'receipt_header' => Setting::get('invoice.receipt_header', ''),
                    'receipt_footer' => Setting::get('invoice.receipt_footer', ''),
                ],
                'pos' => [
                    'receipt_width' => (int) Setting::get('pos.receipt_width', '80'),
                    'auto_print_receipt' => Setting::get('pos.auto_print_receipt', '0') === '1',
                    'silent_print' => Setting::get('pos.silent_print', '0') === '1',
                    'silent_printer_name' => Setting::get('pos.silent_printer_name', ''),
                ],
            ],
        ]);
    }

    protected function getAccessibleBranchIds(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return collect();
        }

        if ($user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches')) {
            return Branch::pluck('id');
        }

        $branchIds = collect([$user->branch_id, $user->active_branch_id])
            ->filter()
            ->values();

        try {
            $extraIds = $user->branches()->pluck('branches.id');
            $branchIds = $branchIds->merge($extraIds)->unique()->values();
        } catch (\Throwable $e) {
        }

        return $branchIds;
    }

    protected function getAccessibleBranches(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return [];
            }

            if ($user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches')) {
                return Branch::select('id', 'name')->orderBy('name')->get();
            }

            $branchIds = $this->getAccessibleBranchIds($request);

            if ($branchIds->isEmpty()) {
                return [];
            }

            return Branch::select('id', 'name')
                ->whereIn('id', $branchIds)
                ->orderBy('name')
                ->get();
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function getNavigationCounts(Request $request): array
    {
        try {
            $user = $request->user();
            if (!$user) {
                return [];
            }

            $branchIds = $this->getAccessibleBranchIds($request);
            if ($branchIds->isEmpty()) {
                return [];
            }

            $counts = [];
            $permissions = $user->roles->flatMap->permissions->pluck('slug')->unique();

            if ($permissions->contains('manage_inventory')) {
                $expiryAlertDays = (int) Setting::get('inventory.expiry_alert_days', '90');
                $today = now()->toDateString();

                $counts['inventory'] = Inventory::query()
                    ->join('products', 'inventories.product_id', '=', 'products.id')
                    ->whereIn('inventories.branch_id', $branchIds)
                    ->whereColumn('inventories.quantity', '<=', 'products.min_stock_level')
                    ->count();

                $counts['lowBalanceReport'] = $counts['inventory'];

                $counts['expiryReport'] = InventoryBatch::query()
                    ->join('products', 'inventory_batches.product_id', '=', 'products.id')
                    ->whereIn('inventory_batches.branch_id', $branchIds)
                    ->where('inventory_batches.quantity', '>', 0)
                    ->whereRaw('DATEDIFF(inventory_batches.expiry_date, ?) <= COALESCE(products.expiry_alert_days, ?)', [$today, $expiryAlertDays])
                    ->count();

                $counts['purchases'] = Purchase::whereIn('branch_id', $branchIds)
                    ->where('payment_status', '!=', 'Paid')
                    ->count();

                $counts['transfers'] = StockTransfer::where(function ($query) use ($branchIds) {
                        $query->whereIn('from_branch_id', $branchIds)
                            ->orWhereIn('to_branch_id', $branchIds);
                    })
                    ->where('status', 'Pending')
                    ->count();
            }

            if ($permissions->contains('process_sale') || $permissions->contains('approve_returns')) {
                $counts['returns'] = ReturnEntry::whereIn('branch_id', $branchIds)
                    ->where('status', 'Pending')
                    ->count();
            }

            if ($permissions->contains('view_financial_reports')) {
                $counts['sales'] = Sale::whereIn('branch_id', $branchIds)
                    ->where('payment_status', '!=', 'Paid')
                    ->where('status', '!=', 'Voided')
                    ->count();

                $counts['cashSessionReport'] = CashSession::whereIn('branch_id', $branchIds)
                    ->where('status', 'open')
                    ->count();
            }

            return $counts;
        } catch (\Throwable $e) {
            return [];
        }
    }
}
