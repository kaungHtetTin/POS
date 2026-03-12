<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class Setting extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = ['key', 'value'];

    public $timestamps = true;

    const UPDATED_AT = 'updated_at';
    const CREATED_AT = 'created_at';

    /**
     * Get a setting value by key, with optional default.
     */
    public static function get(string $key, $default = null): ?string
    {
        $row = static::where('key', $key)->first();

        return $row !== null ? $row->value : ($default !== null ? (string) $default : null);
    }

    /**
     * Set a setting value by key (creates or updates).
     */
    public static function set(string $key, string $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }

    /**
     * Get a branch-scoped setting key.
     */
    public static function branchKey(string $branchId, string $suffix): string
    {
        return "branch.{$branchId}.{$suffix}";
    }
}
