<?php

namespace Tests\Feature;

use App\Models\{Branch, Category, InventoryBatch, PricingRule, Product, Purchase, Supplier, Tax, Unit, User};
use App\Services\{AutomaticPricingService, ProductUnitPriceCsvService};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AutomaticPricingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['manage_branches', 'manage_inventory', 'manage_purchases'] as $permission) {
            Gate::define($permission, fn ($user) => $user->email === 'pricing@example.test');
        }
        $branch = Branch::create(['name' => 'Main', 'phone' => '000', 'address' => 'Test', 'status' => 'Active']);
        $this->actingAs(User::factory()->create(['email' => 'pricing@example.test', 'branch_id' => $branch->id]));
    }

    public function test_decimal_formula_rounding_minimum_profit_and_unit_conversion(): void
    {
        $service = app(AutomaticPricingService::class);
        foreach ([['950', 20, 100, 50, '1150.00'], ['1000', 10, 300, 100, '1300.00'],
            ['1050', 0, 0, 100, '1100.00'], ['0.1', 0, 0, 1, '1.00'], ['0.000001', 0, 0, 1, '1.00']] as [$cost, $markup, $profit, $rounding, $expected]) {
            $this->assertSame($expected, $service->calculate($cost, ['markup_percent' => $markup, 'minimum_profit' => $profit, 'rounding' => $rounding]));
        }
        $this->assertSame('12000.00', $service->calculate('1000', ['markup_percent' => 20, 'minimum_profit' => 0, 'rounding' => 50], '10'));
        $this->assertNull($service->calculate('0', ['markup_percent' => 20, 'minimum_profit' => 0, 'rounding' => 50]));
        $this->expectException(ValidationException::class);
        $service->calculate('999999999999', ['markup_percent' => 1000, 'minimum_profit' => 0, 'rounding' => 1], '100');
    }

    public function test_defaults_preserve_manual_prices_and_auto_refresh_is_idempotent(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        $this->assertSame('manual', $unit->selling_price_mode);
        $this->refreshPricing($product);
        $this->assertSame('777.00', $unit->fresh()->selling_price);
        $rule->update(['pricing_mode' => 'automatic', 'markup_percent' => 20, 'rounding' => 50]);
        $unit->update(['selling_price_mode' => 'automatic']);
        $this->refreshPricing($product);
        $this->assertSame('1200.00', $unit->fresh()->selling_price);
        $this->assertSame('700.00', $unit->fresh()->wholesale_price);
        $this->assertDatabaseCount('price_changes', 1);
        $this->refreshPricing($product);
        $this->assertDatabaseCount('price_changes', 1);
        $unit->update(['selling_price_mode' => 'manual', 'selling_price' => 555]);
        $this->refreshPricing($product);
        $this->assertSame('555.00', $unit->fresh()->selling_price);
    }

    public function test_rule_requires_preview_and_does_not_enroll_manual_units_by_default(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        $values = $this->values($rule);
        $this->patchJson('/settings/prices/selling_price', $values)->assertUnprocessable()->assertJsonValidationErrors('pricing');
        $preview = $this->postJson('/settings/prices/selling_price/preview', $values)->assertOk()->json();
        $this->assertSame(0, $preview['prices']);
        $this->patchJson('/settings/prices/selling_price', $values + ['preview_token' => $preview['token']])->assertStatus(303);
        $this->assertSame('manual', $unit->fresh()->selling_price_mode);
        $this->assertSame('777.00', $unit->fresh()->selling_price);
    }

    public function test_bulk_preview_enrolls_active_products_and_skips_inactive_manual_prices(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        [$inactive, $inactiveUnit] = $this->catalog(['status' => 'Inactive']);
        $values = $this->values($rule, ['apply_to_existing' => true]);
        $preview = $this->postJson('/settings/prices/selling_price/preview', $values)->assertOk()->json();
        $this->assertSame(1, $preview['prices']);
        $this->assertSame(1, $preview['manual_overrides']);
        $this->patchJson('/settings/prices/selling_price', $values + ['preview_token' => $preview['token']])->assertStatus(303);
        $this->assertSame('1200.00', $unit->fresh()->selling_price);
        $this->assertSame('automatic', $unit->fresh()->selling_price_mode);
        $this->assertSame('manual', $inactiveUnit->fresh()->selling_price_mode);
        $this->assertSame('777.00', $inactiveUnit->fresh()->selling_price);
        $this->assertDatabaseHas('price_changes', ['price_type' => 'selling_price', 'trigger' => 'rule_save', 'actor_id' => auth()->id()]);
    }

    public function test_changed_cost_or_rule_invalidates_preview_without_mutation(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        $values = $this->values($rule, ['apply_to_existing' => true]);
        $preview = $this->postJson('/settings/prices/selling_price/preview', $values)->json();
        $product->update(['pricing_base_cost' => 2000]);
        $this->patchJson('/settings/prices/selling_price', $values + ['preview_token' => $preview['token']])->assertUnprocessable();
        $this->assertSame('manual', $rule->fresh()->pricing_mode);
        $this->assertSame('777.00', $unit->fresh()->selling_price);
        $rule->update(['version' => 2]);
        $this->patchJson('/settings/prices/selling_price', $values)->assertUnprocessable();
    }

    public function test_missing_cost_keeps_saved_price_and_zero_auto_price_is_not_sellable(): void
    {
        [$product, $unit, $rule] = $this->catalog(['pricing_base_cost' => null]);
        $rule->update(['pricing_mode' => 'automatic']);
        $unit->update(['selling_price_mode' => 'automatic']);
        $this->refreshPricing($product);
        $this->assertSame('cost_required', $unit->fresh()->selling_price_status);
        $this->assertSame('777.00', $unit->fresh()->selling_price);
        $unit->update(['selling_price' => 0]);
        $this->expectException(ValidationException::class);
        app(AutomaticPricingService::class)->assertSellable($unit->fresh(), 'selling_price');
    }

    public function test_disabling_rule_preserves_amount_and_turns_units_manual(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        $rule->update(['pricing_mode' => 'automatic']);
        $unit->update(['selling_price_mode' => 'automatic']);
        $this->patchJson('/settings/prices/selling_price', $this->values($rule, ['pricing_mode' => 'manual']))->assertStatus(303);
        $this->assertSame('777.00', $unit->fresh()->selling_price);
        $this->assertSame('manual', $unit->fresh()->selling_price_mode);
    }

    public function test_purchase_create_update_and_delete_recalculate_without_foc_dilution(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        $rule->update(['pricing_mode' => 'automatic', 'markup_percent' => 20, 'rounding' => 50]);
        $unit->update(['selling_price_mode' => 'automatic']);
        $branch = Branch::create(['name' => 'Pricing branch', 'phone' => '000', 'address' => 'Test', 'status' => 'Active']);
        $supplier = Supplier::create(['name' => 'Pricing supplier', 'phone' => '000', 'credit_limit' => 0, 'balance' => 0]);
        $payload = $this->purchasePayload($product, $unit->unit_id, $branch, $supplier);
        $this->post('/purchases', $payload)->assertSessionHasNoErrors();
        $purchase = Purchase::firstOrFail();
        $this->assertSame('1200.000000', $product->fresh()->pricing_buying_cost);
        $this->assertSame('1450.00', $unit->fresh()->selling_price);
        $this->assertSame('1000.000000', InventoryBatch::sole()->purchase_price);
        $this->assertSame('12000.00', $purchase->total_amount);
        $payload['items'][0]['unit_price'] = 2000;
        $this->patch('/purchases/'.$purchase->id, $payload)->assertSessionHasNoErrors();
        $this->assertSame('2400.00', $unit->fresh()->selling_price);
        $this->delete('/purchases/'.$purchase->id)->assertSessionHasNoErrors();
        $this->assertSame('1000.000000', $product->fresh()->pricing_buying_cost);
        $this->assertSame('1200.00', $unit->fresh()->selling_price);
    }

    public function test_cost_uses_historical_conversion_and_latest_purchase_date(): void
    {
        [$product, $unit] = $this->catalog();
        $branch = Branch::create(['name' => 'Cost branch', 'phone' => '000', 'address' => 'Test', 'status' => 'Active']);
        $supplier = Supplier::create(['name' => 'Supplier', 'phone' => '000', 'credit_limit' => 0, 'balance' => 0]);
        $unit->update(['conversion_factor' => 10]);
        $payload = $this->purchasePayload($product, $unit->unit_id, $branch, $supplier);
        $this->post('/purchases', $payload)->assertSessionHasNoErrors();
        $unit->update(['conversion_factor' => 100]);
        $this->assertSame('120.000000', app(AutomaticPricingService::class)->readCost($product));
        $payload['invoice_number'] = 'BACKDATED';
        $payload['purchase_date'] = now()->subDay()->toDateString();
        $payload['items'][0]['unit_price'] = 9999;
        $this->post('/purchases', $payload)->assertSessionHasNoErrors();
        $this->assertSame('120.000000', app(AutomaticPricingService::class)->readCost($product));
    }

    public function test_medicine_save_preserves_unit_ids_computes_auto_and_rejects_stale_form(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        $rule->update(['pricing_mode' => 'automatic', 'markup_percent' => 20]);
        $payload = ['category_id' => $product->category_id, 'tax_id' => $product->tax_id,
            'generic_name' => 'Generic', 'brand_name' => 'Brand', 'tax_method' => 'Exclusive', 'status' => 'Active',
            'pricing_base_cost' => 2000, 'pricing_version' => $product->pricing_version,
            'product_units' => [['unit_id' => $unit->unit_id, 'conversion_factor' => 1, 'selling_price' => 1,
                'wholesale_price' => 600, 'selling_price_mode' => 'automatic', 'wholesale_price_mode' => 'manual',
                'is_base_unit' => true, 'is_default_selling_unit' => true]]];
        $this->post('/products/'.$product->id, $payload)->assertSessionHasNoErrors();
        $this->assertSame($unit->id, $product->product_units()->sole()->id);
        $this->assertSame('2400.00', $unit->fresh()->selling_price);
        $this->assertSame('600.00', $unit->fresh()->wholesale_price);
        $this->postJson('/products/'.$product->id, $payload)->assertUnprocessable()->assertJsonValidationErrors('pricing');
    }

    public function test_unit_csv_prices_become_manual_overrides(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        $rule->update(['pricing_mode' => 'automatic', 'markup_percent' => 20]);
        $unit->update(['selling_price_mode' => 'automatic']);
        $csv = implode(',', ProductUnitPriceCsvService::HEADERS)."\n".implode(',', [$product->id, $product->barcode, 'Medicine', 'Tablet', 'tab', 1, 'yes', 'yes', 123, 100])."\n";
        $this->post('/products/import/unit-prices', ['unit_price_file' => UploadedFile::fake()->createWithContent('prices.csv', $csv), 'create_missing_units' => false])->assertSessionHasNoErrors();
        $this->refreshPricing($product);
        $this->assertSame('123.00', $unit->fresh()->selling_price);
        $this->assertSame('manual', $unit->fresh()->selling_price_mode);
    }

    public function test_offline_purchase_recalculates_both_price_types_once(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        $rule->update(['pricing_mode' => 'automatic', 'markup_percent' => 20, 'rounding' => 50]);
        PricingRule::findOrFail('wholesale_price')->update(['pricing_mode' => 'automatic', 'markup_percent' => 10, 'rounding' => 50]);
        $unit->update(['selling_price_mode' => 'automatic', 'wholesale_price_mode' => 'automatic']);
        $supplier = Supplier::create(['name' => 'Offline supplier', 'phone' => '000', 'credit_limit' => 0, 'balance' => 0]);
        $payload = $this->purchasePayload($product, $unit->unit_id, auth()->user()->branch, $supplier);
        $payload['client_reference'] = 'pricing-offline-1';
        $payload['items'][0]['selling_price'] = 0;
        $payload['items'][0]['wholesale_price'] = 0;
        $service = app(\App\Services\Api\PurchaseSyncService::class);
        $this->assertTrue($service->sync($payload, auth()->user())['created']);
        $this->assertSame('1450.00', $unit->fresh()->selling_price);
        $this->assertSame('1350.00', $unit->fresh()->wholesale_price);
        $this->assertSame('1200.000000', $product->fresh()->pricing_buying_cost);
        $this->assertFalse($service->sync($payload, auth()->user())['created']);
        $this->assertDatabaseCount('price_changes', 2);
        $this->assertDatabaseCount('purchases', 1);
    }

    public function test_new_medicine_uses_enabled_rule_and_manual_rule_cannot_be_selected_as_auto(): void
    {
        [$product, $unit, $rule] = $this->catalog();
        $rule->update(['pricing_mode' => 'automatic', 'markup_percent' => 20, 'rounding' => 50]);
        $payload = ['category_id' => $product->category_id, 'tax_id' => $product->tax_id,
            'generic_name' => 'New generic', 'brand_name' => 'New brand', 'min_stock_level' => 10, 'tax_method' => 'Exclusive', 'status' => 'Active',
            'pricing_base_cost' => 1000, 'product_units' => [['unit_id' => $unit->unit_id, 'conversion_factor' => 1,
                'selling_price' => 1, 'wholesale_price' => 700, 'is_base_unit' => true, 'is_default_selling_unit' => true]]];
        $this->post('/products', $payload)->assertStatus(302)->assertSessionHasNoErrors();
        $created = Product::where('brand_name', 'New brand')->sole();
        $this->assertSame('automatic', $created->product_units->sole()->selling_price_mode);
        $this->assertSame('1200.00', $created->product_units->sole()->selling_price);
        $payload['product_units'][0]['wholesale_price_mode'] = 'automatic';
        $this->postJson('/products', $payload)->assertUnprocessable()->assertJsonValidationErrors('product_units.0.wholesale_price_mode');
        $this->assertDatabaseCount('products', 2);
    }

    public function test_invalid_rule_values_are_rejected(): void
    {
        $rule = PricingRule::findOrFail('selling_price');
        foreach ([['markup_percent' => '-1'], ['markup_percent' => '1001'], ['rounding' => 0],
            ['rounding' => '1.5'], ['minimum_profit' => '-1'], ['pricing_mode' => 'other']] as $invalid) {
            $this->postJson('/settings/prices/selling_price/preview', $this->values($rule, $invalid))->assertUnprocessable();
        }
        $this->assertSame('manual', $rule->fresh()->pricing_mode);
    }

    public function test_staff_api_preserves_automatic_mode_and_unit_identity(): void
    {
        $this->grantApiPermission('manage_inventory');
        [$product, $unit, $rule] = $this->catalog();
        $rule->update(['pricing_mode' => 'automatic', 'markup_percent' => 20]);
        $unit->update(['selling_price_mode' => 'automatic']);
        $payload = ['category_id' => $product->category_id, 'tax_id' => $product->tax_id, 'name' => 'API medicine',
            'tax_method' => 'Exclusive', 'status' => 'Active', 'pricing_version' => $product->pricing_version,
            'product_units' => [['unit_id' => $unit->unit_id, 'conversion_factor' => 1, 'selling_price' => 1,
                'wholesale_price' => 800, 'is_base_unit' => true]]];
        $this->patchJson('/api/staff/products/'.$product->id, $payload)->assertOk()
            ->assertJsonPath('product.units.0.id', $unit->id)->assertJsonPath('product.units.0.selling_price_mode', 'automatic');
        $this->assertSame('1200.00', $unit->fresh()->selling_price);
        $this->assertSame('800.00', $unit->fresh()->wholesale_price);
        $this->patchJson('/api/staff/products/'.$product->id, $payload)->assertUnprocessable()->assertJsonValidationErrors('pricing');
    }

    public function test_cashier_checkout_rejects_automatic_price_without_cost(): void
    {
        $this->grantApiPermission('process_sale');
        [$product, $unit, $rule] = $this->catalog(['pricing_base_cost' => null]);
        $rule->update(['pricing_mode' => 'automatic']);
        $unit->update(['selling_price_mode' => 'automatic', 'selling_price' => 0]);
        \App\Models\CashSession::create(['branch_id' => auth()->user()->branch_id, 'user_id' => auth()->id(),
            'opening_amount' => 0, 'expected_amount' => 0, 'opened_at' => now(), 'status' => 'open']);
        $this->postJson('/api/cashier/sales', ['payment_method' => 'Cash', 'payment_status' => 'Paid', 'amount_received' => 0,
            'items' => [['product_id' => $product->id, 'product_unit_id' => $unit->id, 'quantity' => 1, 'unit_price' => 0]]])
            ->assertUnprocessable()->assertJsonPath('errors.items.0', 'This automatic price needs a buying cost. Set the medicine cost or a manual price before selling.');
        $this->assertDatabaseCount('sales', 0);
    }

    public function test_settings_exposes_rules_and_pricing_endpoints_require_settings_permission(): void
    {
        $this->get('/settings?section=prices', ['X-SPA' => 'true'])->assertOk()
            ->assertJsonPath('props.initial_section', 'prices')->assertJsonCount(2, 'props.pricing_rules');
        $this->actingAs(User::factory()->create());
        $this->postJson('/settings/prices/selling_price/preview', [])->assertForbidden();
        $this->patchJson('/settings/prices/selling_price', [])->assertForbidden();
    }

    private function catalog(array $overrides = []): array
    {
        $product = Product::factory()->create($overrides + ['pricing_base_cost' => 1000]);
        $unit = Unit::firstOrCreate(['name' => 'Tablet'], ['short_name' => 'tab']);
        $productUnit = $product->product_units()->create(['unit_id' => $unit->id, 'conversion_factor' => 1,
            'selling_price' => 777, 'wholesale_price' => 700, 'is_base_unit' => true, 'is_default_selling_unit' => true]);
        return [$product->fresh(), $productUnit->fresh(), PricingRule::findOrFail('selling_price')];
    }

    private function grantApiPermission(string $slug): void
    {
        $permission = \App\Models\Permission::create(['name' => $slug, 'slug' => $slug]);
        $role = \App\Models\Role::create(['name' => 'Pricing tester']);
        $role->permissions()->attach($permission);
        auth()->user()->roles()->attach($role);
    }

    private function values(PricingRule $rule, array $overrides = []): array
    {
        return $overrides + ['pricing_mode' => 'automatic', 'markup_percent' => '20', 'rounding' => 50,
            'minimum_profit' => 0, 'version' => $rule->version, 'apply_to_existing' => false];
    }

    private function refreshPricing(Product $product): void
    {
        DB::transaction(function () use ($product) {
            $service = app(AutomaticPricingService::class);
            $service->lock();
            $service->refreshProduct($product, 'test', auth()->id());
        });
    }

    private function purchasePayload(Product $product, string $unitId, Branch $branch, Supplier $supplier): array
    {
        return ['supplier_id' => $supplier->id, 'branch_id' => $branch->id, 'invoice_number' => 'PRICING-001',
            'purchase_date' => now()->toDateString(), 'payment_status' => 'Due', 'paid_amount' => 0,
            'items' => [['product_id' => $product->id, 'unit_id' => $unitId, 'batch_number' => 'PRICING-BATCH',
                'expiry_date' => now()->addYear()->toDateString(), 'quantity' => 10, 'foc_quantity' => 2,
                'unit_price' => 1200, 'selling_price' => 1, 'wholesale_price' => 1100]]];
    }
}
