<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tax;

class TaxSeeder extends Seeder
{
    public function run()
    {
        // Create a system-level "Tax Free" record (0% tax)
        Tax::firstOrCreate(
            ['name' => 'Tax Free'],
            [
                'rate' => 0,
                'status' => true,
                'is_default' => true,
            ]
        );
    }
}