<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserHasPermission;
use App\Models\{Branch, CashSession, Customer, Inventory, InventoryBatch, Permission, Product, ProductUnit, Role, Sale, Unit, User};
use App\Services\Api\SaleSyncService;
use App\Services\CustomerCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CustomerCreditTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;
    private User $cashier;
    private ProductUnit $productUnit;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 9, 24)->startOfDay()->addHours(10));
        URL::forceRootUrl('http://localhost');
        $this->withoutMiddleware(EnsureUserHasPermission::class);
        $branch = Branch::create(['name' => 'Main', 'address' => 'Test', 'status' => 'Active']);
        $this->cashier = User::factory()->create(['branch_id' => $branch->id]);
        $role = Role::create(['name' => 'Credit Test Cashier']);
        $permission = Permission::firstOrCreate(['slug' => 'process_sale'], ['name' => 'Process Sale']);
        $role->permissions()->attach($permission);
        $this->cashier->roles()->attach($role);
        $this->actingAs($this->cashier);
        $this->customer = Customer::create(['name' => 'Credit Customer']);
        $product = Product::factory()->create(['tax_id' => \App\Models\Tax::factory()->create(['rate' => 0])->id]);
        $unit = Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        $this->productUnit = ProductUnit::create([
            'product_id' => $product->id, 'unit_id' => $unit->id, 'conversion_factor' => 1,
            'selling_price' => 100, 'wholesale_price' => 100, 'is_base_unit' => true,
        ]);
        Inventory::create(['branch_id' => $branch->id, 'product_id' => $product->id, 'quantity' => 20]);
        InventoryBatch::create([
            'branch_id' => $branch->id, 'product_id' => $product->id, 'batch_number' => 'CREDIT-TEST',
            'quantity' => 20, 'purchase_price' => 50, 'selling_price' => 100,
            'expiry_date' => today()->addYear(),
        ]);
        CashSession::create([
            'branch_id' => $branch->id, 'user_id' => $this->cashier->id,
            'opening_amount' => 0, 'opened_at' => now(), 'status' => 'open',
        ]);
    }

    private function sale(array $attributes = []): Sale
    {
        return Sale::create(array_merge([
            'branch_id' => $this->cashier->branch_id, 'user_id' => $this->cashier->id,
            'customer_id' => $this->customer->id, 'invoice_number' => uniqid('CREDIT-'),
            'total_amount' => 100, 'tax' => 0, 'grand_total' => 100, 'amount_received' => 0,
            'payment_method' => 'Cash', 'payment_status' => 'Due', 'sale_date' => now(),
            'due_date' => today()->addDays(7),
        ], $attributes));
    }

    private function payload(array $attributes = []): array
    {
        return array_merge([
            'customer_id' => $this->customer->id, 'payment_method' => 'Cash', 'payment_status' => 'Credit',
            'due_date' => '2026-10-01', 'amount_received' => 0,
            'items' => [['product_id' => $this->productUnit->product_id, 'unit_id' => $this->productUnit->unit_id,
                'product_unit_id' => $this->productUnit->id, 'quantity' => 1, 'unit_price' => 100]],
        ], $attributes);
    }

    public function test_web_checkout_records_credit_with_an_upfront_payment_and_due_date(): void
    {
        $this->post('/pos/checkout', $this->payload(['amount_received' => 40]))
            ->assertRedirect()->assertSessionHasNoErrors();
        $sale = Sale::firstOrFail();
        $this->assertSame('Partial', $sale->payment_status);
        $this->assertSame('Partial', $sale->receivable_status);
        $this->assertSame('2026-10-01', $sale->due_date->toDateString());
        $this->assertEquals(40, $sale->amount_received);
        $this->assertEquals(60, Customer::withCreditSummary()->findOrFail($this->customer->id)->current_balance);
    }

    public function test_non_cash_credit_records_upfront_payment_and_paid_card_records_full_total(): void
    {
        $this->post('/pos/checkout', $this->payload(['payment_method' => 'Card', 'amount_received' => 25]))
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->assertEquals(25, Sale::firstOrFail()->amount_received);
        $this->post('/pos/checkout', $this->payload(['payment_method' => 'Card', 'payment_status' => 'Paid']))
            ->assertRedirect()->assertSessionHasNoErrors();
        $paid = Sale::where('payment_status', 'Paid')->firstOrFail();
        $this->assertEquals(100, $paid->amount_received);
        $this->assertNull($paid->due_date);
    }

    public function test_overdue_customer_cannot_checkout_credit_but_can_pay_in_full(): void
    {
        $this->sale(['due_date' => today()->subDay()]);
        $this->post('/pos/checkout', $this->payload(['amount_received' => 40]))
            ->assertSessionHasErrors('payment_status');
        $this->assertDatabaseCount('sales', 1);
        $this->assertEquals(20, Inventory::first()->quantity);
        $this->post('/pos/checkout', $this->payload(['payment_status' => 'Paid', 'amount_received' => 100]))
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseCount('sales', 2);
    }

    public function test_walk_in_credit_and_missing_or_past_due_dates_are_rejected(): void
    {
        $this->post('/pos/checkout', $this->payload(['customer_id' => null]))->assertSessionHasErrors('payment_status');
        $this->post('/pos/checkout', $this->payload(['due_date' => null]))->assertSessionHasErrors('due_date');
        $this->post('/pos/checkout', $this->payload(['due_date' => '2026-09-23']))->assertSessionHasErrors('due_date');
        $this->post('/pos/checkout', $this->payload(['payment_status' => 'Paid', 'amount_received' => 40]))->assertSessionHasErrors('amount_received');
        $this->assertDatabaseCount('sales', 0);
    }

    public function test_receivable_filters_use_due_date_and_overdue_takes_priority_over_partial(): void
    {
        $this->sale();
        $this->sale(['amount_received' => 30, 'payment_status' => 'Partial', 'due_date' => today()]);
        $this->sale(['amount_received' => 20, 'payment_status' => 'Partial', 'due_date' => today()->subDay()]);
        $this->sale(['due_date' => today()->subDay(), 'status' => 'Voided']);
        $this->sale(['payment_status' => 'Paid', 'amount_received' => 100, 'due_date' => today()->subDay()]);
        foreach (['Credit' => 100, 'Partial' => 70, 'Overdue' => 80] as $status => $balance) {
            $this->get('/finance/amount-receivable?payment_status='.$status, ['X-SPA' => 'true'])
                ->assertOk()->assertJsonCount(1, 'props.sales.data')
                ->assertJsonPath('props.sales.data.0.payment_status', $status)
                ->assertJsonPath('props.summary.receivable_amount', $balance);
        }
        $this->get('/customers', ['X-SPA' => 'true'])->assertOk()
            ->assertJsonPath('props.customers.data.0.current_balance', 250)
            ->assertJsonPath('props.customers.data.0.has_overdue', true);
        $this->getJson('/pos/customers')->assertOk()->assertJsonPath('0.has_overdue', true);
    }

    public function test_repayment_updates_balance_and_restores_credit_only_after_overdue_debt_is_cleared(): void
    {
        $sale = $this->sale(['due_date' => today()->subDay()]);
        $this->post('/finance/amount-receivable/'.$sale->id.'/receive', ['amount' => 40, 'payment_method' => 'Cash'])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame('Overdue', $sale->fresh()->receivable_status);
        $this->assertTrue(Customer::withCreditSummary()->find($this->customer->id)->has_overdue);
        $this->post('/finance/amount-receivable/'.$sale->id.'/receive', ['amount' => 60, 'payment_method' => 'Cash'])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->assertFalse(Customer::withCreditSummary()->find($this->customer->id)->has_overdue);
        $this->post('/pos/checkout', $this->payload())->assertRedirect()->assertSessionHasNoErrors();
    }

    public function test_cashier_api_enforces_overdue_restriction_and_saves_credit_date(): void
    {
        $this->postJson('/api/cashier/sales', $this->payload())->assertSuccessful();
        $this->assertSame('Credit', Sale::firstOrFail()->receivable_status);
        $this->sale(['due_date' => today()->subDay()]);
        $this->postJson('/api/cashier/sales', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('payment_status');
        $this->assertDatabaseCount('sales', 2);
    }

    public function test_offline_sync_cannot_bypass_overdue_restriction_with_legacy_partial_status(): void
    {
        $this->sale(['due_date' => today()->subDay()]);
        $this->expectException(ValidationException::class);
        app(SaleSyncService::class)->sync($this->payload([
            'client_reference' => 'credit-offline-test', 'payment_status' => 'Partial', 'amount_received' => 20,
        ]), $this->cashier);
    }

    public function test_due_today_is_eligible_and_legacy_credit_defaults_to_seven_days(): void
    {
        $this->sale(['due_date' => today()]);
        $payment = DB::transaction(fn () => app(CustomerCreditService::class)->payment([
            'customer_id' => $this->customer->id, 'payment_method' => 'Cash', 'payment_status' => 'Due',
        ], 100));
        $this->assertSame('2026-10-01', $payment['due_date']);
        $this->assertFalse(Customer::withCreditSummary()->find($this->customer->id)->has_overdue);
        $this->travel(1)->days();
        $this->assertTrue(Customer::withCreditSummary()->find($this->customer->id)->has_overdue);
    }
}
