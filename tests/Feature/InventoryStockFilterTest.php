<?php

namespace Tests\Feature;

use App\Models\{Branch, Category, Inventory, Product, Tax, User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class InventoryStockFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_filters_match_displayed_status_for_zero_and_positive_minimums(): void
    {
        Gate::define('manage_inventory', fn ($user) => true);
        $branch = Branch::create(['name' => 'Main', 'phone' => '000', 'address' => 'Test', 'status' => 'Active']);
        $this->actingAs(User::factory()->create(['branch_id' => $branch->id]));
        $category = Category::create(['name' => 'Medicine']);
        $tax = Tax::create(['name' => 'Tax Free', 'rate' => 0]);
        $expected = ['In Stock' => [], 'Low Stock' => [], 'Out of Stock' => []];

        foreach ([[0, null], [0, 0], [0, -1], [0, 1], [10, null], [10, 0], [10, -1], [10, 9], [10, 10], [10, 11]] as $index => [$minimum, $quantity]) {
            $product = Product::create([
                'name' => 'Medicine '.$index,
                'category_id' => $category->id,
                'tax_id' => $tax->id,
                'min_stock_level' => $minimum,
                'tax_method' => 'Exclusive',
                'status' => 'Active',
            ]);
            if ($quantity !== null) {
                Inventory::create(['branch_id' => $branch->id, 'product_id' => $product->id, 'quantity' => $quantity]);
            }
            $status = ($quantity ?? 0) <= 0 ? 'Out of Stock' : ($quantity < $minimum ? 'Low Stock' : 'In Stock');
            $expected[$status][] = $product->id;
        }

        // Stock at another branch must not make an empty selected branch appear in stock.
        $otherBranch = Branch::create(['name' => 'Other', 'phone' => '000', 'address' => 'Test', 'status' => 'Active']);
        $emptyProductId = $expected['Out of Stock'][0];
        Inventory::create(['branch_id' => $otherBranch->id, 'product_id' => $emptyProductId, 'quantity' => 5]);

        foreach ([$branch->id, null] as $branchId) {
            $branchExpected = $expected;
            if ($branchId === null) {
                $branchExpected['Out of Stock'] = array_values(array_diff($branchExpected['Out of Stock'], [$emptyProductId]));
                $branchExpected['In Stock'][] = $emptyProductId;
            }

            foreach ($branchExpected as $status => $ids) {
                $response = $this->get(route('inventory.index', array_filter([
                    'stock_status' => $status,
                    'branch_id' => $branchId,
                ])), ['X-SPA' => 'true'])->assertOk()
                    ->assertJsonPath('props.inventory.total', count($ids));

                $rows = $response->json('props.inventory.data');
                $this->assertEqualsCanonicalizing($ids, array_column($rows, 'id'));
                foreach ($rows as $row) {
                    $this->assertSame($status, $row['stock_status']);
                }
            }
        }
    }
}
