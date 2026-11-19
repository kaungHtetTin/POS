<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $guarded = [];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected $casts = [
        'quantity' => 'integer',
        'balance_before' => 'integer',
        'balance_after' => 'integer',
        'created_at' => 'datetime',
    ];

    public const TYPES = [
        'Opening balance', 'Purchase', 'Purchase reversal', 'Sale', 'Sale void',
        'Transfer out', 'Transfer in', 'Adjustment', 'Customer return', 'Supplier return',
    ];
}
