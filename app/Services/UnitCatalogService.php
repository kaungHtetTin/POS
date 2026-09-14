<?php

namespace App\Services;

use App\Models\Unit;
use Illuminate\Validation\ValidationException;

class UnitCatalogService
{
    /** Resolve typed unit definitions to the existing unit_id format used by inventory and sales. */
    public function resolveRows(array $rows): array
    {
        $catalog = Unit::query()->get();
        $seenNames = [];
        $seenCodes = [];

        foreach ($rows as $index => &$row) {
            $unit = !empty($row['unit_id']) ? $catalog->firstWhere('id', $row['unit_id']) : null;
            $name = trim((string) ($row['unit_name'] ?? $unit?->name ?? ''));
            $code = trim((string) ($row['unit_short_name'] ?? $unit?->short_name ?? ''));

            if ($name === '' || $code === '') {
                throw ValidationException::withMessages([
                    "product_units.{$index}.unit_name" => 'Enter both a unit name and a short name.',
                ]);
            }

            $nameKey = CatalogCsv::key($name);
            $codeKey = CatalogCsv::key($code);
            if (isset($seenNames[$nameKey])) {
                throw ValidationException::withMessages([
                    "product_units.{$index}.unit_name" => 'Unit names must be unique within a medicine.',
                ]);
            }
            if (isset($seenCodes[$codeKey])) {
                throw ValidationException::withMessages([
                    "product_units.{$index}.unit_short_name" => 'Unit short names must be unique within a medicine.',
                ]);
            }
            $seenNames[$nameKey] = true;
            $seenCodes[$codeKey] = true;

            if (!$unit || CatalogCsv::key($unit->name) !== $nameKey || CatalogCsv::key((string) $unit->short_name) !== $codeKey) {
                $matches = $catalog->filter(fn ($candidate) => CatalogCsv::key($candidate->name) === $nameKey
                    && CatalogCsv::key((string) $candidate->short_name) === $codeKey);
                $unit = $matches->first();
                if (!$unit) {
                    $unit = Unit::create(['name' => $name, 'short_name' => $code]);
                    $catalog->push($unit);
                }
            }

            $row['unit_id'] = $unit->id;
            unset($row['unit_name'], $row['unit_short_name']);
        }
        unset($row);

        return $rows;
    }
}
