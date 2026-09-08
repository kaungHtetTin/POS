<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserHasPermission;
use App\Models\Branch;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PurchaseWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_purchase_auto_generates_batch_number_and_tracks_base_costs(): void
    {
        $this->withoutMiddleware(EnsureUserHasPermission::class);

        $user = User::factory()->create();
        $branch = Branch::create([
            'name' => 'Main Branch',
            'phone' => '0123456789',
            'address' => 'Dhaka',
            'status' => 'Active',
        ]);
        $supplier = Supplier::create([
            'name' => 'Acme Supplier',
            'phone' => '01999999999',
            'credit_limit' => 0,
            'balance' => 0,
        ]);
        $product = Product::factory()->create();
        $unit = Unit::create([
            'name' => 'Box',
        ]);

        ProductUnit::create([
            'product_id' => $product->id,
            'unit_id' => $unit->id,
            'conversion_factor' => 10,
            'selling_price' => 250,
            'is_base_unit' => true,
        ]);

        $response = $this
            ->actingAs($user)
            ->post('/purchases', [
                'supplier_id' => $supplier->id,
                'branch_id' => $branch->id,
                'invoice_number' => 'INV-AUTO-001',
                'purchase_date' => Carbon::today()->toDateString(),
                'payment_status' => 'Due',
                'paid_amount' => 0,
                'items' => [
                    [
                        'product_id' => $product->id,
                        'unit_id' => $unit->id,
                        'batch_number' => '',
                        'expiry_date' => Carbon::today()->addMonths(12)->toDateString(),
                        'quantity' => 5,
                        'unit_price' => 120,
                        'selling_price' => 250,
                    ],
                ],
            ]);

        $response->assertSessionHasNoErrors();

        $createdBatch = InventoryBatch::first();

        $this->assertNotNull($createdBatch);
        $this->assertNotSame('', $createdBatch->batch_number);
        $this->assertSame(50, $createdBatch->quantity);
        $this->assertEquals(12.00, (float) $createdBatch->purchase_price);
        $this->assertEquals(25.00, (float) $createdBatch->selling_price);
        $purchase = Purchase::firstOrFail();
        $this->assertEquals(600, (float) $purchase->due_amount);
        $this->assertEquals(600, (float) $supplier->fresh()->balance);

        $this->actingAs($user)->patch('/purchases/' . $purchase->id, [
            'supplier_id' => $supplier->id,
            'branch_id' => $branch->id,
            'invoice_number' => $purchase->invoice_number,
            'purchase_date' => Carbon::today()->toDateString(),
            'payment_status' => 'Partial',
            'paid_amount' => 100,
            'items' => [[
                'product_id' => $product->id,
                'unit_id' => $unit->id,
                'batch_number' => $createdBatch->batch_number,
                'expiry_date' => Carbon::today()->addMonths(12)->toDateString(),
                'quantity' => 6,
                'unit_price' => 120,
                'selling_price' => 250,
            ]],
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertEquals(720, (float) $purchase->fresh()->total_amount);
        $this->assertEquals(620, (float) $purchase->fresh()->due_amount);
        $this->assertEquals(620, (float) $supplier->fresh()->balance);
        $this->assertSame(60, $createdBatch->fresh()->quantity);

        $this->actingAs($user)->post('/supplier-payments', [
            'supplier_id' => $supplier->id,
            'purchase_id' => $purchase->id,
            'branch_id' => $branch->id,
            'payment_date' => Carbon::today()->toDateString(),
            'amount' => 120,
            'payment_method' => 'Cash',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertEquals(500, (float) $supplier->fresh()->balance);
        $this->assertEquals(500, (float) $purchase->fresh()->due_amount);
        $this->assertEquals(220, (float) $purchase->fresh()->paid_amount);
        $this->assertDatabaseHas('supplier_payments', [
            'supplier_id' => $supplier->id,
            'purchase_id' => $purchase->id,
            'amount' => 120,
        ]);

    }

    public function test_existing_batch_costs_are_updated_with_weighted_average(): void
    {
        $this->withoutMiddleware(EnsureUserHasPermission::class);

        $user = User::factory()->create();
        $branch = Branch::create([
            'name' => 'Main Branch',
            'phone' => '0123456789',
            'address' => 'Dhaka',
            'status' => 'Active',
        ]);
        $supplier = Supplier::create([
            'name' => 'Acme Supplier',
            'phone' => '01999999999',
            'credit_limit' => 0,
            'balance' => 0,
        ]);
        $product = Product::factory()->create();
        $unit = Unit::create([
            'name' => 'Piece',
        ]);

        ProductUnit::create([
            'product_id' => $product->id,
            'unit_id' => $unit->id,
            'conversion_factor' => 1,
            'selling_price' => 30,
            'is_base_unit' => true,
        ]);

        $expiryDate = Carbon::today()->addMonths(8)->toDateString();

        InventoryBatch::create([
            'branch_id' => $branch->id,
            'product_id' => $product->id,
            'batch_number' => 'BATCH-001',
            'expiry_date' => $expiryDate,
            'quantity' => 100,
            'purchase_price' => 10,
            'selling_price' => 15,
            'is_synced' => false,
        ]);

        $response = $this
            ->actingAs($user)
            ->post('/purchases', [
                'supplier_id' => $supplier->id,
                'branch_id' => $branch->id,
                'invoice_number' => 'INV-WEIGHT-001',
                'purchase_date' => Carbon::today()->toDateString(),
                'payment_status' => 'Due',
                'paid_amount' => 0,
                'items' => [
                    [
                        'product_id' => $product->id,
                        'unit_id' => $unit->id,
                        'batch_number' => 'BATCH-001',
                        'expiry_date' => $expiryDate,
                        'quantity' => 50,
                        'unit_price' => 20,
                        'selling_price' => 30,
                    ],
                ],
            ]);

        $response->assertSessionHasNoErrors();

        $updatedBatch = InventoryBatch::where('batch_number', 'BATCH-001')->firstOrFail();

        $this->assertSame(150, $updatedBatch->quantity);
        $this->assertEquals(13.33, round((float) $updatedBatch->purchase_price, 2));
        $this->assertEquals(20.00, round((float) $updatedBatch->selling_price, 2));
    }
    public function test_supplier_can_be_created_and_updated_without_a_credit_limit(): void
    {
        $this->withoutMiddleware(EnsureUserHasPermission::class);
        $user = User::factory()->create();
        $this->actingAs($user)->post('/suppliers', [
            'name' => 'Unlimited Supplier',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $supplier = Supplier::where('name', 'Unlimited Supplier')->firstOrFail();
        $supplier->update(['balance' => 250]);
        $this->actingAs($user)->patch('/suppliers/' . $supplier->id, [
            'name' => 'Updated Supplier',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('Updated Supplier', $supplier->fresh()->name);
        $this->assertEquals(250, (float) $supplier->fresh()->balance);
    }

}
