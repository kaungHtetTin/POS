<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserHasPermission;
use App\Models\Branch;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ProductUnit;
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
            'credit_limit' => 50000,
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
            'credit_limit' => 50000,
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
}
