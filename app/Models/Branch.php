<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Traits\HasUuid;

class Branch extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'name',
        'phone',
        'address',
        'email',
        'status',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
