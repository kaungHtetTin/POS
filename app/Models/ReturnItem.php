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
        'product_id',
        'batch_id',
        'unit_id',
        'quantity',
        'base_quantity',
        'refund_price',
        'created_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'base_quantity' => 'integer',
        'refund_price' => 'decimal:2',
    ];

    public function returnEntry()
    {
        return $this->belongsTo(ReturnEntry::class, 'return_id');
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
