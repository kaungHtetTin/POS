<?php

namespace App\Services\Api;

use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PurchaseSyncService
{
    public function sync(array $payload, User $user): array
    {
        $clientReference = $this->clientReferenceFrom($payload);

        if (!$clientReference) {
            throw ValidationException::withMessages([
                'client_reference' => 'A client_reference, client_id, offline_id, or id is required for offline sync.',
            ]);
        }

        $existing = Purchase::where('client_reference', $clientReference)->first();
        if ($existing) {
            return [
                'client_reference' => $clientReference,
                'created' => false,
                'model' => $this->loadPurchase($existing),
            ];
        }

        $payload['client_reference'] = $clientReference;
        $validated = Validator::make($payload, [
            'client_reference' => 'required|string|max:255|unique:purchases,client_reference',
            'supplier_id' => 'required|exists:suppliers,id',
            'branch_id' => 'required|exists:branches,id',
            'invoice_number' => 'required|string|max:255|unique:purchases,invoice_number',
            'purchase_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:purchase_date',
            'payment_status' => 'required|in:Paid,Partial,Due',
            'paid_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.unit_id' => 'required|exists:units,id',
            'items.*.batch_number' => 'nullable|string|max:255',
            'items.*.expiry_date' => 'required|date|after:today',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.foc_quantity' => 'nullable|integer|min:0',
            'items.*.unit_price' => 'required|numeric|min:0.01',
            'items.*.selling_price' => 'required|numeric|min:0.01',
            'items.*.wholesale_price' => 'nullable|numeric|min:0.01',
        ])->validate();

        if (!$this->userCanAccessBranch($user, $validated['branch_id'])) {
            throw ValidationException::withMessages([
                'branch_id' => 'You do not have access to this branch.',
            ]);
        }

        $purchase = DB::transaction(function () use ($validated, $user, $clientReference) {
            $items = collect($validated['items']);
            $productUnitRows = DB::table('product_units')
                ->select('product_id', 'unit_id', 'conversion_factor')
                ->whereIn('product_id', $items->pluck('product_id')->unique()->values())
                ->whereIn('unit_id', $items->pluck('unit_id')->unique()->values())
                ->get();

            $preparedItems = $items->map(function ($item) use ($productUnitRows) {
                $productUnit = $productUnitRows->first(function ($row) use ($item) {
                    return $row->product_id === $item['product_id'] && $row->unit_id === $item['unit_id'];
                });

                if (!$productUnit || (int) $productUnit->conversion_factor < 1) {
                    throw ValidationException::withMessages([
                        'items' => 'Selected unit does not belong to the selected product.',
                    ]);
                }

                $conversionFactor = (int) $productUnit->conversion_factor;
                $paidQuantity = (int) $item['quantity'];
                $focQuantity = (int) ($item['foc_quantity'] ?? 0);
                $receivedQuantity = $paidQuantity + $focQuantity;
                $baseQuantity = $receivedQuantity * $conversionFactor;
                $lineTotal = $paidQuantity * (float) $item['unit_price'];

                return array_merge($item, [
                    'batch_number' => trim((string) ($item['batch_number'] ?? '')) ?: 'BATCH-' . now()->format('YmdHis'),
                    'foc_quantity' => $focQuantity,
                    'base_quantity' => $baseQuantity,
                    'foc_base_quantity' => $focQuantity * $conversionFactor,
                    'base_unit_price' => $baseQuantity > 0 ? $lineTotal / $baseQuantity : 0,
                    'base_selling_price' => (float) $item['selling_price'] / $conversionFactor,
                    'wholesale_price' => (float) ($item['wholesale_price'] ?? $item['selling_price']),
                    'line_total' => $lineTotal,
                ]);
            });

            $totalAmount = (float) $preparedItems->sum('line_total');
            $paidAmount = (float) ($validated['paid_amount'] ?? 0);

            if ($validated['payment_status'] === 'Paid') {
                $paidAmount = $totalAmount;
            }

            if ($validated['payment_status'] === 'Due') {
                $paidAmount = 0;
            }

            if ($paidAmount > $totalAmount) {
                throw ValidationException::withMessages([
                    'paid_amount' => 'Paid amount cannot exceed total purchase amount.',
                ]);
            }

            $dueAmount = $totalAmount - $paidAmount;
            $dueDate = Carbon::parse($validated['due_date'] ?? $validated['purchase_date'])
                ->addDays(empty($validated['due_date']) ? 7 : 0)
                ->toDateString();
            $supplier = Supplier::whereKey($validated['supplier_id'])->lockForUpdate()->firstOrFail();
            $projectedBalance = (float) $supplier->balance + $dueAmount;

            if ($projectedBalance > (float) $supplier->credit_limit) {
                throw ValidationException::withMessages([
                    'supplier_id' => 'Credit limit exceeded for selected supplier.',
                ]);
            }

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'branch_id' => $validated['branch_id'],
                'user_id' => $user->id,
                'invoice_number' => $validated['invoice_number'],
                'client_reference' => $clientReference,
                'purchase_date' => $validated['purchase_date'],
                'due_date' => $dueDate,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'payment_status' => $validated['payment_status'],
                'notes' => $validated['notes'] ?? null,
                'is_synced' => true,
                'synced_at' => now(),
            ]);

            foreach ($preparedItems as $item) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'unit_id' => $item['unit_id'],
                    'batch_number' => $item['batch_number'],
                    'expiry_date' => $item['expiry_date'],
                    'quantity' => $item['quantity'],
                    'foc_quantity' => $item['foc_quantity'],
                    'base_quantity' => $item['base_quantity'],
                    'foc_base_quantity' => $item['foc_base_quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['line_total'],
                    'created_at' => now(),
                ]);

                InventoryBatch::create([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $item['product_id'],
                    'batch_number' => $item['batch_number'],
                    'expiry_date' => $item['expiry_date'],
                    'quantity' => $item['base_quantity'],
                    'purchase_price' => $item['base_unit_price'],
                    'selling_price' => $item['base_selling_price'],
                    'is_synced' => true,
                ]);

                $inventory = Inventory::firstOrNew([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $item['product_id'],
                ]);
                $inventory->quantity = ($inventory->quantity ?? 0) + $item['base_quantity'];
                $inventory->save();

                DB::table('product_units')
                    ->where('product_id', $item['product_id'])
                    ->where('unit_id', $item['unit_id'])
                    ->update([
                        'selling_price' => $item['selling_price'],
                        'wholesale_price' => $item['wholesale_price'],
                    ]);
            }

            $supplier->update([
                'balance' => $projectedBalance,
            ]);

            return $purchase;
        });

        return [
            'client_reference' => $clientReference,
            'created' => true,
            'model' => $this->loadPurchase($purchase),
        ];
    }

    public function clientReferenceFrom(array $payload): ?string
    {
        $value = $payload['client_reference']
            ?? $payload['client_id']
            ?? $payload['offline_id']
            ?? $payload['id']
            ?? null;

        $value = is_string($value) ? trim($value) : $value;

        return $value ? (string) $value : null;
    }

    private function userCanAccessBranch(User $user, string $branchId): bool
    {
        return $user->canAccessBranch($branchId)
            || $user->hasRole('Root')
            || $user->hasRole('Owner')
            || $user->hasPermission('manage_branches')
            || $user->hasPermission('manage_inventory');
    }

    private function loadPurchase(Purchase $purchase): Purchase
    {
        return $purchase->load([
            'supplier:id,name',
            'branch:id,name',
            'items.product:id,name',
            'items.unit:id,name,short_name',
        ]);
    }
}
