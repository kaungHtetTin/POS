<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run()
    {
        $units = [
            ['name' => 'Tablet', 'short_name' => 'Tab'],
            ['name' => 'Capsule', 'short_name' => 'Cap'],
            ['name' => 'Milliliter', 'short_name' => 'ml'],
            ['name' => 'Gram', 'short_name' => 'g'],
            ['name' => 'Ampoule', 'short_name' => 'Amp'],
            ['name' => 'Vial', 'short_name' => 'Vial'],
            ['name' => 'Sachet', 'short_name' => 'Sach'],
            ['name' => 'Strip', 'short_name' => 'Strip'],
            ['name' => 'Card', 'short_name' => 'Card'],
            ['name' => 'Bottle', 'short_name' => 'Btl'],
            ['name' => 'Tube', 'short_name' => 'Tube'],
            ['name' => 'Pack', 'short_name' => 'Pack'],
            ['name' => 'Box', 'short_name' => 'Box'],
            ['name' => 'Carton', 'short_name' => 'Ctn'],
            ['name' => 'Case', 'short_name' => 'Case'],
        ];

        foreach ($units as $unit) {
            Unit::updateOrCreate(
                ['short_name' => $unit['short_name']],
                $unit
            );
        }
    }
}
