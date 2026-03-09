<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class Tax extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'name',
        'rate',
        'status',
    ];

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
