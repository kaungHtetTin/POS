<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserHasPermission;
use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class SaleVoidTest extends TestCase
{
    use RefreshDatabase;

    public function test_void_sale_restores_stock_and_recalculates_cash_session(): void
    {
        $this->withoutMiddleware(EnsureUserHasPermission::class);
        config(['app.url' => 'http://localhost']);
        URL::forceRootUrl('http://localhost');

        $branch = Branch::create([
            'name' => 'Main Branch',
            'phone' => '09123456789',
            'address' => 'Yangon',
            'status' => 'Active',
        ]);
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $product = Product::factory()->create();
        $unit = Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        $batch = InventoryBatch::create([
            'branch_id' => $branch->id,
            'product_id' => $product->id,
            'batch_number' => 'B-VOID-001',
            'expiry_date' => Carbon::today()->addYear()->toDateString(),
            'quantity' => 7,
            'purchase_price' => 50,
            'selling_price' => 100,
        ]);
        Inventory::create([
            'branch_id' => $branch->id,
            'product_id' => $product->id,
            'quantity' => 7,
        ]);
        $session = CashSession::create([
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'opening_amount' => 100,
            'cash_received_total' => 50,
            'change_given_total' => 5,
            'net_cash_sales' => 45,
            'expected_amount' => 145,
            'opened_at' => now(),
            'status' => 'open',
        ]);
        $sale = Sale::create([
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'sale_staff_id' => $user->id,
            'cash_session_id' => $session->id,
            'invoice_number' => 'S-VOID-001',
            'total_amount' => 45,
            'discount' => 0,
            'tax' => 0,
            'grand_total' => 45,
            'amount_received' => 50,
            'change_due' => 5,
            'payment_method' => 'Cash',
            'payment_status' => 'Paid',
            'sale_date' => now(),
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
            'base_unit_cost' => 50,
            'cost_total' => 150,
            'unit_price' => 22.5,
            'total_price' => 45,
            'created_at' => now(),
        ]);

        $response = $this
            ->actingAs($user)
            ->post("/sales/{$sale->id}/void", [
                'reason' => 'Wrong medicine selected',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $this->assertSame('Voided', $sale->fresh()->status);
        $this->assertSame($user->id, $sale->fresh()->voided_by_user_id);
        $this->assertSame('Wrong medicine selected', $sale->fresh()->void_reason);
        $this->assertSame(10, $batch->fresh()->quantity);
        $this->assertEquals(50.00, (float) $batch->fresh()->purchase_price);
        $this->assertSame(10, Inventory::where('product_id', $product->id)->first()->quantity);
        $this->assertEquals(0.00, (float) $session->fresh()->cash_received_total);
        $this->assertEquals(0.00, (float) $session->fresh()->change_given_total);
        $this->assertEquals(0.00, (float) $session->fresh()->net_cash_sales);
        $this->assertEquals(100.00, (float) $session->fresh()->expected_amount);
    }
}
