<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Purchase;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OfflineSyncApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_offline_sale_sync_is_idempotent(): void
    {
        $branch = Branch::create([
            'name' => 'Main Branch',
            'phone' => '09123456789',
            'address' => 'Yangon',
            'status' => 'Active',
        ]);
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $this->givePermission($user, 'Cashier', 'Process Sale', 'process_sale');

        $product = Product::factory()->create(['tax_method' => 'Exclusive']);
        $unit = Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        $productUnit = ProductUnit::create([
            'product_id' => $product->id,
            'unit_id' => $unit->id,
            'conversion_factor' => 1,
            'selling_price' => 100,
            'wholesale_price' => 90,
            'is_base_unit' => true,
        ]);
        InventoryBatch::create([
            'branch_id' => $branch->id,
            'product_id' => $product->id,
            'batch_number' => 'B-SALE-001',
            'expiry_date' => Carbon::today()->addYear()->toDateString(),
            'quantity' => 10,
            'purchase_price' => 50,
            'selling_price' => 100,
        ]);
        Inventory::create([
            'branch_id' => $branch->id,
            'product_id' => $product->id,
            'quantity' => 10,
        ]);

        Sanctum::actingAs($user);

        $payload = [
            'sales' => [
                [
                    'client_reference' => 'android-sale-001',
                    'branch_id' => $branch->id,
                    'payment_method' => 'Cash',
                    'payment_status' => 'Paid',
                    'amount_received' => 200,
                    'sale_date' => Carbon::now()->subMinutes(10)->toIso8601String(),
                    'items' => [
                        [
                            'product_id' => $product->id,
                            'product_unit_id' => $productUnit->id,
                            'quantity' => 2,
                            'unit_price' => 100,
                        ],
                    ],
                ],
            ],
        ];

        $this->postJson('http://localhost/api/sync/sales', $payload)
            ->assertOk()
            ->assertJsonPath('summary.synced', 1)
            ->assertJsonPath('summary.failed', 0)
            ->assertJsonPath('synced.0.status', 'synced');

        $this->assertSame(1, Sale::where('client_reference', 'android-sale-001')->count());
        $this->assertSame($user->id, Sale::where('client_reference', 'android-sale-001')->value('sale_staff_id'));
        $this->assertSame(8, Inventory::where('product_id', $product->id)->first()->quantity);
        $this->assertSame(8, InventoryBatch::where('product_id', $product->id)->first()->quantity);
        $this->assertEquals(50.000000, (float) SaleItem::first()->base_unit_cost);
        $this->assertEquals(100.00, (float) SaleItem::first()->cost_total);
        $this->assertFalse((bool) SaleItem::first()->cost_backfilled);

        $this->postJson('http://localhost/api/sync/sales', $payload)
            ->assertOk()
            ->assertJsonPath('summary.synced', 1)
            ->assertJsonPath('summary.failed', 0)
            ->assertJsonPath('synced.0.status', 'already_synced');

        $this->assertSame(1, Sale::where('client_reference', 'android-sale-001')->count());
        $this->assertSame(8, Inventory::where('product_id', $product->id)->first()->quantity);
        $this->assertSame(8, InventoryBatch::where('product_id', $product->id)->first()->quantity);
    }

    public function test_offline_purchase_sync_is_idempotent(): void
    {
        $branch = Branch::create([
            'name' => 'Main Branch',
            'phone' => '09123456789',
            'address' => 'Yangon',
            'status' => 'Active',
        ]);
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $this->givePermission($user, 'Manager', 'Manage Inventory', 'manage_inventory');

        $supplier = Supplier::create([
            'name' => 'Acme Supplier',
            'phone' => '09111111111',
            'credit_limit' => 10000,
            'balance' => 0,
        ]);
        $product = Product::factory()->create();
        $unit = Unit::create(['name' => 'Box', 'short_name' => 'box']);
        ProductUnit::create([
            'product_id' => $product->id,
            'unit_id' => $unit->id,
            'conversion_factor' => 10,
            'selling_price' => 70,
            'wholesale_price' => 65,
            'is_base_unit' => true,
        ]);

        Sanctum::actingAs($user);

        $payload = [
            'purchases' => [
                [
                    'client_reference' => 'android-purchase-001',
                    'supplier_id' => $supplier->id,
                    'branch_id' => $branch->id,
                    'invoice_number' => 'OFF-PUR-001',
                    'purchase_date' => Carbon::today()->toDateString(),
                    'payment_status' => 'Due',
                    'paid_amount' => 0,
                    'items' => [
                        [
                            'product_id' => $product->id,
                            'unit_id' => $unit->id,
                            'batch_number' => 'B-PUR-001',
                            'expiry_date' => Carbon::today()->addYear()->toDateString(),
                            'quantity' => 3,
                            'foc_quantity' => 1,
                            'unit_price' => 50,
                            'selling_price' => 70,
                            'wholesale_price' => 65,
                        ],
                    ],
                ],
            ],
        ];

        $this->postJson('http://localhost/api/v1/sync/purchases', $payload)
            ->assertOk()
            ->assertJsonPath('summary.synced', 1)
            ->assertJsonPath('summary.failed', 0)
            ->assertJsonPath('synced.0.status', 'synced');

        $this->assertSame(1, Purchase::where('client_reference', 'android-purchase-001')->count());
        $this->assertSame(40, Inventory::where('product_id', $product->id)->first()->quantity);
        $this->assertEquals(150.00, (float) $supplier->fresh()->balance);

        $this->postJson('http://localhost/api/v1/sync/purchases', $payload)
            ->assertOk()
            ->assertJsonPath('summary.synced', 1)
            ->assertJsonPath('summary.failed', 0)
            ->assertJsonPath('synced.0.status', 'already_synced');

        $this->assertSame(1, Purchase::where('client_reference', 'android-purchase-001')->count());
        $this->assertSame(40, Inventory::where('product_id', $product->id)->first()->quantity);
        $this->assertEquals(150.00, (float) $supplier->fresh()->balance);
    }

    private function givePermission(User $user, string $roleName, string $permissionName, string $permissionSlug): void
    {
        $permission = Permission::create([
            'name' => $permissionName,
            'slug' => $permissionSlug,
        ]);
        $role = Role::create(['name' => $roleName]);

        $role->permissions()->attach($permission);
        $user->roles()->attach($role);
    }
}
