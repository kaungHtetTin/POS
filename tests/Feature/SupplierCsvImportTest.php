<?php

namespace Tests\Feature;

use App\Models\Supplier;
use App\Models\User;
use App\Services\SupplierCsvImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class SupplierCsvImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Gate::define('manage_inventory', fn ($user) => $user->email === 'importer@example.test');
        $this->actingAs(User::factory()->create(['email' => 'importer@example.test']));
    }

    public function test_template_download_and_import_page_are_accessible_and_template_imports(): void
    {
        $this->get('/suppliers/import', ['X-SPA' => 'true'])->assertOk()->assertJsonPath('component', 'Suppliers/Import');
        $csv = $this->get('/suppliers/import/template')->assertOk()->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF".implode(',', SupplierCsvImportService::HEADERS), $csv);
        $this->upload($csv)->assertSessionHasNoErrors()->assertRedirect('/suppliers');
        $this->assertDatabaseHas('suppliers', ['name' => 'Example Medical Supplies', 'phone' => '09123456789', 'balance' => 0]);
    }

    public function test_import_preserves_unicode_phone_and_quoted_multiline_text_and_defaults(): void
    {
        $name = "\u{1006}\u{1031}\u{1038} Medical";
        $address = "Street one, \"Building A\"\nSecond floor";
        $this->upload($this->csv([
            [$name, '001234', 'medical@example.test', $address, 'Net 30'],
            ['Name only', '', '', '', ''],
            ['Name only', '', '', '', ''],
            ['', '', '', '', ''],
        ]))->assertSessionHasNoErrors()->assertSessionHas('success', 'Import complete: 3 suppliers created; 0 updated; 1 blank rows skipped.');
        $this->assertDatabaseCount('suppliers', 3);
        $this->assertDatabaseHas('suppliers', ['name' => $name, 'phone' => '001234', 'address' => $address, 'balance' => 0, 'credit_limit' => 0]);
        $this->assertDatabaseHas('suppliers', ['name' => 'Name only', 'phone' => null, 'email' => null, 'payment_terms' => null]);
    }

    public function test_supplier_export_format_can_create_a_new_supplier(): void
    {
        $this->upload($this->exportCsv([[
            'Id' => 'external-supplier-id',
            'Name' => 'Exported Supplier',
            'Phone' => '00951',
            'Email' => 'exported@example.test',
            'Address' => 'Exported address',
            'Payment Terms' => 'Net 45',
            'Credit Limit' => '1000.00',
            'Balance' => '500.00',
        ]]))->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Import complete: 1 suppliers created; 0 updated; 0 blank rows skipped.');

        $this->assertDatabaseHas('suppliers', [
            'name' => 'Exported Supplier', 'phone' => '00951', 'email' => 'exported@example.test',
            'address' => 'Exported address', 'payment_terms' => 'Net 45', 'balance' => 0, 'credit_limit' => 0,
        ]);
    }

    public function test_supplier_export_reimport_updates_matching_supplier_and_preserves_financial_values(): void
    {
        $supplier = Supplier::create([
            'name' => 'Original Supplier', 'phone' => '001', 'email' => 'original@example.test',
            'address' => 'Old address', 'payment_terms' => 'Net 15', 'balance' => 1250, 'credit_limit' => 3000,
        ]);

        $this->upload($this->exportCsv([[
            'Id' => $supplier->id,
            'Name' => 'Updated Supplier',
            'Phone' => '002',
            'Email' => 'updated@example.test',
            'Address' => 'New address',
            'Payment Terms' => 'Net 30',
            'Credit Limit' => '0.00',
            'Balance' => '0.00',
        ]]))->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Import complete: 0 suppliers created; 1 updated; 0 blank rows skipped.');

        $this->assertDatabaseCount('suppliers', 1);
        $supplier->refresh();
        $this->assertSame('Updated Supplier', $supplier->name);
        $this->assertSame('002', $supplier->phone);
        $this->assertSame('updated@example.test', $supplier->email);
        $this->assertSame('New address', $supplier->address);
        $this->assertSame('Net 30', $supplier->payment_terms);
        $this->assertSame('1250.00', $supplier->balance);
        $this->assertSame('3000.00', $supplier->credit_limit);
    }

    public function test_duplicate_contacts_in_file_reject_entire_import_with_row_numbers(): void
    {
        foreach ([['001', '001', '', ''], ['', '', 'Sales@example.test', 'sales@example.test']] as [$phone1, $phone2, $email1, $email2]) {
            $response = $this->upload($this->csv([
                ['First', $phone1, $email1, '', ''], ['Second', $phone2, $email2, '', ''],
            ]))->assertSessionHasErrors('file');
            $response->assertSessionHas('errors', fn ($errors) => str_contains($errors->first('file'), 'Row 3:'));
        }
        $this->assertDatabaseCount('suppliers', 0);
    }

    public function test_existing_contacts_are_rejected_and_existing_balance_is_unchanged(): void
    {
        $supplier = Supplier::create(['name' => 'Existing', 'phone' => '001', 'email' => 'sales@example.test', 'balance' => 1250]);
        foreach ([['001', ''], ['', 'SALES@example.test']] as [$phone, $email]) {
            $this->upload($this->csv([
                ['Valid new supplier', '', '', '', ''], ['Duplicate', $phone, $email, '', ''],
            ]))->assertSessionHasErrors('file');
        }
        $this->assertDatabaseCount('suppliers', 1);
        $this->assertSame('1250.00', $supplier->fresh()->balance);
        $this->assertSame('Existing', $supplier->fresh()->name);
    }

    public function test_invalid_later_rows_prevent_valid_rows_being_saved(): void
    {
        foreach ([['name' => ''], ['name' => str_repeat('x', 256)], ['phone' => str_repeat('1', 21)],
            ['email' => 'invalid'], ['address' => str_repeat('x', 501)], ['payment_terms' => str_repeat('x', 501)]] as $invalid) {
            $row = array_replace(array_fill_keys(SupplierCsvImportService::HEADERS, ''), ['name' => 'Second', 'email' => 'second@example.test'], $invalid);
            $this->upload($this->csv([['Valid', '', '', '', ''], array_values($row)]))->assertSessionHasErrors('file');
        }
        $this->assertDatabaseCount('suppliers', 0);
    }

    public function test_reordered_headers_and_trimmed_values_are_supported(): void
    {
        $this->upload(" EMAIL ,payment_terms,address,phone,name\n person@example.test ,Net 30, City ,001, Supplier \n")
            ->assertSessionHasNoErrors();
        $this->assertDatabaseHas('suppliers', ['name' => 'Supplier', 'email' => 'person@example.test', 'address' => 'City', 'phone' => '001']);
    }

    public function test_missing_extra_duplicate_headers_empty_files_and_bad_column_counts_fail(): void
    {
        foreach (['', "name,phone\nA,001\n", "name,phone,email,address,name\nA,,,,B\n",
            "name,phone,email,address,payment_terms,balance\nA,,,,,1000\n",
            "name,phone,email,address,payment_terms\n", "name,phone,email,address,payment_terms\nA,001\n"] as $csv) {
            $this->upload($csv)->assertSessionHasErrors('file');
        }
        $this->post('/suppliers/import', [])->assertSessionHasErrors('file');
        $this->assertDatabaseCount('suppliers', 0);
    }

    public function test_csv_row_limit_is_enforced_without_saving(): void
    {
        $this->upload(implode(',', SupplierCsvImportService::HEADERS)."\n".str_repeat("Supplier,,,,\n", 10001))
            ->assertSessionHasErrors('file');
        $this->assertDatabaseCount('suppliers', 0);
    }

    public function test_import_requires_inventory_permission(): void
    {
        $this->actingAs(User::factory()->create());
        $this->get('/suppliers/import')->assertForbidden();
        $this->get('/suppliers/import/template')->assertForbidden();
        $this->upload($this->csv([['New supplier', '', '', '', '']]))->assertForbidden();
        $this->assertDatabaseCount('suppliers', 0);
    }

    private function upload(string $csv)
    {
        return $this->post('/suppliers/import', ['file' => UploadedFile::fake()->createWithContent('suppliers.csv', $csv)]);
    }

    private function csv(array $rows): string
    {
        $stream = fopen('php://temp', 'w+');
        fwrite($stream, "\xEF\xBB\xBF");
        fputcsv($stream, SupplierCsvImportService::HEADERS, ',', '"', '');
        foreach ($rows as $row) fputcsv($stream, $row, ',', '"', '');
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        return $csv;
    }

    private function exportCsv(array $rows): string
    {
        $headers = [
            'Id', 'Name', 'Phone', 'Email', 'Address', 'Payment Terms', 'Credit Limit', 'Balance',
            'Created At', 'Updated At', 'Purchases Count',
        ];
        $quote = fn ($value) => '"'.str_replace('"', '""', (string) $value).'"';
        $lines = [implode(',', array_map($quote, $headers))];
        foreach ($rows as $row) {
            $lines[] = implode(',', array_map(fn ($header) => $quote($row[$header] ?? ''), $headers));
        }
        return "\xEF\xBB\xBF".implode("\r\n", $lines);
    }
}
