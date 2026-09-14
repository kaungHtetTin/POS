<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingRule extends Model
{
    protected $primaryKey = 'code';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['pricing_mode', 'markup_percent', 'rounding', 'minimum_profit', 'version'];
    protected $casts = ['markup_percent' => 'decimal:4', 'minimum_profit' => 'decimal:2', 'rounding' => 'integer', 'version' => 'integer'];
}
