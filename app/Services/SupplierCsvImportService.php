<?php

namespace App\Services;

use App\Models\Supplier;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SupplierCsvImportService
{
    public const HEADERS = ['name', 'phone', 'email', 'address', 'payment_terms'];

    public function import(UploadedFile $file): array
    {
        [$rows, $skipped] = CatalogCsv::read($file, self::HEADERS, 'file', 10000);

        return DB::transaction(function () use ($rows, $skipped) {
            $errors = [];
            $suppliers = [];
            $seen = ['phone' => [], 'email' => []];
            foreach ($rows as $row) {
                $line = $row['_line'];
                unset($row['_line']);
                $row = array_map(fn ($value) => $value === '' ? null : $value, $row);
                $validator = Validator::make($row, [
                    'name' => 'required|string|max:255',
                    'phone' => 'nullable|string|max:20|unique:suppliers,phone',
                    'email' => 'nullable|email|max:255|unique:suppliers,email',
                    'address' => 'nullable|string|max:500',
                    'payment_terms' => 'nullable|string|max:500',
                ]);
                foreach ($validator->errors()->all() as $error) {
                    $errors[] = "Row {$line}: {$error}";
                }
                foreach (['phone', 'email'] as $field) {
                    if ($row[$field] === null) continue;
                    $key = CatalogCsv::key($row[$field]);
                    if (isset($seen[$field][$key])) {
                        $errors[] = "Row {$line}: {$field} duplicates row {$seen[$field][$key]}.";
                    } else {
                        $seen[$field][$key] = $line;
                    }
                }
                $suppliers[] = $row;
            }
            CatalogCsv::fail('file', $errors);

            foreach ($suppliers as $supplier) {
                Supplier::create($supplier);
            }

            return ['suppliers' => count($suppliers), 'skipped_rows' => $skipped];
        });
    }
}
