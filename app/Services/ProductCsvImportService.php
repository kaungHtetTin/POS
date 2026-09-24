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
        [$header, $rows, $skipped] = CatalogCsv::readRows($file, 'file', 10000);
        if (count($header) !== count(self::HEADERS) || array_diff(self::HEADERS, $header)) {
            $rows = $this->normalizeProductExport($header, $rows);
        }
        $errors = [];
        $barcodes = [];
        $exportIds = [];
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
            foreach (($row['_export_units'] ?? []) as $index => $exportUnit) {
                $unitValidator = Validator::make($exportUnit, [
                    'unit_name' => 'required|string|max:255', 'unit_short_name' => 'required|string|max:50',
                    'conversion_factor' => 'required|integer|min:1|max:2147483647',
                    'selling_price' => CatalogCsv::moneyRules(), 'wholesale_price' => CatalogCsv::moneyRules(),
                    'is_base_unit' => 'present|boolean', 'is_default_selling_unit' => 'present|boolean',
                ]);
                foreach ($unitValidator->errors()->all() as $error) {
                    $errors[] = 'Row '.$row['_line'].' unit '.($index + 1).": {$error}";
                }
            }
            if ($row['barcode'] !== '') {
                $key = CatalogCsv::key($row['barcode']);
                if (isset($barcodes[$key])) $errors[] = "Row {$row['_line']}: barcode is duplicated in this file.";
                $barcodes[$key] = true;
            }
            if (($row['_export_id'] ?? '') !== '') {
                $key = CatalogCsv::key($row['_export_id']);
                if (isset($exportIds[$key])) $errors[] = "Row {$row['_line']}: product Id is duplicated in this file.";
                $exportIds[$key] = true;
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
            $createdCount = 0;
            $updatedCount = 0;
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
                    $exportId = $row['_export_id'] ?? '';
                    $product = $exportId === '' ? null : Product::withTrashed()->lockForUpdate()->find($exportId);
                    if ($product?->trashed()) {
                        CatalogCsv::fail('file', ['The exported medicine is archived. Restore it before importing updates.']);
                    }
                    $isUpdate = $product !== null;
                    $barcode = $row['barcode'];
                    if ($barcode !== '') {
                        $barcodeOwner = Product::withTrashed()->where('barcode', $barcode);
                        if ($product) $barcodeOwner->whereKeyNot($product->id);
                        if ($barcodeOwner->exists()) {
                            CatalogCsv::fail('file', ['Barcode belongs to a different medicine, including archived medicines.']);
                        }
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
                    $payload = collect($row)->only([
                        'generic_name', 'brand_name', 'manufacturer', 'strength', 'min_stock_level',
                        'discount_percentage', 'expiry_alert_days', 'tax_method', 'status', 'description',
                    ])->all() + [
                        'name' => $row['brand_name'], 'category_id' => $category->id,
                        'tax_id' => $taxIds[0], 'barcode' => $barcode, 'pricing_base_cost' => $row['buying_cost'],
                    ];
                    if ($product) {
                        $product->update($payload);
                        $updatedCount++;
                    } else {
                        $product = Product::create($payload);
                        $createdCount++;
                    }
                    $product->taxes()->sync(array_unique($taxIds));
                    $unitRows = [[
                        'unit_id' => $unit->id, 'conversion_factor' => 1,
                        'selling_price' => $row['selling_price'], 'wholesale_price' => $row['wholesale_price'],
                        'is_base_unit' => true, 'is_default_selling_unit' => $row['_base_is_default'] ?? true,
                        'selling_price_mode' => 'manual', 'wholesale_price_mode' => 'manual',
                    ]];
                    foreach (($row['_export_units'] ?? []) as $exportUnit) {
                        if ($exportUnit['is_base_unit']) continue;
                        $additionalUnit = CatalogCsv::resolveUnit(
                            $units,
                            $exportUnit['unit_name'],
                            $exportUnit['unit_short_name'],
                            $createUnits,
                            'file'
                        );
                        $unitRows[] = [
                            'unit_id' => $additionalUnit->id,
                            'conversion_factor' => $exportUnit['conversion_factor'],
                            'selling_price' => $exportUnit['selling_price'],
                            'wholesale_price' => $exportUnit['wholesale_price'],
                            'is_base_unit' => false,
                            'is_default_selling_unit' => $exportUnit['is_default_selling_unit'],
                            'selling_price_mode' => 'manual',
                            'wholesale_price_mode' => 'manual',
                        ];
                    }
                    if ($isUpdate) {
                        $pricing->saveUnits($product, $unitRows);
                    } else {
                        foreach ($unitRows as $unitRow) $product->product_units()->create($unitRow);
                    }
                    $pricing->refreshProduct($product, 'product_import', auth()->id());
                } catch (ValidationException $exception) {
                    $errors[] = "Row {$row['_line']}: ".str_replace("Import failed. No changes were saved.\n", '', $exception->validator->errors()->first('file'));
                }
            }
            CatalogCsv::fail('file', $errors);
            return ['products' => count($rows), 'created' => $createdCount, 'updated' => $updatedCount,
                'categories' => $categories->count() - $categoryCount,
                'units' => $units->count() - $unitCount, 'skipped_rows' => $skipped];
        });
    }

    /**
     * Convert the legacy generic Product Export shape into the flat import shape.
     * That export humanizes object paths and serializes collection relations as JSON.
     */
    private function normalizeProductExport(array $header, array $rows): array
    {
        if (!in_array('generic name', $header, true) || !in_array('brand name', $header, true)
            || !in_array('product units', $header, true)) {
            CatalogCsv::fail('file', [
                'Use either the downloaded product template or a CSV created by Product Export. Keep its column names unchanged.',
            ]);
        }

        $errors = [];
        $normalized = [];
        foreach ($rows as $row) {
            $line = $row['_line'];
            $units = $this->jsonArray($row['product units'] ?? '', $line, 'Product Units', $errors);
            $exportUnits = collect($units)->map(function ($productUnit) {
                $unit = is_array($productUnit['unit'] ?? null) ? $productUnit['unit'] : [];
                $sellingPrice = (string) ($productUnit['selling_price'] ?? '');
                $wholesalePrice = (string) ($productUnit['wholesale_price'] ?? '');
                return [
                    'unit_name' => (string) ($unit['name'] ?? ''),
                    'unit_short_name' => (string) ($unit['short_name'] ?? ''),
                    'conversion_factor' => $productUnit['conversion_factor'] ?? '',
                    'selling_price' => $sellingPrice,
                    'wholesale_price' => $wholesalePrice === '' ? $sellingPrice : $wholesalePrice,
                    'is_base_unit' => $this->exportBoolean($productUnit['is_base_unit'] ?? null),
                    'is_default_selling_unit' => $this->exportBoolean($productUnit['is_default_selling_unit'] ?? null),
                ];
            })->values();
            if ($exportUnits->where('is_base_unit', true)->count() !== 1) {
                $errors[] = "Row {$line}: Product Units must contain exactly one base unit.";
            }
            if ($exportUnits->where('is_default_selling_unit', true)->count() !== 1) {
                $errors[] = "Row {$line}: Product Units must contain exactly one default selling unit.";
            }
            $baseUnit = $exportUnits->firstWhere('is_base_unit', true) ?? [];

            $taxes = $this->jsonArray($row['taxes'] ?? '', $line, 'Taxes', $errors, true);
            $taxNames = collect($taxes)->pluck('name')->filter()->implode('|');
            if ($taxNames === '') $taxNames = $row['tax / name'] ?? '';

            $normalized[] = [
                'generic_name' => $row['generic name'] ?? '',
                'brand_name' => $row['brand name'] ?? ($row['name'] ?? ''),
                'category' => $row['category / name'] ?? '',
                'manufacturer' => $row['manufacturer'] ?? '',
                'strength' => $row['strength'] ?? '',
                'barcode' => $row['barcode'] ?? '',
                'base_unit_name' => $baseUnit['unit_name'] ?? '',
                'base_unit_short_name' => $baseUnit['unit_short_name'] ?? '',
                'buying_cost' => ($row['pricing base cost'] ?? '') !== '' ? $row['pricing base cost'] : '0',
                'selling_price' => $baseUnit['selling_price'] ?? '',
                'wholesale_price' => $baseUnit['wholesale_price'] ?? '',
                'min_stock_level' => $row['min stock level'] ?? '',
                'discount_percentage' => $row['discount percentage'] ?? '',
                'expiry_alert_days' => $row['expiry alert days'] ?? '',
                'tax_names' => $taxNames,
                'tax_method' => $row['tax method'] ?? '',
                'status' => $row['status'] ?? '',
                'description' => $row['description'] ?? '',
                '_export_id' => $row['id'] ?? '',
                '_base_is_default' => $baseUnit['is_default_selling_unit'] ?? true,
                '_export_units' => $exportUnits->all(),
                '_line' => $line,
            ];
        }
        CatalogCsv::fail('file', $errors);
        return $normalized;
    }

    private function jsonArray(string $value, int $line, string $column, array &$errors, bool $allowBlank = false): array
    {
        if ($value === '' && $allowBlank) return [];
        $decoded = json_decode($value, true);
        if (!is_array($decoded) || (!$allowBlank && $decoded === [])) {
            $errors[] = "Row {$line}: {$column} from Product Export is invalid or empty.";
            return [];
        }
        $isList = $decoded === [] || array_keys($decoded) === range(0, count($decoded) - 1);
        return $isList ? $decoded : [$decoded];
    }

    private function exportBoolean($value): ?bool
    {
        return is_bool($value) ? $value : CatalogCsv::boolean((string) ($value ?? ''));
    }
}
