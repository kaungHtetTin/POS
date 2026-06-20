<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class Purchase extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'supplier_id',
        'branch_id',
        'invoice_number',
        'purchase_date',
        'total_amount',
        'paid_amount',
        'due_amount',
        'payment_status',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'due_amount' => 'decimal:2',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function payments()
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
