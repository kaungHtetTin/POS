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

    public function scopeWithCreditSummary($query)
    {
        return $query->withAggregate(['sales as current_balance' => fn ($sales) => $sales->outstanding()],
            'COALESCE(SUM(grand_total - COALESCE(amount_received, 0)), 0)')
            ->withCasts(['current_balance' => 'float'])
            ->withExists(['sales as has_overdue' => fn ($sales) => $sales->outstanding()->whereDate('due_date', '<', today())]);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }
}
