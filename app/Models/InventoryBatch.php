<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class InventoryBatch extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'branch_id',
        'product_id',
        'batch_number',
        'expiry_date',
        'quantity',
        'purchase_price',
        'selling_price',
        'is_synced',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'quantity' => 'integer',
        'purchase_price' => 'decimal:6',
        'selling_price' => 'decimal:2',
        'is_synced' => 'boolean',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
