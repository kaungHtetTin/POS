<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Branch::firstOrCreate(
            ['name' => 'Main Branch'],
            [
                'phone' => '1234567890',
                'address' => '123 Pharmacy St, Medical City',
                'status' => 'Active',
            ]
        );
    }
}
