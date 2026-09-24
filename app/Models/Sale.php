<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class Sale extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'branch_id',
        'user_id',
        'sale_staff_id',
        'customer_id',
        'cash_session_id',
        'invoice_number',
        'client_reference',
        'total_amount',
        'discount',
        'tax',
        'grand_total',
        'amount_received',
        'change_due',
        'payment_method',
        'payment_status',
        'status',
        'voided_by_user_id',
        'voided_at',
        'void_reason',
        'sale_date',
        'due_date',
        'is_synced',
        'synced_at',
    ];

    protected $casts = [
        'sale_date' => 'datetime',
        'due_date' => 'date',
        'total_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'amount_received' => 'decimal:2',
        'change_due' => 'decimal:2',
        'voided_at' => 'datetime',
        'is_synced' => 'boolean',
        'synced_at' => 'datetime',
    ];

    public function scopeOutstanding($query)
    {
        return $query->whereIn('payment_status', ['Partial', 'Due'])
            ->whereRaw('grand_total > COALESCE(amount_received, 0)')
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', '!=', 'Voided'));
    }

    public function getReceivableStatusAttribute(): string
    {
        if ($this->payment_status === 'Paid' || (float) $this->amount_received >= (float) $this->grand_total) {
            return 'Paid';
        }
        if ($this->due_date && $this->due_date->lt(today())) {
            return 'Overdue';
        }
        return (float) $this->amount_received > 0 ? 'Partial' : 'Credit';
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function saleStaff()
    {
        return $this->belongsTo(User::class, 'sale_staff_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function cashSession()
    {
        return $this->belongsTo(CashSession::class);
    }

    public function voidedByUser()
    {
        return $this->belongsTo(User::class, 'voided_by_user_id');
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }
}
