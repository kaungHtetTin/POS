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
        'is_base_unit',
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
