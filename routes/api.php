<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
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
| Authentication:
| - Login: POST /api/login (public)
| - All other routes require Sanctum token: Authorization: Bearer <token>
|
*/

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES (No authentication required)
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| PROTECTED ROUTES (Require Sanctum token)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Get current user
    Route::get('/user', function (Request $request) {
        return $request->user()->only('id', 'name', 'email', 'branch_id', 'active_branch_id');
    });

    // Logout (revoke current token)
    Route::post('/logout', [AuthController::class, 'logout']);

    /*
    |--------------------------------------------------------------------------
    | CASHIER API (POS Module)
    | Permission required: process_sale
    |--------------------------------------------------------------------------
    | Base URL: /api/cashier
    */
    Route::prefix('cashier')->group(function () {
        // Products
        Route::get('/products', [CashierPosController::class, 'searchProducts']);

        // Customers (CRUD)
        Route::get('/customers', [CashierPosController::class, 'customers']);
        Route::post('/customers', [CashierPosController::class, 'storeCustomer']);
        Route::get('/customers/{customer}', [CashierPosController::class, 'showCustomer']);
        Route::put('/customers/{customer}', [CashierPosController::class, 'updateCustomer']);
        Route::delete('/customers/{customer}', [CashierPosController::class, 'destroyCustomer']);

        // Sales
        Route::post('/sales', [CashierPosController::class, 'checkout']);

        // Cash Sessions
        Route::get('/sessions/active', [CashierPosController::class, 'activeSession']);
        Route::post('/sessions/open', [CashierPosController::class, 'openSession']);
        Route::post('/sessions/{session}/close', [CashierPosController::class, 'closeSession']);

        // Receipt Settings
        Route::get('/receipt-settings', [CashierPosController::class, 'getReceiptSettings']);
    });

    /*
    |--------------------------------------------------------------------------
    | STAFF API (Purchase Module)
    | Permission required: manage_inventory
    |--------------------------------------------------------------------------
    | Base URL: /api/staff
    */
    Route::prefix('staff')->group(function () {
        Route::get('/suppliers', [StaffPurchaseController::class, 'suppliers']);
        Route::get('/products', [StaffPurchaseController::class, 'products']);
        Route::get('/branches', [StaffPurchaseController::class, 'branches']);

        Route::get('/purchases', [StaffPurchaseController::class, 'index']);
        Route::post('/purchases', [StaffPurchaseController::class, 'store']);
        Route::get('/purchases/{purchase}', [StaffPurchaseController::class, 'show']);
    });

});
