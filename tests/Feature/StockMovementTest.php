<?php

namespace Tests\Feature;

use App\Models\{Branch, Inventory, InventoryBatch, Product, Setting, StockMovement, Supplier, Unit, User};
use App\Services\StockMovementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class StockMovementTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;
    private Product $product;
    private Inventory $inventory;
    private InventoryBatch $batch;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['manage_inventory', 'adjust_stock', 'manage_purchases', 'process_sale', 'cancel_transaction'] as $permission) {
            Gate::define($permission, fn ($user) => true);
        }
        $this->branch = Branch::create(['name' => 'Main', 'address' => 'Test', 'phone' => '000', 'status' => 'Active']);
        $this->actingAs(User::factory()->create(['branch_id' => $this->branch->id]));
        auth()->user()->roles()->attach(\App\Models\Role::firstOrCreate(['name' => 'Owner']));
        $this->product = Product::factory()->create();
        $this->inventory = Inventory::create(['branch_id' => $this->branch->id, 'product_id' => $this->product->id, 'quantity' => 20]);
        $this->batch = InventoryBatch::create([
            'branch_id' => $this->branch->id, 'product_id' => $this->product->id,
            'batch_number' => 'BATCH-1', 'expiry_date' => today()->addYear(),
            'quantity' => 20, 'purchase_price' => 5, 'selling_price' => 10,
        ]);
    }

    public function test_adjustment_records_actor_reference_batch_and_balances(): void
    {
        $this->post('/inventory/adjustments', [
            'branch_id' => $this->branch->id, 'product_id' => $this->product->id,
            'inventory_batch_id' => $this->batch->id, 'adjustment_type' => 'Damage',
            'quantity' => -3, 'reason' => 'Broken seal', 'adjustment_date' => today()->toDateString(),
        ])->assertSessionHasNoErrors();

        $movement = StockMovement::sole();
        $this->assertSame('Adjustment', $movement->type);
        $this->assertSame(-3, $movement->quantity);
        $this->assertSame(20, $movement->balance_before);
        $this->assertSame(17, $movement->balance_after);
        $this->assertSame(auth()->id(), $movement->user_id);
        $this->assertSame('BATCH-1', $movement->batch_number);
        $this->assertSame('Damage: Broken seal', $movement->notes);
        $this->assertSame(17, $this->inventory->fresh()->quantity);
        $this->assertSame(17, $this->batch->fresh()->quantity);
    }

    public function test_transfer_records_matching_out_and_in_movements(): void
    {
        $destination = Branch::create(['name' => 'Destination', 'address' => 'Test', 'phone' => '000', 'status' => 'Active']);
        $this->post('/inventory/transfers', [
            'from_branch_id' => $this->branch->id, 'to_branch_id' => $destination->id,
            'transfer_date' => today()->toDateString(), 'notes' => 'Restock destination',
            'items' => [['product_id' => $this->product->id, 'inventory_batch_id' => $this->batch->id, 'quantity' => 4]],
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('stock_movements', 2);
        $out = StockMovement::where('type', 'Transfer out')->sole();
        $in = StockMovement::where('type', 'Transfer in')->sole();
        $this->assertSame(-4, $out->quantity);
        $this->assertSame(16, $out->balance_after);
        $this->assertSame(4, $in->quantity);
        $this->assertSame(0, $in->balance_before);
        $this->assertSame($out->reference, $in->reference);
        $this->assertSame($destination->id, $in->branch_id);
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('purchaseSources')]
    public function test_purchase_edit_and_deletion_preserve_original_history(string $source): void
    {
        $supplier = Supplier::create(['name' => 'Supplier', 'phone' => '000', 'balance' => 0, 'credit_limit' => 0]);
        $unit = Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        $this->product->product_units()->create(['unit_id' => $unit->id, 'conversion_factor' => 1,
            'selling_price' => 10, 'wholesale_price' => 8, 'is_base_unit' => true, 'is_default_selling_unit' => true]);
        $payload = ['supplier_id' => $supplier->id, 'branch_id' => $this->branch->id, 'invoice_number' => 'MOVEMENT-PURCHASE',
            'purchase_date' => today()->toDateString(), 'payment_status' => 'Due', 'paid_amount' => 0,
            'items' => [['product_id' => $this->product->id, 'unit_id' => $unit->id, 'batch_number' => 'BATCH-1',
                'expiry_date' => today()->addYear()->toDateString(), 'quantity' => 5, 'foc_quantity' => 1,
                'unit_price' => 5, 'selling_price' => 10, 'wholesale_price' => 8]]];
        if ($source === 'staff') {
            $this->postJson('/api/staff/purchases', $payload)->assertCreated();
        } elseif ($source === 'sync') {
            $payload['client_reference'] = 'movement-sync-purchase';
            $service = app(\App\Services\Api\PurchaseSyncService::class);
            $this->assertTrue($service->sync($payload, auth()->user())['created']);
            $this->assertFalse($service->sync($payload, auth()->user())['created']);
        } else {
            $this->post('/purchases', $payload)->assertRedirect()->assertSessionHasNoErrors();
        }
        $purchase = \App\Models\Purchase::where('invoice_number', 'MOVEMENT-PURCHASE')->sole();
        $this->assertSame(6, StockMovement::sole()->quantity);
        $this->assertSame(auth()->id(), StockMovement::sole()->user_id);
        $payload['items'][0]['quantity'] = 7;
        $this->patch('/purchases/'.$purchase->id, $payload)->assertSessionHasNoErrors();
        $this->assertSame(28, $this->inventory->fresh()->quantity);
        $this->delete('/purchases/'.$purchase->id)->assertSessionHasNoErrors();
        $this->assertSame(20, $this->inventory->fresh()->quantity);
        $this->assertDatabaseCount('stock_movements', 4);
        $this->assertEqualsCanonicalizing([6, -6, 8, -8], StockMovement::pluck('quantity')->all());
        $this->assertSame(4, StockMovement::where('reference', 'MOVEMENT-PURCHASE')->count());
    }

    public static function purchaseSources(): array
    {
        return [['web'], ['staff'], ['sync']];
    }

    public function test_rollback_removes_balance_change_and_audit_record(): void
    {
        try {
            DB::transaction(function () {
                app(StockMovementService::class)->change($this->inventory, 5, 'Adjustment', $this->batch);
                throw new \RuntimeException('Simulated failure');
            });
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated failure', $exception->getMessage());
        }
        $this->assertSame(20, $this->inventory->fresh()->quantity);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('saleSources')]
    public function test_sales_include_free_stock_and_void_restores_it(string $source): void
    {
        $unit = Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        $productUnit = $this->product->product_units()->create(['unit_id' => $unit->id, 'conversion_factor' => 1,
            'selling_price' => 10, 'wholesale_price' => 8, 'is_base_unit' => true, 'is_default_selling_unit' => true]);
        $session = \App\Models\CashSession::create(['branch_id' => $this->branch->id, 'user_id' => auth()->id(),
            'opening_amount' => 0, 'opened_at' => now(), 'status' => 'open']);
        $payload = ['payment_method' => 'Cash', 'payment_status' => 'Paid', 'amount_received' => 100,
            'items' => [['product_id' => $this->product->id, 'product_unit_id' => $productUnit->id,
                'unit_id' => $unit->id, 'quantity' => 2, 'foc_quantity' => 1, 'unit_price' => 10]]];
        if ($source === 'web') {
            $this->post('/pos/checkout', $payload)->assertRedirect()->assertSessionHasNoErrors();
        } elseif ($source === 'cashier') {
            $this->postJson('/api/cashier/sales', $payload)->assertCreated();
        } else {
            $payload += ['client_reference' => 'movement-sync-sale', 'branch_id' => $this->branch->id, 'cash_session_id' => $session->id];
            $service = app(\App\Services\Api\SaleSyncService::class);
            $this->assertTrue($service->sync($payload, auth()->user())['created']);
            $this->assertFalse($service->sync($payload, auth()->user())['created']);
        }
        $sale = \App\Models\Sale::sole();
        $this->assertSame(17, $this->inventory->fresh()->quantity);
        $this->assertDatabaseCount('stock_movements', 1);
        $this->assertDatabaseHas('stock_movements', ['type' => 'Sale', 'quantity' => -3, 'balance_before' => 20,
            'balance_after' => 17, 'source_id' => $sale->id, 'user_id' => auth()->id()]);
        $this->post('/sales/'.$sale->id.'/void', ['reason' => 'Wrong item'])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame(20, $this->inventory->fresh()->quantity);
        $this->assertDatabaseHas('stock_movements', ['type' => 'Sale void', 'quantity' => 3, 'balance_before' => 17, 'balance_after' => 20]);
        $this->post('/sales/'.$sale->id.'/void', ['reason' => 'Duplicate void'])->assertSessionHasErrors('void');
        $this->assertDatabaseCount('stock_movements', 2);
    }

    public static function saleSources(): array
    {
        return [['web'], ['cashier'], ['sync']];
    }

    public function test_history_filters_pagination_permissions_and_local_day_boundaries(): void
    {
        Setting::set('app.timezone', 'Asia/Yangon');
        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-11-19 18:00:00', 'UTC'));
        for ($index = 0; $index < 28; $index++) {
            app(StockMovementService::class)->change($this->inventory, 1, 'Adjustment', $this->batch, 'BATCH-1');
        }
        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-11-19 17:00:00', 'UTC'));
        app(StockMovementService::class)->change($this->inventory, 1, 'Adjustment', $this->batch);
        $query = ['product_id' => $this->product->id, 'branch_id' => $this->branch->id,
            'type' => 'Adjustment', 'search' => 'BATCH-1', 'date_from' => '2026-11-20', 'date_to' => '2026-11-20'];
        $this->get(route('inventory.movements.index', $query), ['X-SPA' => 'true'])->assertOk()
            ->assertJsonPath('component', 'Inventory/Movements')
            ->assertJsonPath('props.movements.total', 28)->assertJsonCount(25, 'props.movements.data');
        $this->get(route('inventory.movements.index', $query + ['page' => 2]), ['X-SPA' => 'true'])->assertOk()->assertJsonCount(3, 'props.movements.data');
        $this->get(route('inventory.movements.index', ['type' => 'Sale']), ['X-SPA' => 'true'])->assertOk()->assertJsonPath('props.movements.total', 0);
        $this->get(route('inventory.movements.index', ['date_to' => '2026-11-19']), ['X-SPA' => 'true'])->assertOk()->assertJsonPath('props.movements.total', 1);
        $this->getJson(route('inventory.movements.index', ['date_from' => 'invalid']))->assertUnprocessable();
        Gate::define('manage_inventory', fn ($user) => false);
        $this->get(route('inventory.movements.index'))->assertForbidden();
    }
}
