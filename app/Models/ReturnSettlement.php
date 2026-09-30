<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class ReturnSettlement extends Model
{
    use HasUuid;

    protected $fillable = [
        'return_id', 'user_id', 'cash_session_id', 'amount', 'payment_method',
        'reference_number', 'notes', 'settled_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'settled_at' => 'datetime',
    ];

    public function returnEntry()
    {
        return $this->belongsTo(ReturnEntry::class, 'return_id');
    }
}
