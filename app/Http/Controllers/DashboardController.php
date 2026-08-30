<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\ReturnEntry;
use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Support\Spa;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Get accessible branch IDs
        $accessibleBranchIds = collect([$user->branch_id, $user->active_branch_id])->filter()->values();
        if ($user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches')) {
            $accessibleBranchIds = \App\Models\Branch::pluck('id');
        } else {
            try {
                $extraIds = $user->branches()->pluck('branches.id');
                $accessibleBranchIds = $accessibleBranchIds->merge($extraIds)->unique()->values();
            } catch (\Throwable $e) {}
        }

        // Determine which branch to filter by (default to all accessible if not specified)
        $filterBranchId = $request->input('branch_id');
        $targetBranchIds = $filterBranchId ? [$filterBranchId] : $accessibleBranchIds;

        // Statistics for widgets
        $totalProducts = Product::count();
        $totalSuppliers = Supplier::count();
        
        $totalStockValue = InventoryBatch::whereIn('branch_id', $targetBranchIds)
            ->sum(\DB::raw('quantity * purchase_price'));
        
        $pendingPurchases = Purchase::whereIn('branch_id', $targetBranchIds)
            ->where('payment_status', '!=', 'Paid')
            ->count();

        // Pending Returns for alert
        $pendingReturnsCount = ReturnEntry::whereIn('branch_id', $targetBranchIds)
            ->where('status', 'Pending')
            ->count();

        // Low Stock Alerts (comparing current inventory with min_stock_level)
        $lowStockProducts = Inventory::whereIn('branch_id', $targetBranchIds)
            ->with(['product:id,name,min_stock_level', 'branch:id,name'])
            ->get()
            ->filter(function($inventory) {
                $minLevel = (int) ($inventory->product->min_stock_level ?? 0);
                return (int) $inventory->quantity <= $minLevel;
            })
            ->values()
            ->map(function($inventory) {
                return [
                    'id' => $inventory->product_id,
                    'name' => $inventory->product->name,
                    'branch_name' => $inventory->branch->name,
                    'current_quantity' => (int) $inventory->quantity,
                    'min_level' => (int) ($inventory->product->min_stock_level ?? 0),
                ];
            });

        // Expiry Alerts (batches expiring within their product's alert window)
        $expiryAlertDays = (int) Setting::get('inventory.expiry_alert_days', '90');
        
        $expiringBatches = InventoryBatch::whereIn('branch_id', $targetBranchIds)
            ->where('quantity', '>', 0)
            ->with(['product:id,name,expiry_alert_days', 'branch:id,name'])
            ->get()
            ->filter(function($batch) use ($expiryAlertDays) {
                $alertDays = (int) ($batch->product->expiry_alert_days ?? $expiryAlertDays);
                $daysUntilExpiry = (int) now()->diffInDays(Carbon::parse($batch->expiry_date), false);
                return $daysUntilExpiry <= $alertDays;
            })
            ->values()
            ->map(function($batch) {
                return [
                    'id' => $batch->id,
                    'product_name' => $batch->product->name,
                    'branch_name' => $batch->branch->name,
                    'batch_number' => $batch->batch_number,
                    'expiry_date' => $batch->expiry_date->format('Y-m-d'),
                    'days_left' => (int) now()->diffInDays(Carbon::parse($batch->expiry_date), false),
                    'quantity' => (int) $batch->quantity,
                ];
            });

        $branches = \App\Models\Branch::whereIn('id', $accessibleBranchIds)->get(['id', 'name']);

        return Spa::render('Dashboard', [
            'stats' => [
                'total_products' => $totalProducts,
                'total_suppliers' => $totalSuppliers,
                'total_stock_value' => (float) $totalStockValue,
                'pending_purchases' => $pendingPurchases,
                'pending_returns' => $pendingReturnsCount,
            ],
            'lowStockAlerts' => $lowStockProducts,
            'expiryAlerts' => $expiringBatches,
            'branches' => $branches,
            'filters' => $request->only(['branch_id']),
        ]);
    }
}
