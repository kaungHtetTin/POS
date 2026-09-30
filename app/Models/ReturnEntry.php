<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class ReturnEntry extends Model
{
    use HasFactory, HasUuid;

    protected $table = 'returns';

    protected $fillable = [
        'type',
        'reference_id',
        'branch_id',
        'reason',
        'refund_amount',
        'status',
        'credit_applied',
        'settlement_due',
        'settlement_paid',
        'tax_amount',
        'approved_at',
    ];

    protected $casts = [
        'refund_amount' => 'decimal:2',
        'credit_applied' => 'decimal:2',
        'settlement_due' => 'decimal:2',
        'settlement_paid' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function items()
    {
        return $this->hasMany(ReturnItem::class, 'return_id');
    }

    public function settlements()
    {
        return $this->hasMany(ReturnSettlement::class, 'return_id');
    }
}
