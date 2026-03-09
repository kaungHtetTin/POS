<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Tax;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'category_id' => Category::factory(),
            'tax_id' => Tax::factory(),
            'name' => $this->faker->words(3, true),
            'generic_name' => $this->faker->words(2, true),
            'brand_name' => $this->faker->company(),
            'manufacturer' => $this->faker->company(),
            'strength' => $this->faker->randomElement(['500mg', '250mg', '100ml', '50ml', '10mg']),
            'barcode' => $this->faker->unique()->ean13(),
            'description' => $this->faker->paragraph(),
            'min_stock_level' => $this->faker->numberBetween(5, 50),
            'tax_method' => $this->faker->randomElement(['Exclusive', 'Inclusive']),
            'status' => 'Active',
        ];
    }
}
