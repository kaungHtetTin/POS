<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class Customer extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
    ];

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }
}
