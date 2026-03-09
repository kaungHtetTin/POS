<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class Unit extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'name',
        'short_name',
    ];

    public function product_units()
    {
        return $this->hasMany(ProductUnit::class);
    }
}
