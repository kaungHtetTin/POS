<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class Supplier extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'payment_terms',
        'credit_limit',
        'balance',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:2',
        'balance' => 'decimal:2',
    ];

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }
}
