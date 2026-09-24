<?php

namespace App\Services;

use App\Models\Unit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CatalogCsv
{
    public static function read(UploadedFile $file, array $headers, string $field, int $limit): array
    {
        [$header, $rows, $skipped] = self::readRows($file, $field, $limit);

        if (count($header) !== count($headers) || array_diff($headers, $header)) {
            self::fail($field, ['Use all columns from the downloaded template, with no extra or duplicate columns. Save as CSV UTF-8.']);
        }

        return [$rows, $skipped];
    }

    /** Read a structurally valid CSV while leaving schema selection to the caller. */
    public static function readRows(UploadedFile $file, string $field, int $limit): array
    {
        $handle = fopen($file->getRealPath(), 'rb');
        if ($handle === false) self::fail($field, ['The CSV file could not be read.']);

        try {
            // Consume the UTF-8 BOM before CSV parsing. If it remains in front of a
            // quoted first heading, fgetcsv treats the quote as literal text.
            $prefix = fread($handle, 3);
            if ($prefix !== "\xEF\xBB\xBF") rewind($handle);
            $header = fgetcsv($handle, 0, ',', '"', '');
            if ($header === false) self::fail($field, ['The CSV file is empty.']);
            $header = array_map(fn ($value) => self::key((string) $value), $header);
            if (count($header) !== count(array_unique($header))) {
                self::fail($field, ['CSV column names must not be duplicated.']);
            }

            $rows = [];
            $errors = [];
            $line = 1;
            $count = 0;
            $skipped = 0;
            while (($values = fgetcsv($handle, 0, ',', '"', '')) !== false) {
                $line++;
                if (!array_filter($values, fn ($value) => trim((string) $value) !== '')) {
                    $skipped++;
                    continue;
                }
                if (++$count > $limit) self::fail($field, ["CSV files may contain at most {$limit} data rows."]);
                if (count($values) !== count($header)) {
                    $errors[] = "Row {$line}: expected ".count($header).' columns.';
                    continue;
                }
                $values = array_map(function ($value) {
                    $value = (string) $value;
                    // Reverse the spreadsheet escaping used by our exports.
                    if (preg_match('/^\x27[\x27=+\-@\t\r]/u', $value)) $value = substr($value, 1);
                    return trim($value);
                }, $values);
                if (array_filter($values, fn ($value) => !mb_check_encoding($value, 'UTF-8'))) {
                    $errors[] = "Row {$line}: save the file as CSV UTF-8.";
                    continue;
                }
                $rows[] = array_combine($header, $values) + ['_line' => $line];
            }
            if (!$rows && !$errors) $errors[] = 'The CSV file has no data rows.';
            self::fail($field, $errors);
            return [$header, $rows, $skipped];
        } finally {
            fclose($handle);
        }
    }

    public static function fail(string $field, array $errors): void
    {
        if ($errors) {
            $message = 'Import failed. No changes were saved.';
            if (count($errors) > 100) $message .= ' Showing the first 100 errors.';
            throw ValidationException::withMessages([$field => $message."\n".implode("\n", array_slice($errors, 0, 100))]);
        }
    }

    public static function key(string $value): string
    {
        return Str::lower(trim($value));
    }

    public static function safe(?string $value): string
    {
        $value ??= '';
        return preg_match('/^[\x27=+\-@\t\r]/u', $value) ? "'".$value : $value;
    }

    public static function boolean(string $value): ?bool
    {
        return match (self::key($value)) {
            'yes', 'true', '1' => true,
            'no', 'false', '0' => false,
            default => null,
        };
    }

    public static function moneyRules(): array
    {
        return ['required', 'regex:/^\d{1,13}(\.\d{1,2})?$/'];
    }

    /** Match both identifiers, because units are shared across the whole catalog. */
    public static function resolveUnit(Collection $units, string $name, string $shortName, bool $create, string $field): Unit
    {
        $matches = $units->filter(fn ($unit) => self::key($unit->name) === self::key($name)
            && self::key($unit->short_name ?? '') === self::key($shortName));
        if ($matches->count() === 1) return $matches->first();
        if ($matches->count() > 1) self::fail($field, ["Unit '{$name}' / '{$shortName}' is duplicated in the unit catalog."]);
        if (!$create) self::fail($field, ["Unit '{$name}' / '{$shortName}' does not exist. Enable automatic unit creation for this import."]);
        $unit = Unit::create(['name' => $name, 'short_name' => $shortName]);
        $units->push($unit);
        return $unit;
    }
}
