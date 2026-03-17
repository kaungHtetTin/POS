<?php

namespace App\Http\Middleware;

use App\Models\Branch;
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
            'pending_returns_count' => function () use ($request) {
                if (!$request->user()) return 0;
                
                // Get accessible branch IDs using the same logic as elsewhere
                $user = $request->user();
                $branchIds = collect([$user->branch_id, $user->active_branch_id])->filter()->values();
                if ($user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches')) {
                    return \App\Models\ReturnEntry::where('status', 'Pending')->count();
                }
                
                try {
                    $extraIds = $user->branches()->pluck('branches.id');
                    $branchIds = $branchIds->merge($extraIds)->unique()->values();
                } catch (\Throwable $e) {}

                return \App\Models\ReturnEntry::whereIn('branch_id', $branchIds)
                    ->where('status', 'Pending')
                    ->count();
            },
            'settings' => [
                'app' => [
                    'currency_symbol' => \App\Models\Setting::get('app.currency_symbol', '$'),
                    'date_format' => \App\Models\Setting::get('app.date_format', 'Y-m-d'),
                ],
                'invoice' => [
                    'pharmacy_name' => \App\Models\Setting::get('invoice.pharmacy_name', config('app.name')),
                    'logo_path' => \App\Models\Setting::get('invoice.logo_path', ''),
                    'receipt_header' => \App\Models\Setting::get('invoice.receipt_header', ''),
                    'receipt_footer' => \App\Models\Setting::get('invoice.receipt_footer', ''),
                ],
                'pos' => [
                    'receipt_width' => (int) \App\Models\Setting::get('pos.receipt_width', '80'),
                    'auto_print_receipt' => \App\Models\Setting::get('pos.auto_print_receipt', '0') === '1',
                ],
            ],
        ]);
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

            $branchIds = collect([$user->branch_id, $user->active_branch_id])
                ->filter()
                ->values();

            try {
                $extraIds = $user->branches()->pluck('branches.id');
                $branchIds = $branchIds->merge($extraIds)->unique()->values();
            } catch (\Throwable $e) {
            }

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
}
