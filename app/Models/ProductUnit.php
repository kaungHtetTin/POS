<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class ProductUnit extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'product_id',
        'unit_id',
        'conversion_factor',
        'selling_price',
        'wholesale_price',
        'is_base_unit',
        'is_default_selling_unit',
    ];

    protected $casts = [
        'conversion_factor' => 'integer',
        'selling_price' => 'decimal:2',
        'wholesale_price' => 'decimal:2',
        'is_base_unit' => 'boolean',
        'is_default_selling_unit' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }
}
