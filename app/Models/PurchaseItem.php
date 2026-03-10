<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class PurchaseItem extends Model
{
    use HasFactory, HasUuid;

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    protected $fillable = [
        'purchase_id',
        'product_id',
        'unit_id',
        'batch_number',
        'expiry_date',
        'quantity',
        'base_quantity',
        'unit_price',
        'total_price',
        'created_at',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'quantity' => 'integer',
        'base_quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }
}
