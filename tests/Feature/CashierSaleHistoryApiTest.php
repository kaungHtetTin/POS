<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\InventoryBatch;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CashierSaleHistoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_can_list_and_view_sale_history_for_current_branch(): void
    {
        config(['app.url' => 'http://localhost']);

        $branch = Branch::create([
            'name' => 'Main Branch',
            'phone' => '09123456789',
            'address' => 'Yangon',
            'status' => 'Active',
        ]);
        $otherBranch = Branch::create([
            'name' => 'Other Branch',
            'phone' => '09999999999',
            'address' => 'Mandalay',
            'status' => 'Active',
        ]);
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $this->giveProcessSalePermission($user);

        $customer = Customer::create([
            'name' => 'Walk-in Customer',
            'phone' => '09111111111',
            'address' => 'Yangon',
        ]);
        $product = Product::factory()->create([
            'name' => 'Paracetamol',
            'generic_name' => 'Acetaminophen',
            'barcode' => '885000000001',
        ]);
        $unit = Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        $batch = InventoryBatch::create([
            'branch_id' => $branch->id,
            'product_id' => $product->id,
            'batch_number' => 'B-001',
            'expiry_date' => Carbon::today()->addYear()->toDateString(),
            'quantity' => 100,
            'purchase_price' => 50,
            'selling_price' => 100,
        ]);
        $sale = Sale::create([
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'customer_id' => $customer->id,
            'invoice_number' => 'S-HISTORY-001',
            'total_amount' => 190,
            'discount' => 10,
            'tax' => 3.8,
            'grand_total' => 193.8,
            'amount_received' => 200,
            'change_due' => 6.2,
            'payment_method' => 'Cash',
            'payment_status' => 'Paid',
            'sale_date' => Carbon::parse('2026-06-19 09:58:00'),
        ]);
        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'batch_id' => $batch->id,
            'unit_id' => $unit->id,
            'quantity' => 2,
            'foc_quantity' => 1,
            'foc_unit_id' => $unit->id,
            'base_quantity' => 2,
            'foc_base_quantity' => 1,
            'unit_price' => 95,
            'price_type' => 'retail',
            'original_unit_price' => 100,
            'discount_percentage' => 5,
            'discount_amount' => 10,
            'total_price' => 190,
            'created_at' => Carbon::parse('2026-06-19 09:58:00'),
        ]);
        Sale::create([
            'branch_id' => $otherBranch->id,
            'user_id' => $user->id,
            'invoice_number' => 'S-HIDDEN-001',
            'total_amount' => 20,
            'discount' => 0,
            'tax' => 0,
            'grand_total' => 20,
            'amount_received' => 20,
            'change_due' => 0,
            'payment_method' => 'Cash',
            'payment_status' => 'Paid',
            'sale_date' => Carbon::parse('2026-06-19 10:00:00'),
        ]);

        Sanctum::actingAs($user);

        $listResponse = $this->getJson('http://localhost/api/cashier/sales?search=HISTORY');

        $listResponse
            ->assertOk()
            ->assertJsonPath('data.0.id', $sale->id)
            ->assertJsonPath('data.0.invoice_number', 'S-HISTORY-001')
            ->assertJsonPath('data.0.items_count', 1)
            ->assertJsonMissing(['invoice_number' => 'S-HIDDEN-001']);

        $this->getJson("http://localhost/api/cashier/sales/{$sale->id}")
            ->assertOk()
            ->assertJsonPath('id', $sale->id)
            ->assertJsonPath('customer.name', 'Walk-in Customer')
            ->assertJsonPath('items.0.product.name', 'Paracetamol')
            ->assertJsonPath('items.0.batch.batch_number', 'B-001')
            ->assertJsonPath('items.0.unit.short_name', 'tab')
            ->assertJsonPath('items.0.foc_unit.short_name', 'tab');
    }

    private function giveProcessSalePermission(User $user): void
    {
        $permission = Permission::create([
            'name' => 'Process Sale',
            'slug' => 'process_sale',
        ]);
        $role = Role::create(['name' => 'Cashier']);

        $role->permissions()->attach($permission);
        $user->roles()->attach($role);
    }
}
