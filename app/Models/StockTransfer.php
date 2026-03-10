<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasUuid;

class StockTransfer extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'from_branch_id',
        'to_branch_id',
        'transfer_date',
        'status',
        'reference_number',
        'notes',
    ];

    protected $casts = [
        'transfer_date' => 'date',
    ];

    public function fromBranch()
    {
        return $this->belongsTo(Branch::class, 'from_branch_id');
    }

    public function toBranch()
    {
        return $this->belongsTo(Branch::class, 'to_branch_id');
    }

    public function items()
    {
        return $this->hasMany(StockTransferItem::class, 'transfer_id');
    }
}
