<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $branchId = auth()->user()->currentBranchId();

        // Statistics for widgets
        $totalProducts = Product::count();
        $totalSuppliers = Supplier::count();
        $totalStockValue = InventoryBatch::where('branch_id', $branchId)
            ->sum(\DB::raw('quantity * purchase_price'));
        
        $pendingPurchases = Purchase::where('branch_id', $branchId)
            ->where('payment_status', '!=', 'Paid')
            ->count();

        // Low Stock Alerts (comparing current inventory with min_stock_level)
        $lowStockProducts = Inventory::where('branch_id', $branchId)
            ->with('product:id,name,min_stock_level')
            ->whereHas('product', function($q) {
                $q->whereColumn('inventories.quantity', '<', 'products.min_stock_level');
            })
            ->get()
            ->map(function($inventory) {
                return [
                    'id' => $inventory->product_id,
                    'name' => $inventory->product->name,
                    'current_quantity' => $inventory->quantity,
                    'min_level' => $inventory->product->min_stock_level,
                ];
            });

        // Expiry Alerts (batches expiring within their product's alert window)
        $expiringBatches = InventoryBatch::where('branch_id', $branchId)
            ->where('quantity', '>', 0)
            ->with('product:id,name,expiry_alert_days')
            ->get()
            ->filter(function($batch) {
                $alertDays = $batch->product->expiry_alert_days ?? 90;
                return Carbon::parse($batch->expiry_date)->diffInDays(now()) <= $alertDays;
            })
            ->values()
            ->map(function($batch) {
                return [
                    'id' => $batch->id,
                    'product_name' => $batch->product->name,
                    'batch_number' => $batch->batch_number,
                    'expiry_date' => $batch->expiry_date->format('Y-m-d'),
                    'days_left' => Carbon::parse($batch->expiry_date)->diffInDays(now(), false),
                    'quantity' => $batch->quantity,
                ];
            });

        return Inertia::render('Dashboard', [
            'stats' => [
                'total_products' => $totalProducts,
                'total_suppliers' => $totalSuppliers,
                'total_stock_value' => (float) $totalStockValue,
                'pending_purchases' => $pendingPurchases,
            ],
            'lowStockAlerts' => $lowStockProducts,
            'expiryAlerts' => $expiringBatches,
        ]);
    }
}
