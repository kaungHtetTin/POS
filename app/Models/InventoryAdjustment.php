<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class InventoryAdjustment extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'branch_id',
        'product_id',
        'inventory_batch_id',
        'user_id',
        'adjustment_type',
        'quantity',
        'reason',
        'adjustment_date',
    ];

    protected $casts = [
        'adjustment_date' => 'date',
        'quantity' => 'integer',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function batch()
    {
        return $this->belongsTo(InventoryBatch::class, 'inventory_batch_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
