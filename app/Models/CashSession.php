<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashSession extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'branch_id',
        'user_id',
        'closed_by_user_id',
        'opening_amount',
        'cash_received_total',
        'change_given_total',
        'net_cash_sales',
        'expected_amount',
        'closing_counted_amount',
        'difference',
        'notes',
        'opened_at',
        'closed_at',
        'status',
    ];

    protected $casts = [
        'opening_amount' => 'decimal:2',
        'cash_received_total' => 'decimal:2',
        'change_given_total' => 'decimal:2',
        'net_cash_sales' => 'decimal:2',
        'expected_amount' => 'decimal:2',
        'closing_counted_amount' => 'decimal:2',
        'difference' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function closedByUser()
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }
}
