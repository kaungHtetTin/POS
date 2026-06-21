<?php

namespace App\Services\Api;

use App\Models\CashSession;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SaleSyncService
{
    public function sync(array $payload, User $user): array
    {
        $clientReference = $this->clientReferenceFrom($payload);

        if (!$clientReference) {
            throw ValidationException::withMessages([
                'client_reference' => 'A client_reference, client_id, offline_id, or id is required for offline sync.',
            ]);
        }

        $existing = Sale::where('client_reference', $clientReference)->first();
        if ($existing) {
            return [
                'client_reference' => $clientReference,
                'created' => false,
                'model' => $this->loadSale($existing),
            ];
        }

        $payload['client_reference'] = $clientReference;
        $validated = Validator::make($payload, [
            'client_reference' => 'required|string|max:255|unique:sales,client_reference',
            'branch_id' => 'nullable|exists:branches,id',
            'customer_id' => 'nullable|exists:customers,id',
            'cash_session_id' => 'nullable|exists:cash_sessions,id',
            'invoice_number' => 'nullable|string|max:255|unique:sales,invoice_number',
            'payment_method' => 'required|in:Cash,Card,Mobile,Wallet',
            'payment_status' => 'required|in:Paid,Partial,Due',
            'amount_received' => 'required|numeric|min:0',
            'sale_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_unit_id' => 'required|exists:product_units,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.foc_quantity' => 'nullable|numeric|min:0',
            'items.*.foc_product_unit_id' => 'nullable|exists:product_units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.price_type' => 'nullable|in:retail,wholesale',
            'items.*.tax_rate' => 'nullable|numeric|min:0',
        ])->validate();

        $branchId = $validated['branch_id'] ?? $user->currentBranchId();
        if (!$branchId) {
            throw ValidationException::withMessages([
                'branch_id' => 'No branch assigned.',
            ]);
        }

        if (!$this->userCanAccessBranch($user, $branchId)) {
            throw ValidationException::withMessages([
                'branch_id' => 'You do not have access to this branch.',
            ]);
        }

        $sale = DB::transaction(function () use ($validated, $branchId, $user, $clientReference) {
            $items = collect($validated['items'])->map(function ($item) {
                $item['quantity'] = (float) $item['quantity'];
                $item['foc_quantity'] = (float) ($item['foc_quantity'] ?? 0);
                $item['foc_product_unit_id'] = $item['foc_product_unit_id'] ?? $item['product_unit_id'];
                $item['price_type'] = $item['price_type'] ?? 'retail';
                return $item;
            });

            $productUnitIds = $items
                ->pluck('product_unit_id')
                ->merge($items->pluck('foc_product_unit_id'))
                ->filter()
                ->unique()
                ->values();

            $productIds = $items->pluck('product_id')->unique()->values();
            $products = Product::whereIn('id', $productIds)
                ->with(['taxes:id,rate', 'product_units' => function ($query) use ($productUnitIds) {
                    $query->whereIn('id', $productUnitIds)
                        ->select('id', 'product_id', 'unit_id', 'conversion_factor', 'selling_price', 'wholesale_price', 'is_base_unit');
                }])
                ->get()
                ->keyBy('id');

            $lineComputations = [];
            $subTotal = 0.0;
            $totalTax = 0.0;
            $productDiscountTotal = 0.0;

            foreach ($items as $index => $item) {
                $product = $products->get($item['product_id']);
                $productUnit = $product?->product_units->firstWhere('id', $item['product_unit_id']);
                $focProductUnit = $product?->product_units->firstWhere('id', $item['foc_product_unit_id']);

                if (!$product || !$productUnit) {
                    throw ValidationException::withMessages([
                        "items.$index.product_unit_id" => 'Invalid product unit.',
                    ]);
                }

                if (!$focProductUnit) {
                    throw ValidationException::withMessages([
                        "items.$index.foc_product_unit_id" => 'Invalid FOC product unit.',
                    ]);
                }

                $conversionFactor = max((int) $productUnit->conversion_factor, 1);
                $focConversionFactor = max((int) $focProductUnit->conversion_factor, 1);
                $baseQuantity = (int) round($item['quantity'] * $conversionFactor);
                $focBaseQuantity = (int) round($item['foc_quantity'] * $focConversionFactor);
                $originalUnitPrice = $item['price_type'] === 'wholesale'
                    ? (float) ($productUnit->wholesale_price ?? $productUnit->selling_price)
                    : (float) $productUnit->selling_price;
                $discountPercentage = min(max((float) ($product->discount_percentage ?? 0), 0), 100);
                $lineGross = $item['quantity'] * $originalUnitPrice;
                $lineDiscount = $lineGross * ($discountPercentage / 100);
                $unitPrice = $item['quantity'] > 0 ? max(($lineGross - $lineDiscount) / $item['quantity'], 0) : 0;
                $lineNet = $item['quantity'] * $unitPrice;
                $taxRate = (float) $product->taxes->sum('rate');
                $taxAmount = $product->tax_method === 'Inclusive' && $taxRate > 0
                    ? $lineNet - ($lineNet / (1 + ($taxRate / 100)))
                    : $lineNet * ($taxRate / 100);

                $subTotal += $product->tax_method === 'Inclusive' && $taxRate > 0
                    ? $lineNet - $taxAmount
                    : $lineNet;
                $totalTax += $taxAmount;
                $productDiscountTotal += $lineDiscount;

                $lineComputations[] = [
                    'product_id' => $product->id,
                    'unit_id' => $productUnit->unit_id,
                    'foc_unit_id' => $focProductUnit->unit_id,
                    'base_quantity' => $baseQuantity,
                    'foc_base_quantity' => $focBaseQuantity,
                    'total_base_quantity' => $baseQuantity + $focBaseQuantity,
                    'quantity' => $item['quantity'],
                    'foc_quantity' => $item['foc_quantity'],
                    'conversion_factor' => $conversionFactor,
                    'foc_conversion_factor' => $focConversionFactor,
                    'unit_price' => $unitPrice,
                    'original_unit_price' => $originalUnitPrice,
                    'price_type' => $item['price_type'],
                    'discount_percentage' => $discountPercentage,
                    'discount_amount' => $lineDiscount,
                ];
            }

            $grandTotal = max($subTotal + $totalTax, 0);
            $amountReceived = (float) $validated['amount_received'];
            $changeDue = max($amountReceived - $grandTotal, 0);
            $cashSessionId = $this->resolveCashSessionId($validated, $branchId, $user);

            $sale = Sale::create([
                'branch_id' => $branchId,
                'user_id' => $user->id,
                'customer_id' => $validated['customer_id'] ?? null,
                'cash_session_id' => $cashSessionId,
                'invoice_number' => $validated['invoice_number'] ?? $this->makeInvoiceNumber($clientReference),
                'client_reference' => $clientReference,
                'total_amount' => $subTotal,
                'discount' => $productDiscountTotal,
                'tax' => $totalTax,
                'grand_total' => $grandTotal,
                'amount_received' => $amountReceived,
                'change_due' => $changeDue,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $validated['payment_status'],
                'sale_date' => $validated['sale_date'] ?? now(),
                'is_synced' => true,
                'synced_at' => now(),
            ]);

            foreach ($lineComputations as $line) {
                $paidBaseRemaining = (int) $line['base_quantity'];
                $focBaseRemaining = (int) $line['foc_base_quantity'];
                $remaining = (int) $line['total_base_quantity'];
                $batches = InventoryBatch::where('branch_id', $branchId)
                    ->where('product_id', $line['product_id'])
                    ->where('quantity', '>', 0)
                    ->whereDate('expiry_date', '>=', now()->toDateString())
                    ->orderBy('expiry_date')
                    ->lockForUpdate()
                    ->get();

                if ((int) $batches->sum('quantity') < $remaining) {
                    throw ValidationException::withMessages([
                        'items' => 'Insufficient stock for one or more items.',
                    ]);
                }

                foreach ($batches as $batch) {
                    if ($remaining <= 0) {
                        break;
                    }

                    $deduct = min($remaining, (int) $batch->quantity);
                    $batch->update(['quantity' => (int) $batch->quantity - $deduct]);

                    $paidBaseDeduct = min($deduct, $paidBaseRemaining);
                    $paidBaseRemaining -= $paidBaseDeduct;

                    $focBaseDeduct = $deduct - $paidBaseDeduct;
                    if ($focBaseDeduct > $focBaseRemaining) {
                        $focBaseDeduct = $focBaseRemaining;
                    }
                    $focBaseRemaining -= $focBaseDeduct;

                    $quantityInUnit = $paidBaseDeduct / (int) $line['conversion_factor'];
                    $focQuantityInUnit = $focBaseDeduct / (int) $line['foc_conversion_factor'];

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $line['product_id'],
                        'batch_id' => $batch->id,
                        'unit_id' => $line['unit_id'],
                        'quantity' => $quantityInUnit,
                        'foc_quantity' => $focQuantityInUnit,
                        'foc_unit_id' => $line['foc_unit_id'],
                        'base_quantity' => $paidBaseDeduct,
                        'foc_base_quantity' => $focBaseDeduct,
                        'unit_price' => $line['unit_price'],
                        'price_type' => $line['price_type'],
                        'original_unit_price' => $line['original_unit_price'],
                        'discount_percentage' => $line['discount_percentage'],
                        'discount_amount' => $line['quantity'] > 0
                            ? $line['discount_amount'] * ($quantityInUnit / (float) $line['quantity'])
                            : 0,
                        'total_price' => $quantityInUnit * (float) $line['unit_price'],
                        'created_at' => now(),
                    ]);

                    $remaining -= $deduct;
                }

                $inventory = Inventory::firstOrNew([
                    'branch_id' => $branchId,
                    'product_id' => $line['product_id'],
                ]);

                $inventory->quantity = max(($inventory->quantity ?? 0) - (int) $line['total_base_quantity'], 0);
                $inventory->save();
            }

            return $sale;
        });

        return [
            'client_reference' => $clientReference,
            'created' => true,
            'model' => $this->loadSale($sale),
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

    private function resolveCashSessionId(array $validated, string $branchId, User $user): ?string
    {
        if (!empty($validated['cash_session_id'])) {
            $session = CashSession::whereKey($validated['cash_session_id'])
                ->where('branch_id', $branchId)
                ->where('user_id', $user->id)
                ->first();

            if (!$session) {
                throw ValidationException::withMessages([
                    'cash_session_id' => 'Cash session does not belong to this user and branch.',
                ]);
            }

            return $session->id;
        }

        return CashSession::where('branch_id', $branchId)
            ->where('user_id', $user->id)
            ->whereNull('closed_at')
            ->value('id');
    }

    private function userCanAccessBranch(User $user, string $branchId): bool
    {
        return $user->canAccessBranch($branchId)
            || $user->hasRole('Root')
            || $user->hasRole('Owner')
            || $user->hasPermission('manage_branches');
    }

    private function makeInvoiceNumber(string $clientReference): string
    {
        do {
            $invoiceNumber = 'S' . now()->format('YmdHis') . strtoupper(substr(md5($clientReference . microtime(true)), 0, 6));
        } while (Sale::where('invoice_number', $invoiceNumber)->exists());

        return $invoiceNumber;
    }

    private function loadSale(Sale $sale): Sale
    {
        return $sale->load([
            'items.product:id,name',
            'items.unit:id,name,short_name',
            'items.focUnit:id,name,short_name',
            'customer:id,name,phone',
            'branch:id,name',
        ]);
    }
}
