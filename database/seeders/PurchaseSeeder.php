<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PurchaseSeeder extends Seeder
{
    public function run()
    {
        $suppliers = Supplier::all();
        $products = Product::with('product_units')->has('product_units')->get();
        $branches = Branch::all();

        if ($suppliers->isEmpty() || $products->isEmpty() || $branches->isEmpty()) {
            return;
        }

        foreach ($branches as $branch) {
            // Create 3-5 purchases per branch
            $purchaseCount = random_int(3, 5);

            for ($i = 0; $i < $purchaseCount; $i++) {
                $supplier = $suppliers->random();
                $purchaseDate = now()->subDays(random_int(1, 30));
                
                DB::transaction(function () use ($branch, $supplier, $products, $purchaseDate, $i) {
                    $purchase = Purchase::create([
                        'supplier_id' => $supplier->id,
                        'branch_id' => $branch->id,
                        'invoice_number' => 'INV-' . strtoupper(bin2hex(random_bytes(4))),
                        'purchase_date' => $purchaseDate,
                        'payment_status' => collect(['Paid', 'Partial', 'Due'])->random(),
                        'total_amount' => 0, // Will update after items
                        'paid_amount' => 0,
                        'due_amount' => 0,
                    ]);

                    $itemCount = random_int(2, 5);
                    $totalAmount = 0;

                    for ($j = 0; $j < $itemCount; $j++) {
                        $product = $products->random();
                        $productUnit = $product->product_units->random();
                        $quantity = random_int(5, 20);
                        $unitPrice = (float) $productUnit->selling_price * 0.7; // Cost is 70% of selling price
                        $lineTotal = $quantity * $unitPrice;
                        
                        $conversionFactor = (int) $productUnit->conversion_factor;
                        $baseQuantity = $quantity * $conversionFactor;
                        
                        $expiryDate = now()->addMonths(random_int(12, 36))->format('Y-m-d');
                        $batchNumber = 'BCH-' . strtoupper(bin2hex(random_bytes(3)));

                        $purchase->items()->create([
                            'product_id' => $product->id,
                            'unit_id' => $productUnit->unit_id,
                            'batch_number' => $batchNumber,
                            'expiry_date' => $expiryDate,
                            'quantity' => $quantity,
                            'base_quantity' => $baseQuantity,
                            'unit_price' => $unitPrice,
                            'total_price' => $lineTotal,
                            'created_at' => $purchaseDate,
                        ]);

                        // Update Inventory
                        $inventory = Inventory::firstOrCreate(
                            ['branch_id' => $branch->id, 'product_id' => $product->id],
                            ['quantity' => 0]
                        );
                        $inventory->increment('quantity', $baseQuantity);

                        // Update Batch
                        InventoryBatch::create([
                            'branch_id' => $branch->id,
                            'product_id' => $product->id,
                            'batch_number' => $batchNumber,
                            'expiry_date' => $expiryDate,
                            'quantity' => $baseQuantity,
                            'purchase_price' => $unitPrice / $conversionFactor,
                            'selling_price' => (float) $productUnit->selling_price / $conversionFactor,
                        ]);

                        $totalAmount += $lineTotal;
                    }

                    $paidAmount = 0;
                    if ($purchase->payment_status === 'Paid') {
                        $paidAmount = $totalAmount;
                    } elseif ($purchase->payment_status === 'Partial') {
                        $paidAmount = $totalAmount * 0.5;
                    }

                    $dueAmount = $totalAmount - $paidAmount;

                    $purchase->update([
                        'total_amount' => $totalAmount,
                        'paid_amount' => $paidAmount,
                        'due_amount' => $dueAmount,
                    ]);

                    // Update Supplier Balance
                    $supplier->increment('balance', $dueAmount);
                });
            }
        }
    }
}
