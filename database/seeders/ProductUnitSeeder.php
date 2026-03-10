<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class ProductUnitSeeder extends Seeder
{
    public function run()
    {
        $unitMap = Unit::whereIn('name', [
            'Tablet',
            'Card',
            'Box',
            'Milliliter',
            'Bottle',
            'Case',
            'Gram',
            'Pack',
            'Carton',
        ])->get()->keyBy('name');

        $tabletSet = collect([
            ['name' => 'Tablet', 'conversion_factor' => 1, 'selling_multiplier' => 1, 'is_base_unit' => true],
            ['name' => 'Card', 'conversion_factor' => 10, 'selling_multiplier' => 10, 'is_base_unit' => false],
            ['name' => 'Box', 'conversion_factor' => 100, 'selling_multiplier' => 100, 'is_base_unit' => false],
        ]);

        $liquidSet = collect([
            ['name' => 'Milliliter', 'conversion_factor' => 1, 'selling_multiplier' => 1, 'is_base_unit' => true],
            ['name' => 'Bottle', 'conversion_factor' => 100, 'selling_multiplier' => 100, 'is_base_unit' => false],
            ['name' => 'Case', 'conversion_factor' => 1000, 'selling_multiplier' => 1000, 'is_base_unit' => false],
        ]);

        $powderSet = collect([
            ['name' => 'Gram', 'conversion_factor' => 1, 'selling_multiplier' => 1, 'is_base_unit' => true],
            ['name' => 'Pack', 'conversion_factor' => 100, 'selling_multiplier' => 100, 'is_base_unit' => false],
            ['name' => 'Carton', 'conversion_factor' => 1000, 'selling_multiplier' => 1000, 'is_base_unit' => false],
        ]);

        Product::query()->chunkById(100, function ($products) use ($unitMap, $tabletSet, $liquidSet, $powderSet) {
            foreach ($products as $product) {
                $basePrice = max(0.01, (float) fake()->randomFloat(2, 0.1, 5));
                $strength = strtolower((string) $product->strength);

                if (str_contains($strength, 'ml')) {
                    $selectedSet = $liquidSet;
                } elseif (str_contains($strength, 'g')) {
                    $selectedSet = $powderSet;
                } else {
                    $selectedSet = $tabletSet;
                }

                $resolvedUnits = $selectedSet->filter(function ($unitDef) use ($unitMap) {
                    return isset($unitMap[$unitDef['name']]);
                });

                if ($resolvedUnits->isEmpty()) {
                    continue;
                }

                $product->product_units()->delete();

                foreach ($resolvedUnits as $unitDef) {
                    $product->product_units()->create([
                        'unit_id' => $unitMap[$unitDef['name']]->id,
                        'conversion_factor' => $unitDef['conversion_factor'],
                        'selling_price' => $basePrice * $unitDef['selling_multiplier'],
                        'is_base_unit' => $unitDef['is_base_unit'],
                    ]);
                }
            }
        });
    }
}
