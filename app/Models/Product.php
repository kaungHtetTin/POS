<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasUuid, SoftDeletes;

    protected $fillable = [
        'category_id',
        'tax_id',
        'name',
        'generic_name',
        'brand_name',
        'manufacturer',
        'strength',
        'barcode',
        'image_path',
        'description',
        'min_stock_level',
        'expiry_alert_days',
        'tax_method',
        'status',
    ];

    protected $casts = [
        'min_stock_level' => 'integer',
        'expiry_alert_days' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function tax()
    {
        return $this->belongsTo(Tax::class);
    }

    public function units()
    {
        return $this->belongsToMany(Unit::class, 'product_units')
                    ->withPivot(['id', 'conversion_factor', 'selling_price', 'is_base_unit'])
                    ->withTimestamps();
    }

    public function product_units()
    {
        return $this->hasMany(ProductUnit::class);
    }

    public function batches()
    {
        return $this->hasMany(InventoryBatch::class);
    }

    public function inventories()
    {
        return $this->hasMany(Inventory::class);
    }
}
