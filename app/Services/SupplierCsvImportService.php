<?php

namespace App\Services;

use App\Models\Supplier;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SupplierCsvImportService
{
    public const HEADERS = ['name', 'phone', 'email', 'address', 'payment_terms'];

    public function import(UploadedFile $file): array
    {
        [$header, $rows, $skipped] = CatalogCsv::readRows($file, 'file', 10000);
        if (count($header) !== count(self::HEADERS) || array_diff(self::HEADERS, $header)) {
            $rows = $this->normalizeSupplierExport($header, $rows);
        }

        return DB::transaction(function () use ($rows, $skipped) {
            $errors = [];
            $suppliers = [];
            $seen = ['phone' => [], 'email' => []];
            $seenIds = [];
            foreach ($rows as $row) {
                $line = $row['_line'];
                $exportId = $row['_export_id'] ?? '';
                if ($exportId !== '') {
                    $key = CatalogCsv::key($exportId);
                    if (isset($seenIds[$key])) $errors[] = "Row {$line}: supplier Id duplicates row {$seenIds[$key]}.";
                    else $seenIds[$key] = $line;
                }
                $existing = $exportId === '' ? null : Supplier::query()->lockForUpdate()->find($exportId);
                $payload = collect($row)->only(self::HEADERS)
                    ->map(fn ($value) => $value === '' ? null : $value)
                    ->all();
                $validator = Validator::make($row, [
                    'name' => 'required|string|max:255',
                    'phone' => ['nullable', 'string', 'max:20', Rule::unique('suppliers', 'phone')->ignore($existing?->id)],
                    'email' => ['nullable', 'email', 'max:255', Rule::unique('suppliers', 'email')->ignore($existing?->id)],
                    'address' => 'nullable|string|max:500',
                    'payment_terms' => 'nullable|string|max:500',
                ]);
                foreach ($validator->errors()->all() as $error) {
                    $errors[] = "Row {$line}: {$error}";
                }
                foreach (['phone', 'email'] as $field) {
                    if ($payload[$field] === null) continue;
                    $key = CatalogCsv::key($payload[$field]);
                    if (isset($seen[$field][$key])) {
                        $errors[] = "Row {$line}: {$field} duplicates row {$seen[$field][$key]}.";
                    } else {
                        $seen[$field][$key] = $line;
                    }
                }
                $suppliers[] = ['model' => $existing, 'payload' => $payload];
            }
            CatalogCsv::fail('file', $errors);

            $created = 0;
            $updated = 0;
            foreach ($suppliers as $supplier) {
                if ($supplier['model']) {
                    $supplier['model']->update($supplier['payload']);
                    $updated++;
                } else {
                    Supplier::create($supplier['payload']);
                    $created++;
                }
            }

            return ['suppliers' => count($suppliers), 'created' => $created, 'updated' => $updated,
                'skipped_rows' => $skipped];
        });
    }

    /** Convert the generic Supplier Export headings into the import template shape. */
    private function normalizeSupplierExport(array $header, array $rows): array
    {
        $required = ['id', 'name', 'phone', 'email', 'address', 'payment terms'];
        if (array_diff($required, $header)) {
            CatalogCsv::fail('file', [
                'Use either the downloaded supplier template or a CSV created by Supplier Export. Keep its column names unchanged.',
            ]);
        }

        return array_map(fn ($row) => [
            'name' => $row['name'] ?? '',
            'phone' => $row['phone'] ?? '',
            'email' => $row['email'] ?? '',
            'address' => $row['address'] ?? '',
            'payment_terms' => $row['payment terms'] ?? '',
            '_export_id' => $row['id'] ?? '',
            '_line' => $row['_line'],
        ], $rows);
    }
}
