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
    ];

    protected $casts = [
        'refund_amount' => 'decimal:2',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function items()
    {
        return $this->hasMany(ReturnItem::class, 'return_id');
    }
}

