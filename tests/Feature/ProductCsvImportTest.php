<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Tax;
use App\Models\Unit;
use App\Models\User;
use App\Services\ProductCsvImportService;
use App\Services\ProductUnitPriceCsvService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class ProductCsvImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Gate::define('manage_inventory', fn ($user) => $user->email === 'importer@example.test');
        $this->actingAs(User::factory()->create(['email' => 'importer@example.test']));
        Tax::create(['name' => 'Tax Free', 'rate' => 0, 'status' => true]);
    }

    public function test_product_import_creates_defaults_shared_units_taxes_and_unicode(): void
    {
        $this->importProducts([
            $this->productRow(['brand_name' => 'ဆေးဝါး', 'barcode' => '000123', 'description' => "Line one, quoted \"text\"\nLine two"]),
            $this->productRow(['brand_name' => 'Second medicine']),
        ])->assertSessionHasNoErrors()->assertRedirect('/products');

        $this->assertDatabaseCount('products', 2);
        $this->assertDatabaseCount('categories', 1);
        $this->assertDatabaseCount('units', 1);
        $this->assertDatabaseCount('product_tax', 2);
        $this->assertDatabaseCount('inventory_batches', 0);
        $product = Product::where('barcode', '000123')->firstOrFail();
        $this->assertSame('ဆေးဝါး', $product->name);
        $this->assertSame(10, $product->min_stock_level);
        $this->assertSame(90, $product->expiry_alert_days);
        $unit = $product->product_units->sole();
        $this->assertSame(1, $unit->conversion_factor);
        $this->assertTrue($unit->is_base_unit);
        $this->assertTrue($unit->is_default_selling_unit);
        $this->assertSame('100.00', $unit->wholesale_price);
        $this->assertSame('70.000000', $product->pricing_base_cost);
        $this->assertNotEmpty(Product::where('name', 'Second medicine')->firstOrFail()->barcode);
    }

    public function test_product_template_is_utf8_and_can_be_imported(): void
    {
        $csv = $this->get('/products/import/template')->assertOk()->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF".implode(',', ProductCsvImportService::HEADERS), $csv);
        $this->post('/products/import', ['file' => UploadedFile::fake()->createWithContent('template.csv', $csv),
            'create_missing_categories' => true, 'create_missing_units' => true])
            ->assertSessionHasNoErrors()->assertRedirect('/products');
        $this->assertDatabaseCount('products', 1);
    }

    public function test_later_catalog_error_rolls_back_products_categories_and_units(): void
    {
        $this->importProducts([$this->productRow(), $this->productRow([
            'brand_name' => 'Bad tax', 'base_unit_name' => 'Different tablet', 'tax_names' => 'Missing tax',
        ])])->assertSessionHasErrors('file');
        $this->assertDatabaseCount('products', 0);
        $this->assertDatabaseCount('product_units', 0);
        $this->assertDatabaseCount('categories', 0);
        $this->assertDatabaseCount('units', 0);
        $this->assertDatabaseCount('product_tax', 0);
    }

    public function test_duplicate_barcodes_in_file_and_archived_catalog_are_rejected(): void
    {
        $this->importProducts([$this->productRow(['barcode' => '001']), $this->productRow(['barcode' => '001'])])
            ->assertSessionHasErrors('file');
        $this->assertDatabaseCount('products', 0);
        $product = Product::factory()->create(['barcode' => '001']);
        $product->delete();
        $this->importProducts([$this->productRow(['barcode' => '001'])])->assertSessionHasErrors('file');
        $this->assertSame(1, Product::withTrashed()->count());
    }

    public function test_creation_options_and_active_tax_names_are_enforced(): void
    {
        $this->importProducts([$this->productRow()], false, false)->assertSessionHasErrors('file');
        Category::create(['name' => 'Pain relief']);
        $this->importProducts([$this->productRow()], false, false)->assertSessionHasErrors('file');
        Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        Tax::create(['name' => 'VAT', 'rate' => 5, 'status' => true]);
        $this->importProducts([$this->productRow(['tax_names' => 'Tax Free|VAT'])], false, false)->assertSessionHasNoErrors();
        $this->assertDatabaseCount('product_tax', 2);
        $this->importProducts([$this->productRow(['tax_names' => 'Missing'])])->assertSessionHasErrors('file');
        $this->assertDatabaseCount('products', 1);
    }

    public function test_invalid_product_values_and_headers_leave_no_changes(): void
    {
        foreach ([['buying_cost' => ''], ['buying_cost' => '-1'], ['buying_cost' => '1.0000001'], ['buying_cost' => '1e2'],
            ['selling_price' => '-1'], ['wholesale_price' => '1.001'], ['selling_price' => '1e5'],
            ['selling_price' => '10000000000000'], ['min_stock_level' => '1.5'], ['status' => 'Draft'],
            ['discount_percentage' => '101'], ['generic_name' => '']] as $invalid) {
            $this->importProducts([$this->productRow($invalid)])->assertSessionHasErrors('file');
        }
        $this->post('/products/import', ['file' => UploadedFile::fake()->createWithContent('bad.csv', "name,name\na,b\n"),
            'create_missing_categories' => true, 'create_missing_units' => true])->assertSessionHasErrors('file');
        $this->assertDatabaseCount('products', 0);
    }

    public function test_unit_import_adds_unit_changes_default_and_preserves_existing_id(): void
    {
        [$product, $base] = $this->catalog();
        $this->importPrices([
            $this->priceRow($product, ['selling_price' => '120', 'is_default_selling_unit' => 'no']),
            $this->priceRow($product, ['unit_name' => 'Strip', 'unit_short_name' => 'str', 'conversion_factor' => '10',
                'is_base_unit' => 'no', 'selling_price' => '1100', 'wholesale_price' => '950']),
        ])->assertSessionHasNoErrors()->assertRedirect('/products');
        $this->assertDatabaseCount('product_units', 2);
        $this->assertSame($base->id, $product->product_units()->where('is_base_unit', true)->sole()->id);
        $this->assertSame('120.00', $base->fresh()->selling_price);
        $this->assertFalse($base->fresh()->is_default_selling_unit);
        $this->assertSame(10, $product->product_units()->where('is_default_selling_unit', true)->sole()->conversion_factor);
    }

    public function test_partial_price_updates_preserve_omitted_units_and_are_repeatable(): void
    {
        [$product, $base] = $this->catalog();
        $box = Unit::create(['name' => 'Box', 'short_name' => 'box']);
        $other = $product->product_units()->create(['unit_id' => $box->id, 'conversion_factor' => 100,
            'selling_price' => 9000, 'wholesale_price' => 8500, 'is_base_unit' => false, 'is_default_selling_unit' => false]);
        for ($i = 0; $i < 2; $i++) {
            $this->importPrices([$this->priceRow($product, ['selling_price' => '130'])])->assertSessionHasNoErrors();
        }
        $this->assertDatabaseCount('product_units', 2);
        $this->assertSame('130.00', $base->fresh()->selling_price);
        $this->assertSame('9000.00', $other->fresh()->selling_price);
    }

    public function test_unit_export_round_trip_preserves_formula_like_names_and_ids(): void
    {
        [$product, $base] = $this->catalog();
        $base->unit->update(['name' => '=Tablet', 'short_name' => '@tab']);
        $csv = $this->get('/products/import/unit-prices/template')->assertOk()->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF".implode(',', ProductUnitPriceCsvService::HEADERS), $csv);
        $this->assertStringContainsString("'=Tablet", $csv);
        $this->post('/products/import/unit-prices', ['unit_price_file' => UploadedFile::fake()->createWithContent('prices.csv', $csv),
            'create_missing_units' => false])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('units', 1);
        $this->assertSame($base->id, $product->product_units()->sole()->id);
    }

    public function test_invalid_unit_flags_factors_prices_and_duplicates_roll_back(): void
    {
        [$product, $base] = $this->catalog();
        foreach ([['conversion_factor' => '2'], ['conversion_factor' => '1.5'], ['is_base_unit' => 'no'],
            ['is_default_selling_unit' => 'no'], ['is_base_unit' => 'maybe'], ['selling_price' => '-1'],
            ['wholesale_price' => ''], ['unit_short_name' => 'wrong']] as $invalid) {
            $this->importPrices([$this->priceRow($product, $invalid)])->assertSessionHasErrors('unit_price_file');
        }
        $this->importPrices([$this->priceRow($product), $this->priceRow($product)])->assertSessionHasErrors('unit_price_file');
        $this->assertSame('100.00', $base->fresh()->selling_price);
        $this->assertDatabaseCount('units', 1);
        $this->assertDatabaseCount('product_units', 1);
    }

    public function test_unknown_product_rolls_back_prior_price_updates_and_new_shared_units(): void
    {
        [$product, $base] = $this->catalog();
        $this->importPrices([
            $this->priceRow($product, ['selling_price' => '200']),
            $this->priceRow($product, ['unit_name' => 'Box', 'unit_short_name' => 'box', 'conversion_factor' => '100',
                'is_base_unit' => 'no', 'is_default_selling_unit' => 'no']),
            $this->priceRow($product, ['product_id' => 'ffffffff-ffff-4fff-8fff-ffffffffffff']),
        ])->assertSessionHasErrors('unit_price_file');
        $this->assertSame('100.00', $base->fresh()->selling_price);
        $this->assertDatabaseCount('units', 1);
        $this->assertDatabaseCount('product_units', 1);
    }

    public function test_unit_import_respects_disabled_shared_unit_creation(): void
    {
        [$product] = $this->catalog();
        $this->importPrices([$this->priceRow($product, ['unit_name' => 'Box', 'unit_short_name' => 'box',
            'is_base_unit' => 'no', 'is_default_selling_unit' => 'no', 'conversion_factor' => '100'])], false)
            ->assertSessionHasErrors('unit_price_file');
        $this->assertDatabaseCount('units', 1);
    }

    public function test_unit_import_can_create_a_product_specific_pair_despite_a_global_name_match(): void
    {
        [$product] = $this->catalog();
        Unit::create(['name' => 'Box', 'short_name' => 'Box']);

        $this->importPrices([
            $this->priceRow($product, ['is_default_selling_unit' => 'no']),
            $this->priceRow($product, ['unit_name' => 'Box', 'unit_short_name' => 'Bx', 'conversion_factor' => '10',
                'is_base_unit' => 'no', 'is_default_selling_unit' => 'yes', 'selling_price' => '1000', 'wholesale_price' => '900']),
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('units', ['name' => 'Box', 'short_name' => 'Box']);
        $this->assertDatabaseHas('units', ['name' => 'Box', 'short_name' => 'Bx']);
        $this->assertSame('Bx', $product->fresh()->product_units()->where('is_default_selling_unit', true)->firstOrFail()->unit->short_name);
    }

    public function test_unit_names_and_short_names_remain_unique_within_one_medicine(): void
    {
        [$product] = $this->catalog();
        $box = Unit::create(['name' => 'Box', 'short_name' => 'Box']);
        $product->product_units()->create(['unit_id' => $box->id, 'conversion_factor' => 10,
            'selling_price' => 1000, 'wholesale_price' => 900, 'is_base_unit' => false, 'is_default_selling_unit' => false]);

        $response = $this->importPrices([$this->priceRow($product, ['unit_name' => 'Box', 'unit_short_name' => 'Bx'])])
            ->assertSessionHasErrors('unit_price_file');
        $message = $response->getSession()->get('errors')->first('unit_price_file');
        $this->assertStringContainsString('Both must match the same unit', $message);
        $this->assertStringNotContainsString('final units must have exactly one', $message);
    }

    public function test_medicine_form_creates_typed_units_without_initial_unit_setup(): void
    {
        $category = Category::create(['name' => 'General']);
        $this->post('/products', [
            'category_id' => $category->id, 'generic_name' => 'Generic', 'brand_name' => 'Flexible medicine',
            'tax_method' => 'Exclusive', 'status' => 'Active', 'min_stock_level' => 10,
            'product_units' => [[
                'unit_name' => 'Packet', 'unit_short_name' => 'Pkt', 'conversion_factor' => 1,
                'selling_price' => 100, 'wholesale_price' => 90, 'is_base_unit' => true,
                'is_default_selling_unit' => true,
            ]],
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('units', ['name' => 'Packet', 'short_name' => 'Pkt']);
        $this->assertDatabaseHas('product_units', ['conversion_factor' => 1, 'selling_price' => 100]);
    }

    public function test_import_page_and_all_endpoints_require_inventory_permission(): void
    {
        $this->get('/products/import', ['X-SPA' => 'true'])->assertOk()->assertJsonPath('component', 'Products/Import');
        $this->actingAs(User::factory()->create());
        foreach (['/products/import', '/products/import/template', '/products/import/unit-prices/template'] as $path) {
            $this->get($path)->assertForbidden();
        }
        $this->post('/products/import', [])->assertForbidden();
        $this->post('/products/import/unit-prices', [])->assertForbidden();
    }

    public function test_standalone_unit_crud_is_not_exposed(): void
    {
        $this->get('/units')->assertNotFound();
        $this->post('/units', ['name' => 'Box', 'short_name' => 'Bx'])->assertNotFound();
    }

    public function test_reordered_headers_blank_rows_and_empty_file(): void
    {
        $row = $this->productRow();
        $headers = array_reverse(ProductCsvImportService::HEADERS);
        $file = $this->csv($headers, [$row, array_fill_keys($headers, '')]);
        $this->post('/products/import', ['file' => $file, 'create_missing_categories' => true, 'create_missing_units' => true])
            ->assertSessionHasNoErrors();
        $this->importProducts([])->assertSessionHasErrors('file');
        $this->assertDatabaseCount('products', 1);
    }

    private function productRow(array $overrides = []): array
    {
        return array_replace(array_fill_keys(ProductCsvImportService::HEADERS, ''), [
            'generic_name' => 'Paracetamol', 'brand_name' => 'Example', 'category' => 'Pain relief',
            'base_unit_name' => 'Tablet', 'base_unit_short_name' => 'tab', 'buying_cost' => '70', 'selling_price' => '100',
        ], $overrides);
    }

    private function priceRow(Product $product, array $overrides = []): array
    {
        return array_replace(['product_id' => $product->id, 'barcode' => $product->barcode, 'product_name' => $product->name,
            'unit_name' => 'Tablet', 'unit_short_name' => 'tab', 'conversion_factor' => '1',
            'is_base_unit' => 'yes', 'is_default_selling_unit' => 'yes', 'selling_price' => '100', 'wholesale_price' => '90'], $overrides);
    }

    private function catalog(): array
    {
        $product = Product::factory()->create();
        $unit = Unit::create(['name' => 'Tablet', 'short_name' => 'tab']);
        $base = $product->product_units()->create(['unit_id' => $unit->id, 'conversion_factor' => 1,
            'selling_price' => 100, 'wholesale_price' => 90, 'is_base_unit' => true, 'is_default_selling_unit' => true]);
        return [$product, $base];
    }

    private function importProducts(array $rows, bool $categories = true, bool $units = true)
    {
        return $this->from('/products/import')->post('/products/import', ['file' => $this->csv(ProductCsvImportService::HEADERS, $rows),
            'create_missing_categories' => $categories, 'create_missing_units' => $units]);
    }

    private function importPrices(array $rows, bool $units = true)
    {
        return $this->from('/products/import')->post('/products/import/unit-prices', [
            'unit_price_file' => $this->csv(ProductUnitPriceCsvService::HEADERS, $rows), 'create_missing_units' => $units]);
    }

    private function csv(array $headers, array $rows): UploadedFile
    {
        $output = fopen('php://temp', 'w+');
        fwrite($output, "\xEF\xBB\xBF");
        fputcsv($output, $headers, ',', '"', '');
        foreach ($rows as $row) fputcsv($output, array_map(fn ($header) => $row[$header], $headers), ',', '"', '');
        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);
        return UploadedFile::fake()->createWithContent('import.csv', $content);
    }
}
