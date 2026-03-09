<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\RolesController;
use App\Http\Controllers\PermissionsController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\TaxController;
use App\Http\Controllers\ProductController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

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
    Route::patch('/staff/{staff}', [StaffController::class, 'update'])->name('staff.update')->middleware('permission:manage_users');
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
    Route::post('/products', [ProductController::class, 'store'])->name('products.store')->middleware('permission:manage_inventory');
    Route::post('/products/{product}', [ProductController::class, 'update'])->name('products.update')->middleware('permission:manage_inventory');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy')->middleware('permission:manage_inventory');

    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index')->middleware('permission:manage_branches');
});

require __DIR__.'/auth.php';
