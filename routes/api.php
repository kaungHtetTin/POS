<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Cashier\CashierPosController;
use App\Http\Controllers\Api\Staff\StaffPurchaseController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
| All API routes require Sanctum token authentication via the
| "Authorization: Bearer <token>" header.
|
*/

// Public route (for token verification)
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user()->only('id', 'name', 'email', 'branch_id', 'active_branch_id');
});

/*
|--------------------------------------------------------------------------
| CASHIER API (POS Module)
| Permission required: process_sale
|--------------------------------------------------------------------------
| Base URL: /api/cashier
| Auth: Bearer Token (Sanctum)
*/
Route::middleware('auth:sanctum')->prefix('cashier')->group(function () {
    // Products
    Route::get('/products', [CashierPosController::class, 'searchProducts']);

    // Customers
    Route::get('/customers', [CashierPosController::class, 'customers']);

    // Sales
    Route::post('/sales', [CashierPosController::class, 'checkout']);

    // Cash Sessions
    Route::get('/sessions/active', [CashierPosController::class, 'activeSession']);
    Route::post('/sessions/open', [CashierPosController::class, 'openSession']);
    Route::post('/sessions/{session}/close', [CashierPosController::class, 'closeSession']);

    // Receipt Settings (for handheld POS printing)
    Route::get('/receipt-settings', [CashierPosController::class, 'getReceiptSettings']);
});

/*
|--------------------------------------------------------------------------
| STAFF API (Purchase Module)
| Permission required: manage_inventory
|--------------------------------------------------------------------------
| Base URL: /api/staff
| Auth: Bearer Token (Sanctum)
*/
Route::middleware('auth:sanctum')->prefix('staff')->group(function () {
    // Suppliers
    Route::get('/suppliers', [StaffPurchaseController::class, 'suppliers']);

    // Products (with units)
    Route::get('/products', [StaffPurchaseController::class, 'products']);

    // Branches
    Route::get('/branches', [StaffPurchaseController::class, 'branches']);

    // Purchases
    Route::get('/purchases', [StaffPurchaseController::class, 'index']);
    Route::post('/purchases', [StaffPurchaseController::class, 'store']);
    Route::get('/purchases/{purchase}', [StaffPurchaseController::class, 'show']);
});
