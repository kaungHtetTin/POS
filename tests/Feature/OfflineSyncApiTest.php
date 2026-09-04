<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\CashSession;
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
        $cashSession = CashSession::create([
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'opening_amount' => 100,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        Sanctum::actingAs($user);

        $payload = [
            'sales' => [
                [
                    'client_reference' => 'android-sale-001',
                    'branch_id' => $branch->id,
                    'cash_session_id' => $cashSession->id,
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
        $this->assertSame($cashSession->id, Sale::where('client_reference', 'android-sale-001')->value('cash_session_id'));
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

        $cashSession->update(['status' => 'closed', 'closed_at' => now()]);
        $payload['sales'][0]['client_reference'] = 'android-sale-closed-session';

        $this->postJson('http://localhost/api/sync/sales', $payload)
            ->assertOk()
            ->assertJsonPath('summary.synced', 0)
            ->assertJsonPath('summary.failed', 1)
            ->assertJsonPath('failed.0.errors.cash_session_id.0', 'This cash session is closed. Refresh the register and open a session before making another sale.');

        $this->assertDatabaseMissing('sales', ['client_reference' => 'android-sale-closed-session']);
        $this->assertSame(8, Inventory::where('product_id', $product->id)->first()->quantity);

        $this->postJson('http://localhost/api/cashier/sales', [
            'payment_method' => 'Cash',
            'payment_status' => 'Paid',
            'amount_received' => 100,
            'items' => [[
                'product_id' => $product->id,
                'product_unit_id' => $productUnit->id,
                'quantity' => 1,
                'unit_price' => 100,
            ]],
        ])->assertStatus(422)
            ->assertJsonPath('message', 'No active cash session. Please open a session first.');

        $this->withoutMiddleware();
        $this->actingAs($user)
            ->post('/pos/checkout', [
                'payment_method' => 'Cash',
                'payment_status' => 'Paid',
                'amount_received' => 100,
                'items' => [[
                    'product_id' => $product->id,
                    'unit_id' => $unit->id,
                    'quantity' => 1,
                ]],
            ])
            ->assertSessionHasErrors('session');

        $this->assertSame(1, Sale::count());
    }

    public function test_same_cashier_account_uses_the_same_active_session_across_devices(): void
    {
        $branch = Branch::create([
            'name' => 'Shared Session Branch',
            'phone' => '09123456789',
            'address' => 'Yangon',
            'status' => 'Active',
        ]);
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $this->givePermission($user, 'Cashier', 'Process Sale', 'process_sale');
        $cashSession = CashSession::create([
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'opening_amount' => 125,
            'opened_at' => now(),
            'status' => 'open',
        ]);
        $deviceOneToken = $user->createToken('cashier-device-one')->plainTextToken;
        $deviceTwoToken = $user->createToken('cashier-device-two')->plainTextToken;

        $this->withToken($deviceOneToken)
            ->getJson('http://localhost/api/cashier/sessions/active')
            ->assertOk()
            ->assertJsonPath('id', $cashSession->id)
            ->assertJsonPath('status', 'open');

        $this->withToken($deviceTwoToken)
            ->getJson('http://localhost/api/cashier/sessions/active')
            ->assertOk()
            ->assertJsonPath('id', $cashSession->id)
            ->assertJsonPath('status', 'open');

        $this->withToken($deviceTwoToken)
            ->postJson("http://localhost/api/cashier/sessions/{$cashSession->id}/close", [
                'closing_balance' => 125,
            ])
            ->assertOk()
            ->assertJsonPath('session.status', 'closed');

        $this->withToken($deviceOneToken)
            ->getJson('http://localhost/api/cashier/sessions/active')
            ->assertOk()
            ->assertContent('null');
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
