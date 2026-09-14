<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Tax;
use App\Models\Unit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ProductCsvImportService
{
    public const HEADERS = [
        'generic_name', 'brand_name', 'category', 'manufacturer', 'strength', 'barcode',
        'base_unit_name', 'base_unit_short_name', 'buying_cost', 'selling_price', 'wholesale_price',
        'min_stock_level', 'discount_percentage', 'expiry_alert_days', 'tax_names',
        'tax_method', 'status', 'description',
    ];

    public function import(UploadedFile $file, bool $createCategories, bool $createUnits): array
    {
        [$rows, $skipped] = CatalogCsv::read($file, self::HEADERS, 'file', 10000);
        $errors = [];
        $barcodes = [];
        foreach ($rows as &$row) {
            foreach (['min_stock_level' => '10', 'discount_percentage' => '0', 'expiry_alert_days' => '90',
                'tax_method' => 'Exclusive', 'status' => 'Active'] as $key => $default) {
                if ($row[$key] === '') $row[$key] = $default;
            }
            $row['wholesale_price'] = $row['wholesale_price'] === '' ? $row['selling_price'] : $row['wholesale_price'];
            $row['status'] = ucfirst(CatalogCsv::key($row['status']));
            $row['tax_method'] = ucfirst(CatalogCsv::key($row['tax_method']));
            $validator = Validator::make($row, [
                'generic_name' => 'required|string|max:255', 'brand_name' => 'required|string|max:255',
                'category' => 'required|string|max:255', 'manufacturer' => 'nullable|string|max:255',
                'strength' => 'nullable|string|max:100', 'barcode' => 'nullable|string|max:255',
                'base_unit_name' => 'required|string|max:255', 'base_unit_short_name' => 'required|string|max:50',
                'buying_cost' => ['required', 'regex:/^\d{1,12}(\.\d{1,6})?$/'],
                'selling_price' => CatalogCsv::moneyRules(), 'wholesale_price' => CatalogCsv::moneyRules(),
                'min_stock_level' => 'required|integer|min:0|max:2147483647',
                'expiry_alert_days' => 'required|integer|min:0|max:2147483647',
                'discount_percentage' => 'required|numeric|min:0|max:100',
                'tax_method' => 'required|in:Exclusive,Inclusive', 'status' => 'required|in:Active,Inactive',
                'description' => 'nullable|string|max:16000', 'tax_names' => 'nullable|string|max:2000',
            ]);
            foreach ($validator->errors()->all() as $error) $errors[] = "Row {$row['_line']}: {$error}";
            if ($row['barcode'] !== '') {
                $key = CatalogCsv::key($row['barcode']);
                if (isset($barcodes[$key])) $errors[] = "Row {$row['_line']}: barcode is duplicated in this file.";
                $barcodes[$key] = true;
            }
        }
        unset($row);
        CatalogCsv::fail('file', $errors);

        return DB::transaction(function () use ($rows, $skipped, $createCategories, $createUnits) {
            $pricing = app(AutomaticPricingService::class);
            $pricing->lock();
            $categories = Category::query()->get();
            $units = Unit::query()->get();
            $taxes = Tax::query()->where('status', true)->get();
            $categoryCount = $categories->count();
            $unitCount = $units->count();
            $errors = [];
            foreach ($rows as $row) {
                try {
                    $matches = $categories->filter(fn ($category) => CatalogCsv::key($category->name) === CatalogCsv::key($row['category']));
                    if ($matches->count() > 1) CatalogCsv::fail('file', ['Category name is ambiguous. Rename duplicate categories first.']);
                    $category = $matches->first();
                    if (!$category && !$createCategories) CatalogCsv::fail('file', ["Category '{$row['category']}' does not exist."]);

                    $taxIds = [];
                    $taxNames = $row['tax_names'] === '' ? ['Tax Free'] : explode('|', $row['tax_names']);
                    foreach ($taxNames as $taxName) {
                        $matches = $taxes->filter(fn ($tax) => CatalogCsv::key($tax->name) === CatalogCsv::key($taxName));
                        if ($matches->count() !== 1) CatalogCsv::fail('file', ["Tax '{$taxName}' must match one active tax. Configure taxes before importing."]);
                        $taxIds[] = $matches->first()->id;
                    }
                    $barcode = $row['barcode'];
                    if ($barcode !== '' && Product::withTrashed()->where('barcode', $barcode)->exists()) {
                        CatalogCsv::fail('file', ['Barcode already exists, including archived medicines.']);
                    }
                    if ($barcode === '') {
                        do {
                            $barcode = '20'.str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT);
                        } while (Product::withTrashed()->where('barcode', $barcode)->exists()
                            || in_array($barcode, array_column($rows, 'barcode'), true));
                    }
                    $unit = CatalogCsv::resolveUnit($units, $row['base_unit_name'], $row['base_unit_short_name'], $createUnits, 'file');
                    if (!$category) {
                        $category = Category::create(['name' => $row['category']]);
                        $categories->push($category);
                    }
                    $product = Product::create(collect($row)->only([
                        'generic_name', 'brand_name', 'manufacturer', 'strength', 'min_stock_level',
                        'discount_percentage', 'expiry_alert_days', 'tax_method', 'status', 'description',
                    ])->all() + [
                        'name' => $row['brand_name'], 'category_id' => $category->id,
                        'tax_id' => $taxIds[0], 'barcode' => $barcode, 'pricing_base_cost' => $row['buying_cost'],
                    ]);
                    $product->taxes()->sync(array_unique($taxIds));
                    $product->product_units()->create([
                        'unit_id' => $unit->id, 'conversion_factor' => 1,
                        'selling_price' => $row['selling_price'], 'wholesale_price' => $row['wholesale_price'],
                        'is_base_unit' => true, 'is_default_selling_unit' => true,
                        'selling_price_mode' => 'manual', 'wholesale_price_mode' => 'manual',
                    ]);
                    $pricing->refreshProduct($product, 'product_import', auth()->id());
                } catch (ValidationException $exception) {
                    $errors[] = "Row {$row['_line']}: ".str_replace("Import failed. No changes were saved.\n", '', $exception->validator->errors()->first('file'));
                }
            }
            CatalogCsv::fail('file', $errors);
            return ['products' => count($rows), 'categories' => $categories->count() - $categoryCount,
                'units' => $units->count() - $unitCount, 'skipped_rows' => $skipped];
        });
    }
}
