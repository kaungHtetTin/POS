<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class SaleItem extends Model
{
    use HasFactory, HasUuid;

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    protected $fillable = [
        'sale_id',
        'product_id',
        'batch_id',
        'unit_id',
        'quantity',
        'foc_quantity',
        'foc_unit_id',
        'base_quantity',
        'foc_base_quantity',
        'base_unit_cost',
        'cost_total',
        'cost_backfilled',
        'unit_price',
        'price_type',
        'original_unit_price',
        'discount_percentage',
        'discount_amount',
        'total_price',
        'created_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'foc_quantity' => 'decimal:2',
        'base_quantity' => 'integer',
        'foc_base_quantity' => 'integer',
        'base_unit_cost' => 'decimal:6',
        'cost_total' => 'decimal:2',
        'cost_backfilled' => 'boolean',
        'unit_price' => 'decimal:2',
        'original_unit_price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function focUnit()
    {
        return $this->belongsTo(Unit::class, 'foc_unit_id');
    }

    public function batch()
    {
        return $this->belongsTo(InventoryBatch::class, 'batch_id');
    }
}
