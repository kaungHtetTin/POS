<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserHasPermission;
use App\Models\Branch;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ReturnEntry;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class CustomerReturnCostAccountingTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_return_uses_original_sale_price_and_cost(): void
    {
        $this->withoutMiddleware(EnsureUserHasPermission::class);
        config(['app.url' => 'http://localhost']);
        URL::forceRootUrl('http://localhost');

        $branch = Branch::create([
            'name' => 'Main Branch',
            'address' => 'Yangon',
            'status' => 'Active',
        ]);
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $product = Product::factory()->create();
        $unit = Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        $batch = InventoryBatch::create([
            'branch_id' => $branch->id,
            'product_id' => $product->id,
            'batch_number' => 'RETURN-COST-1',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity' => 10,
            'purchase_price' => 7,
            'selling_price' => 12,
        ]);
        Inventory::create([
            'branch_id' => $branch->id,
            'product_id' => $product->id,
            'quantity' => 10,
        ]);
        $sale = Sale::create([
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'sale_staff_id' => $user->id,
            'invoice_number' => 'OLD-SALE-1',
            'total_amount' => 10,
            'discount' => 0,
            'tax' => 0,
            'grand_total' => 10,
            'payment_method' => 'Cash',
            'payment_status' => 'Paid',
            'sale_date' => now()->subMonth(),
        ]);
        $saleItem = SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'batch_id' => $batch->id,
            'unit_id' => $unit->id,
            'quantity' => 1,
            'base_quantity' => 1,
            'unit_price' => 10,
            'total_price' => 10,
            'base_unit_cost' => 6,
            'cost_total' => 6,
            'created_at' => now()->subMonth(),
        ]);

        $response = $this->actingAs($user)->post('/returns', [
            'type' => 'Customer',
            'reference_id' => $sale->id,
            'reason' => 'Customer returned old purchase',
            'items' => [[
                'reference_item_id' => $saleItem->id,
                'quantity' => 1,
                'refund_price' => 999,
            ]],
        ]);
        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $return = ReturnEntry::firstOrFail();
        $returnItem = $return->items()->firstOrFail();

        $this->assertEquals(10.00, (float) $return->refund_amount);
        $this->assertSame($saleItem->id, $returnItem->source_sale_item_id);
        $this->assertEquals(6.000000, (float) $returnItem->base_unit_cost);
        $this->assertEquals(6.00, (float) $returnItem->cost_total);

        $this->actingAs($user)->post("/returns/status/{$return->id}", [
            'status' => 'Approved',
        ])->assertSessionHasNoErrors();

        $this->assertSame(11, $batch->fresh()->quantity);
        $this->assertEquals(6.909091, round((float) $batch->fresh()->purchase_price, 6));
        $this->assertSame(11, Inventory::where('product_id', $product->id)->value('quantity'));
    }
}
