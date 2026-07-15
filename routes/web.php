<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RolesController;
use App\Http\Controllers\PermissionsController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\TaxController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\SupplierPaymentController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\InventoryAdjustmentController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ActiveBranchController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ReturnsController;
use App\Http\Controllers\ExpenseCategoryController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\ManualController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return redirect()->route('dashboard', ['locale' => config('app.locale')]);
});

Route::get('/language/{lang}', [LanguageController::class, 'switch'])->name('language.switch');

// Login / Logout routes WITHOUT locale prefix (auth pages don't need locale)
Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
});

Route::group(['prefix' => '{locale}', 'where' => ['locale' => 'en|my']], function () {
    
    Route::get('/', [DashboardController::class, 'index'])
        ->middleware(['auth', 'verified'])
        ->name('dashboard');

    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware(['auth', 'verified']);

    Route::middleware('auth')->group(function () {
        Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

        Route::get('/roles', [RolesController::class, 'index'])->name('roles.index')->middleware('permission:manage_users');
        Route::post('/roles', [RolesController::class, 'store'])->name('roles.store')->middleware('permission:manage_users');
        Route::patch('/roles/{role}', [RolesController::class, 'update'])->name('roles.update')->middleware('permission:manage_users');
        Route::delete('/roles/{role}', [RolesController::class, 'destroy'])->name('roles.destroy')->middleware('permission:manage_users');
        Route::get('/permissions', [PermissionsController::class, 'index'])->name('permissions.index')->middleware('permission:manage_users');
        
        Route::get('/staff', [StaffController::class, 'index'])->name('staff.index')->middleware('permission:manage_users');
        Route::post('/staff', [StaffController::class, 'store'])->name('staff.store')->middleware('permission:manage_users');
        Route::post('/staff/{staff}', [StaffController::class, 'update'])->name('staff.update')->middleware('permission:manage_users');
        Route::delete('/staff/{staff}', [StaffController::class, 'destroy'])->name('staff.destroy')->middleware('permission:manage_users');

        Route::get('/branches', [BranchController::class, 'index'])->name('branches.index')->middleware('permission:manage_branches');
        Route::post('/branches', [BranchController::class, 'store'])->name('branches.store')->middleware('permission:manage_branches');
        Route::patch('/branches/{branch}', [BranchController::class, 'update'])->name('branches.update')->middleware('permission:manage_branches');
        Route::delete('/branches/{branch}', [BranchController::class, 'destroy'])->name('branches.destroy')->middleware('permission:manage_branches');

        Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index')->middleware('permission:manage_inventory');
        Route::post('/categories', [CategoryController::class, 'store'])->name('categories.store')->middleware('permission:manage_inventory');
        Route::patch('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update')->middleware('permission:manage_inventory');
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy')->middleware('permission:manage_inventory');

        Route::get('/units', [UnitController::class, 'index'])->name('units.index')->middleware('permission:manage_inventory');
        Route::post('/units', [UnitController::class, 'store'])->name('units.store')->middleware('permission:manage_inventory');
        Route::patch('/units/{unit}', [UnitController::class, 'update'])->name('units.update')->middleware('permission:manage_inventory');
        Route::delete('/units/{unit}', [UnitController::class, 'destroy'])->name('units.destroy')->middleware('permission:manage_inventory');

        Route::get('/taxes', [TaxController::class, 'index'])->name('taxes.index')->middleware('permission:manage_inventory');
        Route::post('/taxes', [TaxController::class, 'store'])->name('taxes.store')->middleware('permission:manage_inventory');
        Route::patch('/taxes/{tax}', [TaxController::class, 'update'])->name('taxes.update')->middleware('permission:manage_inventory');
        Route::delete('/taxes/{tax}', [TaxController::class, 'destroy'])->name('taxes.destroy')->middleware('permission:manage_inventory');

        Route::get('/products', [ProductController::class, 'index'])->name('products.index')->middleware('permission:manage_inventory');
        Route::get('/products/{product}/edit', [ProductController::class, 'edit'])->name('products.edit')->middleware('permission:manage_inventory');
        Route::post('/products', [ProductController::class, 'store'])->name('products.store')->middleware('permission:manage_inventory');
        Route::post('/products/{product}', [ProductController::class, 'update'])->name('products.update')->middleware('permission:manage_inventory');
        Route::delete('/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy')->middleware('permission:manage_inventory');

        Route::get('/suppliers', [SupplierController::class, 'index'])->name('suppliers.index')->middleware('permission:manage_inventory');
        Route::get('/suppliers/{supplier}', [SupplierController::class, 'show'])->name('suppliers.show')->middleware('permission:manage_inventory');
        Route::post('/suppliers', [SupplierController::class, 'store'])->name('suppliers.store')->middleware('permission:manage_inventory');
        Route::patch('/suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update')->middleware('permission:manage_inventory');
        Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy')->middleware('permission:manage_inventory');
        Route::post('/supplier-payments', [SupplierPaymentController::class, 'store'])->name('supplier-payments.store')->middleware('permission:manage_inventory');

        Route::get('/purchases', [PurchaseController::class, 'index'])->name('purchases.index')->middleware('permission:manage_inventory');
        Route::get('/purchases/create', [PurchaseController::class, 'create'])->name('purchases.create')->middleware('permission:manage_inventory');
        Route::get('/purchases/{purchase}', [PurchaseController::class, 'show'])->name('purchases.show')->middleware('permission:manage_inventory');
        Route::post('/purchases', [PurchaseController::class, 'store'])->name('purchases.store')->middleware('permission:manage_inventory');
        Route::patch('/purchases/{purchase}', [PurchaseController::class, 'update'])->name('purchases.update')->middleware('permission:manage_inventory');
        Route::delete('/purchases/{purchase}', [PurchaseController::class, 'destroy'])->name('purchases.destroy')->middleware('permission:manage_inventory');

        Route::get('/inventory/adjustments', [InventoryAdjustmentController::class, 'index'])->name('inventory.adjustments.index')->middleware('permission:manage_inventory');
        Route::post('/inventory/adjustments', [InventoryAdjustmentController::class, 'store'])->name('inventory.adjustments.store')->middleware('permission:manage_inventory');
        Route::get('/inventory/batches/{product}/{branch}', [InventoryAdjustmentController::class, 'getBatches'])->name('inventory.batches.get')->middleware('permission:manage_inventory');
        Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index')->middleware('permission:manage_inventory');
        
        Route::get('/inventory/transfers', [StockTransferController::class, 'index'])->name('inventory.transfers.index')->middleware('permission:manage_inventory');
        Route::post('/inventory/transfers', [StockTransferController::class, 'store'])->name('inventory.transfers.store')->middleware('permission:manage_inventory');
        Route::get('/inventory/{product}', [InventoryController::class, 'show'])->name('inventory.show')->middleware('permission:manage_inventory');

        Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index')->middleware('permission:view_financial_reports');
        Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store')->middleware('permission:view_financial_reports');
        Route::patch('/expenses/{expense}', [ExpenseController::class, 'update'])->name('expenses.update')->middleware('permission:view_financial_reports');
        Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy')->middleware('permission:view_financial_reports');
        Route::get('/expense-categories', [ExpenseCategoryController::class, 'index'])->name('expense-categories.index')->middleware('permission:view_financial_reports');
        Route::post('/expense-categories', [ExpenseCategoryController::class, 'store'])->name('expense-categories.store')->middleware('permission:view_financial_reports');
        Route::patch('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->name('expense-categories.update')->middleware('permission:view_financial_reports');
        Route::delete('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->name('expense-categories.destroy')->middleware('permission:view_financial_reports');

        Route::get('/reports', [ReportsController::class, 'index'])->name('reports.index')->middleware('permission:view_financial_reports');
        Route::get('/reports/expiry', [ReportsController::class, 'expiry'])->name('reports.expiry')->middleware('permission:manage_inventory');
        Route::get('/reports/cash-sessions', [ReportsController::class, 'cashSessions'])->name('reports.cash-sessions')->middleware('permission:view_financial_reports');
        Route::get('/sales', [SalesController::class, 'index'])->name('sales.index')->middleware('permission:view_financial_reports');

        Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index')->middleware('permission:process_sale');
        Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store')->middleware('permission:process_sale');
        Route::patch('/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update')->middleware('permission:process_sale');
        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy')->middleware('permission:process_sale');

        Route::get('/returns', [ReturnsController::class, 'index'])->name('returns.index')->middleware('permission:process_sale');
        Route::post('/returns', [ReturnsController::class, 'store'])->name('returns.store')->middleware('permission:process_sale');
        Route::post('/returns/status/{return}', [ReturnsController::class, 'updateStatus'])->name('returns.status')->middleware('permission:approve_returns');
        Route::get('/returns/lookup/sale', [ReturnsController::class, 'lookupSale'])->name('returns.lookup.sale')->middleware('permission:process_sale');
        Route::get('/returns/lookup/purchase', [ReturnsController::class, 'lookupPurchase'])->name('returns.lookup.purchase')->middleware('permission:process_sale');

        Route::get('/pos', [PosController::class, 'index'])->name('pos.index')->middleware('permission:process_sale');
        Route::get('/pos/products', [PosController::class, 'products'])->name('pos.products')->middleware('permission:process_sale');
        Route::get('/pos/categories', [PosController::class, 'categories'])->name('pos.categories')->middleware('permission:process_sale');
        Route::get('/pos/catalog', [PosController::class, 'catalog'])->name('pos.catalog')->middleware('permission:process_sale');
        Route::get('/pos/scan', [PosController::class, 'scan'])->name('pos.scan')->middleware('permission:process_sale');
        Route::get('/pos/customers', [PosController::class, 'customers'])->name('pos.customers')->middleware('permission:process_sale');
        Route::post('/pos/customers', [PosController::class, 'storeCustomer'])->name('pos.customers.store')->middleware('permission:process_sale');
        Route::post('/pos/session/open', [PosController::class, 'openSession'])->name('pos.session.open')->middleware('permission:process_sale');
        Route::post('/pos/session/close', [PosController::class, 'closeSession'])->name('pos.session.close')->middleware('permission:process_sale');
        Route::post('/pos/checkout', [PosController::class, 'checkout'])->name('pos.checkout')->middleware('permission:process_sale');

        Route::post('/active-branch', [ActiveBranchController::class, 'update'])->name('active-branch.update');

        Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index')->middleware('permission:manage_branches');
        Route::get('/manual', [ManualController::class, 'index'])->name('manual.index');
        Route::patch('/settings/pos-behavior', [SettingsController::class, 'updatePosBehavior'])->name('settings.pos-behavior.update')->middleware('permission:manage_branches');
        Route::post('/settings/general', [SettingsController::class, 'updateGeneral'])->name('settings.general.update')->middleware('permission:manage_branches');
        Route::patch('/settings/notifications', [SettingsController::class, 'updateNotifications'])->name('settings.notifications.update')->middleware('permission:manage_branches');
        Route::patch('/settings/localization', [SettingsController::class, 'updateLocalization'])->name('settings.localization.update')->middleware('permission:manage_branches');
        Route::patch('/settings/labels', [SettingsController::class, 'updateLabels'])->name('settings.labels.update')->middleware('permission:manage_branches');
        Route::post('/settings/invoice', [SettingsController::class, 'updateInvoice'])->name('settings.invoice.update')->middleware('permission:manage_branches');
        Route::get('/activity-logs', [ActivityLogController::class, 'index'])->name('activity-logs.index')->middleware('permission:manage_users');

        Route::get('/products/labels/print', [ProductController::class, 'printLabels'])->name('products.labels.print')->middleware('permission:manage_inventory');
    });
});
