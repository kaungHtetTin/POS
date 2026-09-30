<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Services\ReturnService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ReturnFinancialFlowTest extends TestCase
{
    use DatabaseTransactions;

    public function test_customer_return_applies_credit_without_restocking_damaged_medicine(): void
    {
        [$branch, $user, $product, $unit, $batch] = $this->inventoryFixture();
        $customer = Customer::create(['name' => 'Return Customer']);
        $sale = Sale::create([
            'branch_id' => $branch->id, 'user_id' => $user->id, 'customer_id' => $customer->id,
            'invoice_number' => 'RETURN-TEST-SALE', 'total_amount' => 90, 'discount' => 0,
            'tax' => 10, 'grand_total' => 100, 'amount_received' => 40,
            'payment_method' => 'Cash', 'payment_status' => 'Partial', 'sale_date' => now(),
        ]);
        $line = SaleItem::create([
            'sale_id' => $sale->id, 'product_id' => $product->id, 'batch_id' => $batch->id,
            'unit_id' => $unit->id, 'quantity' => 2, 'base_quantity' => 2,
            'unit_price' => 45, 'total_price' => 90, 'payable_total' => 100,
            'tax_amount' => 10, 'financial_snapshot' => true, 'base_unit_cost' => 5,
            'cost_total' => 10, 'created_at' => now(),
        ]);

        $service = app(ReturnService::class);
        $return = $service->create([
            'type' => 'Customer', 'reference_id' => $sale->id, 'reason' => 'Damaged seal',
            'items' => [['reference_item_id' => $line->id, 'quantity' => 1, 'restock' => false]],
        ], collect([$branch->id]));
        $service->decide($return, 'Approved');

        $this->assertEquals(50, (float) $return->fresh()->refund_amount);
        $this->assertEquals(5, (float) $return->fresh()->tax_amount);
        $this->assertEquals(50, (float) $sale->fresh()->return_credit_amount);
        $this->assertEquals(10, (float) $sale->fresh()->grand_total - (float) $sale->fresh()->amount_received - (float) $sale->fresh()->return_credit_amount);
        $this->assertEquals(0, (float) $return->fresh()->settlement_due);
        $this->assertEquals(0, (float) $return->items()->first()->cost_total);
        $this->assertSame(10, $batch->fresh()->quantity);
    }

    public function test_supplier_return_applies_payable_credit_and_tracks_refund_receipt(): void
    {
        [$branch, $user, $product, $unit, $batch] = $this->inventoryFixture();
        $supplier = Supplier::create(['name' => 'Return Supplier', 'phone' => '123456', 'balance' => 40]);
        $purchase = Purchase::create([
            'supplier_id' => $supplier->id, 'branch_id' => $branch->id, 'user_id' => $user->id,
            'invoice_number' => 'RETURN-TEST-PURCHASE', 'purchase_date' => today(),
            'total_amount' => 100, 'paid_amount' => 60, 'due_amount' => 40, 'payment_status' => 'Partial',
        ]);
        $line = PurchaseItem::create([
            'purchase_id' => $purchase->id, 'product_id' => $product->id, 'unit_id' => $unit->id,
            'batch_number' => $batch->batch_number, 'expiry_date' => $batch->expiry_date,
            'quantity' => 2, 'foc_quantity' => 1, 'base_quantity' => 3, 'foc_base_quantity' => 1,
            'unit_price' => 50, 'total_price' => 100, 'created_at' => now(),
        ]);

        $service = app(ReturnService::class);
        $return = $service->create([
            'type' => 'Supplier', 'reference_id' => $purchase->id, 'reason' => 'Supplier recall',
            'items' => [['reference_item_id' => $line->id, 'quantity' => 1, 'foc_quantity' => 1]],
        ], collect([$branch->id]));
        $service->decide($return, 'Approved');

        $this->assertEquals(40, (float) $return->fresh()->credit_applied);
        $this->assertEquals(10, (float) $return->fresh()->settlement_due);
        $this->assertEquals(0, (float) $purchase->fresh()->due_amount);
        $this->assertEquals(40, (float) $purchase->fresh()->return_credit_amount);
        $this->assertEquals(0, (float) $supplier->fresh()->balance);
        $this->assertSame(8, $batch->fresh()->quantity);

        $service->settle($return, $user, ['amount' => 10, 'payment_method' => 'Card', 'reference_number' => 'REFUND-123']);
        $this->assertEquals(10, (float) $return->fresh()->settlement_paid);
        $this->assertEquals(10, (float) $return->settlements()->sum('amount'));
    }

    private function inventoryFixture(): array
    {
        $branch = Branch::create(['name' => 'Return Test Branch', 'address' => 'Yangon', 'status' => 'Active']);
        $user = User::factory()->create(['branch_id' => $branch->id]);
        $product = Product::factory()->create();
        $unit = Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        $batch = InventoryBatch::create([
            'branch_id' => $branch->id, 'product_id' => $product->id,
            'batch_number' => 'RETURN-TEST-BATCH', 'expiry_date' => today()->addYear(),
            'quantity' => 10, 'purchase_price' => 5, 'selling_price' => 50,
        ]);
        Inventory::create(['branch_id' => $branch->id, 'product_id' => $product->id, 'quantity' => 10]);
        return [$branch, $user, $product, $unit, $batch];
    }
}
