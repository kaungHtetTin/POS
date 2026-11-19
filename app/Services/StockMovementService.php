<?php

namespace App\Services;

use App\Models\{Branch, Inventory, Product, StockMovement, User};
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class StockMovementService
{
    /** Update the branch balance and its audit record in the same transaction. */
    public function change(Inventory $inventory, int $quantity, string $type, Model $source, ?string $batchNumber = null, ?string $notes = null, bool $clampToZero = false): void
    {
        DB::transaction(function () use ($inventory, $quantity, $type, $source, $batchNumber, $notes, $clampToZero) {
            $locked = Inventory::where('branch_id', $inventory->branch_id)
                ->where('product_id', $inventory->product_id)->lockForUpdate()->first();
            if (!$locked) {
                $locked = Inventory::create(['branch_id' => $inventory->branch_id, 'product_id' => $inventory->product_id, 'quantity' => 0]);
            }
            $before = (int) $locked->quantity;
            $after = $clampToZero ? max(0, $before + $quantity) : $before + $quantity;
            $locked->update(['quantity' => $after]);
            $inventory->setRawAttributes($locked->getAttributes(), true);
            if ($after === $before) {
                return;
            }

            $user = auth()->user() ?? ($source->user_id ? User::find($source->user_id) : null);
            StockMovement::create([
                'product_id' => $locked->product_id,
                'branch_id' => $locked->branch_id,
                'user_id' => $user?->id,
                'product_name' => Product::withTrashed()->whereKey($locked->product_id)->value('name') ?? 'Deleted product',
                'branch_name' => Branch::whereKey($locked->branch_id)->value('name') ?? 'Deleted branch',
                'user_name' => $user?->name,
                'type' => $type,
                'quantity' => $after - $before,
                'balance_before' => $before,
                'balance_after' => $after,
                'source_type' => $source->getMorphClass(),
                'source_id' => $source->getKey(),
                'reference' => $source->invoice_number ?? $source->reference_number ?? $source->getKey(),
                'batch_number' => $batchNumber,
                'notes' => $notes,
                'created_at' => now(),
            ]);
        });
    }
}
