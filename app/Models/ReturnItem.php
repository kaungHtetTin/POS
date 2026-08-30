<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class ReturnItem extends Model
{
    use HasFactory, HasUuid;

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    protected $fillable = [
        'return_id',
        'source_sale_item_id',
        'product_id',
        'batch_id',
        'unit_id',
        'quantity',
        'base_quantity',
        'base_unit_cost',
        'cost_total',
        'refund_price',
        'created_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'base_quantity' => 'integer',
        'base_unit_cost' => 'decimal:6',
        'cost_total' => 'decimal:2',
        'refund_price' => 'decimal:2',
    ];

    public function returnEntry()
    {
        return $this->belongsTo(ReturnEntry::class, 'return_id');
    }

    public function sourceSaleItem()
    {
        return $this->belongsTo(SaleItem::class, 'source_sale_item_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function batch()
    {
        return $this->belongsTo(InventoryBatch::class, 'batch_id');
    }
}
