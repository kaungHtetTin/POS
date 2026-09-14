<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Unit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ProductUnitPriceCsvService
{
    public const HEADERS = [
        'product_id', 'barcode', 'product_name', 'unit_name', 'unit_short_name',
        'conversion_factor', 'is_base_unit', 'is_default_selling_unit', 'selling_price', 'wholesale_price',
    ];

    public function import(UploadedFile $file, bool $createUnits): array
    {
        [$rows, $skipped] = CatalogCsv::read($file, self::HEADERS, 'unit_price_file', 50000);
        $errors = [];
        foreach ($rows as &$row) {
            $row['product_id'] = strtolower($row['product_id']);
            foreach (['is_base_unit', 'is_default_selling_unit'] as $flag) $row[$flag] = CatalogCsv::boolean($row[$flag]);
            $validator = Validator::make($row, [
                'product_id' => 'required|uuid', 'unit_name' => 'required|string|max:255',
                'unit_short_name' => 'required|string|max:50',
                'conversion_factor' => 'required|integer|min:1|max:2147483647',
                'is_base_unit' => 'required|boolean', 'is_default_selling_unit' => 'required|boolean',
                'selling_price' => CatalogCsv::moneyRules(), 'wholesale_price' => CatalogCsv::moneyRules(),
            ]);
            foreach ($validator->errors()->all() as $error) $errors[] = "Row {$row['_line']}: {$error}";
            if ($row['is_base_unit'] && $row['conversion_factor'] !== '1') $errors[] = "Row {$row['_line']}: base unit conversion factor must be 1.";
        }
        unset($row);
        CatalogCsv::fail('unit_price_file', $errors);

        return DB::transaction(function () use ($rows, $skipped, $createUnits) {
            $pricing = app(AutomaticPricingService::class);
            $pricing->lock();
            $units = Unit::query()->get();
            $errors = [];
            $stats = ['products' => 0, 'units_created' => 0, 'units_updated' => 0, 'skipped_rows' => $skipped];
            foreach (collect($rows)->groupBy('product_id')->sortKeys() as $productId => $productRows) {
                $product = Product::query()->whereKey($productId)->lockForUpdate()->first();
                if (!$product) {
                    $errors[] = "Row {$productRows->first()['_line']}: product ID '{$productId}' does not match an existing medicine.";
                    continue;
                }
                $existing = $product->product_units()->lockForUpdate()->get();
                if ($existing->pluck('unit_id')->duplicates()->isNotEmpty()) {
                    $errors[] = "{$product->name}: duplicate existing units must be corrected before importing.";
                    continue;
                }
                $finalUnits = $existing->keyBy('unit_id')->map(fn ($unit) => $unit->toArray())->all();
                $changes = [];
                $productHasRowErrors = false;
                foreach ($productRows as $row) {
                    try {
                        $nameMatches = $existing->filter(fn ($candidate) => CatalogCsv::key($candidate->unit->name) === CatalogCsv::key($row['unit_name']));
                        $codeMatches = $existing->filter(fn ($candidate) => CatalogCsv::key((string) $candidate->unit->short_name) === CatalogCsv::key($row['unit_short_name']));
                        if (($nameMatches->isNotEmpty() && $codeMatches->isEmpty()) || ($nameMatches->isEmpty() && $codeMatches->isNotEmpty())) {
                            CatalogCsv::fail('unit_price_file', ['The unit name or short name matches another unit on this medicine. Both must match the same unit.']);
                        }
                        if ($nameMatches->isNotEmpty() && $codeMatches->isNotEmpty() && $nameMatches->first()->id !== $codeMatches->first()->id) {
                            CatalogCsv::fail('unit_price_file', ['The unit name and short name match different units on this medicine.']);
                        }
                        $unit = $nameMatches->isNotEmpty() && $codeMatches->isNotEmpty()
                            ? $nameMatches->first()->unit
                            : CatalogCsv::resolveUnit($units, $row['unit_name'], $row['unit_short_name'], $createUnits, 'unit_price_file');
                        if (isset($changes[$unit->id])) CatalogCsv::fail('unit_price_file', ['Duplicate product and unit row.']);
                        $current = $existing->firstWhere('unit_id', $unit->id);
                        if ($current && ((int) $row['conversion_factor'] !== $current->conversion_factor
                            || $row['is_base_unit'] !== $current->is_base_unit)) {
                            CatalogCsv::fail('unit_price_file', ['Existing unit conversion factors and base-unit selection cannot be changed by CSV import.']);
                        }
                        $payload = collect($row)->only(['conversion_factor', 'is_base_unit', 'is_default_selling_unit', 'selling_price', 'wholesale_price'])->all();
                        $payload += ['selling_price_mode' => 'manual', 'wholesale_price_mode' => 'manual', 'selling_price_status' => 'manual', 'wholesale_price_status' => 'manual'];
                        $changes[$unit->id] = $payload;
                        $finalUnits[$unit->id] = $payload;
                    } catch (ValidationException $exception) {
                        $productHasRowErrors = true;
                        $errors[] = "Row {$row['_line']}: ".str_replace("Import failed. No changes were saved.\n", '', $exception->validator->errors()->first('unit_price_file'));
                    }
                }
                if ($productHasRowErrors) continue;
                if (collect($finalUnits)->where('is_base_unit', true)->count() !== 1
                    || collect($finalUnits)->where('is_default_selling_unit', true)->count() !== 1) {
                    $errors[] = "{$product->name}: the final units must have exactly one base unit and one default selling unit. Include both affected rows when changing the default.";
                    continue;
                }
                foreach ($changes as $unitId => $payload) {
                    $current = $existing->firstWhere('unit_id', $unitId);
                    if ($current) {
                        $current->update($payload);
                        $stats['units_updated']++;
                    } else {
                        $product->product_units()->create(['unit_id' => $unitId] + $payload);
                        $stats['units_created']++;
                    }
                }
                $pricing->refreshProduct($product, 'unit_price_import', auth()->id());
                $stats['products']++;
            }
            CatalogCsv::fail('unit_price_file', $errors);
            return $stats;
        });
    }
}
