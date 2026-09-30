<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Purchase;
use App\Models\ReturnEntry;
use App\Models\ReturnItem;
use App\Models\ReturnSettlement;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReturnService
{
    public function complete(array $data, $branchIds, User $user): ReturnEntry
    {
        return DB::transaction(function () use ($data, $branchIds, $user) {
            $entry = $this->create($data, $branchIds);
            $this->decide($entry, 'Approved');
            $entry->refresh();

            $settlementAmount = round(
                (float) $entry->settlement_due - (float) $entry->settlement_paid,
                2
            );

            if ($settlementAmount > 0) {
                $paymentMethod = $data['payment_method'] ?? null;
                $paymentReference = trim((string) ($data['payment_reference'] ?? ''));

                if (!$paymentMethod) {
                    throw ValidationException::withMessages([
                        'payment_method' => 'Select a refund payment method.',
                    ]);
                }

                if ($paymentMethod !== 'Cash' && $paymentReference === '') {
                    throw ValidationException::withMessages([
                        'payment_reference' => 'Enter the payment reference for a non-cash refund.',
                    ]);
                }

                $this->settle($entry, $user, [
                    'amount' => $settlementAmount,
                    'payment_method' => $paymentMethod,
                    'reference_number' => $paymentReference !== '' ? $paymentReference : null,
                    'notes' => 'Automatically settled when the return was submitted.',
                ]);
            }

            return $entry->fresh(['items', 'settlements']);
        });
    }

    public function create(array $data, $branchIds): ReturnEntry
    {
        return DB::transaction(function () use ($data, $branchIds) {
            $source = $data['type'] === 'Customer'
                ? Sale::whereKey($data['reference_id'])->whereIn('branch_id', $branchIds)->where('status', '!=', 'Voided')->lockForUpdate()->firstOrFail()
                : Purchase::whereKey($data['reference_id'])->whereIn('branch_id', $branchIds)->lockForUpdate()->firstOrFail();

            $source->load('items');
            $items = $source->items->keyBy('id');
            $submittedIds = collect($data['items'])->pluck('reference_item_id');
            if ($submittedIds->unique()->count() !== $submittedIds->count()) {
                throw ValidationException::withMessages(['items' => 'Select each invoice line only once.']);
            }

            $previous = ReturnItem::query()
                ->whereIn($data['type'] === 'Customer' ? 'source_sale_item_id' : 'source_purchase_item_id', $submittedIds)
                ->whereHas('returnEntry', fn ($query) => $query->where('status', '!=', 'Rejected'))
                ->get()
                ->groupBy($data['type'] === 'Customer' ? 'source_sale_item_id' : 'source_purchase_item_id');

            $lineAmounts = $data['type'] === 'Customer'
                ? app(ReturnPricing::class)->saleLineAmounts($source)
                : [];
            $lineTaxes = $data['type'] === 'Customer'
                ? app(ReturnPricing::class)->saleLineTaxes($source)
                : [];
            $prepared = [];

            foreach ($data['items'] as $index => $input) {
                $item = $items->get($input['reference_item_id']);
                if (!$item) {
                    throw ValidationException::withMessages(["items.$index.reference_item_id" => 'This item does not belong to the invoice.']);
                }

                $factor = $this->conversionFactor($item);
                $paidQty = (float) $input['quantity'];
                $focQty = $data['type'] === 'Supplier' ? (float) ($input['foc_quantity'] ?? 0) : 0;
                $baseQty = (int) round(($paidQty + $focQty) * $factor);
                if (abs(($paidQty + $focQty) * $factor - $baseQty) > 0.0001 || $baseQty <= 0) {
                    throw ValidationException::withMessages(["items.$index.quantity" => 'Return a valid quantity in the invoice unit.']);
                }

                $already = $previous->get($item->id, collect());
                if ($data['type'] === 'Customer') {
                    $previousBase = (int) $already->sum('base_quantity');
                    if ($previousBase + $baseQty > (int) $item->base_quantity) {
                        throw ValidationException::withMessages(["items.$index.quantity" => 'Return quantity exceeds the remaining sale quantity.']);
                    }
                    $refundCents = app(ReturnPricing::class)->returnCents($item, $lineAmounts[$item->id] ?? 0, $previousBase, $baseQty);
                    $taxCents = app(ReturnPricing::class)->returnCents($item, $lineTaxes[$item->id] ?? 0, $previousBase, $baseQty);
                    $batch = InventoryBatch::whereKey($item->batch_id)->where('branch_id', $source->branch_id)->first();
                } else {
                    $previousPaid = (float) $already->sum('paid_quantity');
                    $previousFoc = (float) $already->sum('foc_quantity');
                    if ($paidQty + $previousPaid > (float) $item->quantity + 0.0001 || $focQty + $previousFoc > (float) ($item->foc_quantity ?? 0) + 0.0001) {
                        throw ValidationException::withMessages(["items.$index.quantity" => 'Return quantity exceeds the remaining paid or free quantity.']);
                    }
                    $refundCents = (int) round($paidQty * (float) $item->unit_price * 100);
                    $taxCents = 0;
                    $batch = InventoryBatch::where('branch_id', $source->branch_id)
                        ->where('product_id', $item->product_id)
                        ->where('batch_number', $item->batch_number)
                        ->whereDate('expiry_date', $item->expiry_date)
                        ->first();
                }

                if (!$batch) {
                    throw ValidationException::withMessages(["items.$index.reference_item_id" => 'The original inventory batch is unavailable.']);
                }

                $restock = $data['type'] === 'Customer' && (bool) ($input['restock'] ?? false);
                if ($restock && $batch->expiry_date && $batch->expiry_date->lt(today())) {
                    throw ValidationException::withMessages(["items.$index.restock" => 'Expired medicine cannot be returned to sellable stock.']);
                }
                $baseCost = $data['type'] === 'Customer' ? (float) $item->base_unit_cost : (float) $batch->purchase_price;
                $prepared[] = [
                    'source_sale_item_id' => $data['type'] === 'Customer' ? $item->id : null,
                    'source_purchase_item_id' => $data['type'] === 'Supplier' ? $item->id : null,
                    'product_id' => $item->product_id,
                    'batch_id' => $batch->id,
                    'unit_id' => $item->unit_id,
                    'quantity' => $paidQty + $focQty,
                    'paid_quantity' => $paidQty,
                    'foc_quantity' => $focQty,
                    'base_quantity' => $baseQty,
                    'base_unit_cost' => $baseCost,
                    'cost_total' => $data['type'] === 'Supplier' || $restock ? round($baseQty * $baseCost, 2) : 0,
                    'restock' => $restock,
                    'refund_price' => $paidQty > 0 ? round($refundCents / 100 / $paidQty, 2) : 0,
                    'refund_amount' => $refundCents / 100,
                    'tax_amount' => $taxCents / 100,
                    'created_at' => now(),
                ];
            }

            $return = ReturnEntry::create([
                'type' => $data['type'],
                'reference_id' => $source->id,
                'branch_id' => $source->branch_id,
                'reason' => $data['reason'],
                'refund_amount' => round(collect($prepared)->sum('refund_amount'), 2),
                'tax_amount' => round(collect($prepared)->sum('tax_amount'), 2),
                'status' => 'Pending',
            ]);

            foreach ($prepared as $item) {
                $return->items()->create($item);
            }

            return $return;
        });
    }

    public function decide(ReturnEntry $entry, string $status): void
    {
        DB::transaction(function () use ($entry, $status) {
            $entry = ReturnEntry::whereKey($entry->id)->lockForUpdate()->firstOrFail();
            if ($entry->status !== 'Pending') {
                throw ValidationException::withMessages(['status' => 'Only pending returns can be decided.']);
            }
            if ($status === 'Rejected') {
                $entry->update(['status' => 'Rejected']);
                return;
            }

            if ($entry->type === 'Customer') {
                $source = Sale::whereKey($entry->reference_id)->lockForUpdate()->firstOrFail();
            } else {
                $supplierId = Purchase::whereKey($entry->reference_id)->value('supplier_id');
                $supplier = Supplier::whereKey($supplierId)->lockForUpdate()->firstOrFail();
                $source = Purchase::whereKey($entry->reference_id)->lockForUpdate()->firstOrFail();
            }
            if ($entry->type === 'Customer' && $source->status === 'Voided') {
                throw ValidationException::withMessages(['status' => 'The original sale is voided.']);
            }

            foreach ($entry->items()->orderBy('id')->get() as $item) {
                $quantity = (int) $item->base_quantity;
                $batch = InventoryBatch::whereKey($item->batch_id)->where('branch_id', $entry->branch_id)->lockForUpdate()->first();
                if (!$batch) {
                    throw ValidationException::withMessages(['status' => 'An original inventory batch is unavailable.']);
                }
                if ($entry->type === 'Customer' && $item->restock && $batch->expiry_date && $batch->expiry_date->lt(today())) {
                    throw ValidationException::withMessages(['status' => 'An item marked for restocking has expired. Reject this return and create a non-restocking return.']);
                }
                $inventory = Inventory::where('branch_id', $entry->branch_id)->where('product_id', $item->product_id)->lockForUpdate()->first();
                if ($entry->type === 'Supplier') {
                    if (!$inventory || (int) $inventory->quantity < $quantity || (int) $batch->quantity < $quantity) {
                        throw ValidationException::withMessages(['status' => 'Insufficient stock in the original batch for this supplier return.']);
                    }
                    $batch->decrement('quantity', $quantity);
                    $inventory->decrement('quantity', $quantity);
                } elseif ($item->restock) {
                    if (!$inventory) {
                        $inventory = Inventory::create(['branch_id' => $entry->branch_id, 'product_id' => $item->product_id, 'quantity' => 0]);
                    }
                    $oldQty = (int) $batch->quantity;
                    $newQty = $oldQty + $quantity;
                    $batch->update([
                        'quantity' => $newQty,
                        'purchase_price' => $newQty > 0
                            ? (($oldQty * (float) $batch->purchase_price) + ($quantity * (float) $item->base_unit_cost)) / $newQty
                            : (float) $item->base_unit_cost,
                    ]);
                    $inventory->increment('quantity', $quantity);
                }
            }

            $refund = round((float) $entry->refund_amount, 2);
            if ($entry->type === 'Customer') {
                $due = max(round((float) $source->grand_total - (float) $source->amount_received - (float) $source->return_credit_amount, 2), 0);
                $credit = $source->customer_id ? min($refund, $due) : 0;
                $newCredit = round((float) $source->return_credit_amount + $credit, 2);
                $remaining = max(round((float) $source->grand_total - (float) $source->amount_received - $newCredit, 2), 0);
                $source->update([
                    'return_credit_amount' => $newCredit,
                    'payment_status' => $remaining <= 0 ? 'Paid' : ((float) $source->amount_received + $newCredit > 0 ? 'Partial' : 'Due'),
                ]);
            } else {
                $credit = min($refund, max((float) $source->due_amount, 0));
                if ($credit > round((float) $supplier->balance, 2)) {
                    throw ValidationException::withMessages(['status' => 'Supplier balance is lower than the invoice credit. Reconcile the supplier account before approval.']);
                }
                $newDue = round((float) $source->due_amount - $credit, 2);
                $source->update([
                    'due_amount' => $newDue,
                    'return_credit_amount' => round((float) $source->return_credit_amount + $credit, 2),
                    'payment_status' => $newDue <= 0 ? 'Paid' : ((float) $source->paid_amount > 0 ? 'Partial' : 'Due'),
                ]);
                $supplier->update(['balance' => round((float) $supplier->balance - $credit, 2)]);
            }

            $entry->update([
                'status' => 'Approved',
                'credit_applied' => $credit,
                'settlement_due' => round($refund - $credit, 2),
                'approved_at' => now(),
            ]);
        });
    }

    public function settle(ReturnEntry $entry, User $user, array $data): void
    {
        DB::transaction(function () use ($entry, $user, $data) {
            $entry = ReturnEntry::whereKey($entry->id)->lockForUpdate()->firstOrFail();
            $remaining = round((float) $entry->settlement_due - (float) $entry->settlement_paid, 2);
            $amount = round((float) $data['amount'], 2);
            if ($entry->status !== 'Approved' || $amount <= 0 || $amount > $remaining) {
                throw ValidationException::withMessages(['amount' => 'Amount must be within the approved return balance.']);
            }

            $cashSessionId = null;
            if ($data['payment_method'] === 'Cash') {
                $session = CashSession::where('branch_id', $entry->branch_id)
                    ->where('user_id', $user->id)
                    ->where('status', 'open')
                    ->whereNull('closed_at')
                    ->lockForUpdate()->first();
                if (!$session) {
                    throw ValidationException::withMessages(['payment_method' => 'Open a cash shift at this branch before recording a cash settlement.']);
                }
                $cashSessionId = $session->id;
            }

            ReturnSettlement::create([
                'return_id' => $entry->id,
                'user_id' => $user->id,
                'cash_session_id' => $cashSessionId,
                'amount' => $amount,
                'payment_method' => $data['payment_method'],
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? null,
                'settled_at' => now(),
            ]);
            $entry->update(['settlement_paid' => round((float) $entry->settlement_paid + $amount, 2)]);
        });
    }

    private function conversionFactor($item): int
    {
        $received = (float) $item->quantity + ($item instanceof SaleItem ? 0 : (float) ($item->foc_quantity ?? 0));
        $base = (int) $item->base_quantity;
        $factor = $received > 0 ? (int) round($base / $received) : 0;
        if ($factor < 1 || abs($received * $factor - $base) > 0.0001) {
            throw ValidationException::withMessages(['items' => 'The invoice item has an invalid unit conversion.']);
        }
        return $factor;
    }
}
