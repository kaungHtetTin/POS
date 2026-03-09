<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Tax;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Create 5 categories first if they don't exist
        if (Category::count() === 0) {
            Category::factory()->count(5)->create();
        }

        // Create 3 tax types if they don't exist
        if (Tax::count() === 0) {
            Tax::factory()->count(3)->create();
        }

        $categories = Category::all();
        $taxes = Tax::all();

        // Create 50 products
        Product::factory()->count(50)->create([
            'category_id' => fn() => $categories->random()->id,
            'tax_id' => fn() => $taxes->random()->id,
        ]);
    }
}
