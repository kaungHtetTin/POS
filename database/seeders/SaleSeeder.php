<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SaleSeeder extends Seeder
{
    public function run()
    {
        $branches = Branch::all();
        $products = Product::with(['product_units', 'taxes'])->has('product_units')->get();
        $customers = Customer::all();

        if ($branches->isEmpty() || $products->isEmpty()) {
            return;
        }

        // Ensure we have at least one customer
        if ($customers->isEmpty()) {
            $customers = collect([
                Customer::create([
                    'name' => 'Walk-in Customer',
                    'phone' => '0000000000',
                ])
            ]);
        }

        foreach ($branches as $branch) {
            // Get users for this branch
            $users = User::where('branch_id', $branch->id)
                ->orWhereHas('branches', function($q) use ($branch) {
                    $q->where('branches.id', $branch->id);
                })->get();

            if ($users->isEmpty()) {
                $users = User::all();
            }

            // Create 10-20 sales per branch
            $saleCount = random_int(10, 20);

            for ($i = 0; $i < $saleCount; $i++) {
                $user = $users->random();
                $customer = random_int(0, 10) > 2 ? $customers->random() : null; // 70% chance of having a customer
                $saleDate = now()->subDays(random_int(0, 30))->subHours(random_int(0, 23));
                
                DB::transaction(function () use ($branch, $user, $customer, $products, $saleDate) {
                    $sale = Sale::create([
                        'branch_id' => $branch->id,
                        'user_id' => $user->id,
                        'customer_id' => $customer?->id,
                        'invoice_number' => 'SAL-' . strtoupper(bin2hex(random_bytes(4))),
                        'total_amount' => 0, // Will update
                        'discount' => 0,
                        'tax' => 0,
                        'grand_total' => 0,
                        'payment_method' => collect(['Cash', 'Card', 'Mobile', 'Wallet'])->random(),
                        'payment_status' => 'Paid',
                        'sale_date' => $saleDate,
                    ]);

                    $itemCount = random_int(1, 4);
                    $subtotal = 0;
                    $totalTax = 0;

                    for ($j = 0; $j < $itemCount; $j++) {
                        $product = $products->random();
                        
                        // Find a batch with stock in this branch
                        $batch = InventoryBatch::where('branch_id', $branch->id)
                            ->where('product_id', $product->id)
                            ->where('quantity', '>', 0)
                            ->orderBy('expiry_date', 'asc')
                            ->first();

                        if (!$batch) {
                            // If no stock, skip this item for seeding
                            continue;
                        }

                        $productUnit = $product->product_units->random();
                        $quantity = random_int(1, 3);
                        $conversionFactor = (int) $productUnit->conversion_factor;
                        $baseQuantityNeeded = $quantity * $conversionFactor;

                        // Ensure we don't sell more than available
                        if ($batch->quantity < $baseQuantityNeeded) {
                            $baseQuantityNeeded = (int) $batch->quantity;
                            $quantity = (float) $baseQuantityNeeded / $conversionFactor;
                            if ($quantity <= 0) continue;
                        }

                        $unitPrice = (float) $productUnit->selling_price;
                        $lineTotal = $quantity * $unitPrice;

                        // Calculate tax for this item if product has taxes
                        $itemTax = 0;
                        foreach ($product->taxes as $tax) {
                            $itemTax += $lineTotal * ($tax->rate / 100);
                        }

                        $sale->items()->create([
                            'product_id' => $product->id,
                            'batch_id' => $batch->id,
                            'unit_id' => $productUnit->unit_id,
                            'quantity' => $quantity,
                            'base_quantity' => $baseQuantityNeeded,
                            'unit_price' => $unitPrice,
                            'total_price' => $lineTotal,
                            'created_at' => $saleDate,
                        ]);

                        // Deduct from batch
                        $batch->decrement('quantity', $baseQuantityNeeded);

                        // Deduct from inventory
                        Inventory::where('branch_id', $branch->id)
                            ->where('product_id', $product->id)
                            ->decrement('quantity', $baseQuantityNeeded);

                        $subtotal += $lineTotal;
                        $totalTax += $itemTax;
                    }

                    if ($sale->items()->count() === 0) {
                        $sale->delete();
                        return;
                    }

                    $discount = random_int(0, 10) > 8 ? ($subtotal * 0.05) : 0; // 20% chance of 5% discount
                    $grandTotal = $subtotal + $totalTax - $discount;

                    $sale->update([
                        'total_amount' => $subtotal,
                        'discount' => $discount,
                        'tax' => $totalTax,
                        'grand_total' => $grandTotal,
                    ]);
                });
            }
        }
    }
}
