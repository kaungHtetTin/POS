<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierPaymentService
{
    public function record(array $data, User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $supplier = Supplier::whereKey($data['supplier_id'])->lockForUpdate()->firstOrFail();
            $amount = round((float) $data['amount'], 2);

            if ($amount <= 0) {
                throw ValidationException::withMessages([
                    'amount' => 'Payment amount must be greater than zero.',
                ]);
            }

            $accessibleBranchIds = $this->accessibleBranchIds($user);

            if ($accessibleBranchIds->isEmpty()) {
                throw ValidationException::withMessages([
                    'branch_id' => 'No accessible branch is available for this payment.',
                ]);
            }

            if (!empty($data['branch_id']) && !$accessibleBranchIds->contains($data['branch_id'])) {
                throw ValidationException::withMessages([
                    'branch_id' => 'You do not have access to the selected branch.',
                ]);
            }

            $purchasesQuery = Purchase::where('supplier_id', $supplier->id)
                ->whereIn('branch_id', $accessibleBranchIds)
                ->where('due_amount', '>', 0)
                ->lockForUpdate();

            if (!empty($data['purchase_id'])) {
                $purchasesQuery->whereKey($data['purchase_id']);
            }

            $purchases = $purchasesQuery
                ->orderBy('due_date')
                ->orderBy('purchase_date')
                ->orderBy('created_at')
                ->get();

            if ($purchases->isEmpty()) {
                throw ValidationException::withMessages([
                    'purchase_id' => 'No outstanding purchase due found for this supplier.',
                ]);
            }

            $outstandingDue = round((float) $purchases->sum('due_amount'), 2);
            $supplierBalance = round((float) $supplier->balance, 2);

            if ($amount > $outstandingDue) {
                throw ValidationException::withMessages([
                    'amount' => 'Payment amount cannot exceed outstanding purchase due.',
                ]);
            }

            if ($amount > $supplierBalance) {
                throw ValidationException::withMessages([
                    'amount' => 'Payment amount cannot exceed supplier outstanding balance.',
                ]);
            }

            $remaining = $amount;
            $payments = collect();

            foreach ($purchases as $purchase) {
                if ($remaining <= 0) {
                    break;
                }

                $purchaseDue = round((float) $purchase->due_amount, 2);
                $appliedAmount = min($remaining, $purchaseDue);
                $newDue = round($purchaseDue - $appliedAmount, 2);
                $newPaid = round((float) $purchase->paid_amount + $appliedAmount, 2);

                $purchase->update([
                    'paid_amount' => $newPaid,
                    'due_amount' => $newDue,
                    'payment_status' => $this->resolvePaymentStatus($newPaid, $newDue),
                ]);

                $payments->push(SupplierPayment::create([
                    'supplier_id' => $supplier->id,
                    'purchase_id' => $purchase->id,
                    'branch_id' => $purchase->branch_id,
                    'user_id' => $user->id,
                    'payment_date' => $data['payment_date'],
                    'amount' => $appliedAmount,
                    'payment_method' => $data['payment_method'],
                    'reference_number' => $data['reference_number'] ?? null,
                    'notes' => $data['notes'] ?? null,
                ]));

                $remaining = round($remaining - $appliedAmount, 2);
            }

            $supplier->update([
                'balance' => round($supplierBalance - $amount, 2),
            ]);

            return [
                'supplier' => $supplier->fresh(),
                'payments' => $payments,
            ];
        });
    }

    protected function resolvePaymentStatus(float $paidAmount, float $dueAmount): string
    {
        if ($dueAmount <= 0) {
            return 'Paid';
        }

        if ($paidAmount > 0) {
            return 'Partial';
        }

        return 'Due';
    }

    protected function accessibleBranchIds(User $user)
    {
        if ($user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches')) {
            return Branch::pluck('id');
        }

        $branchIds = collect([$user->branch_id, $user->active_branch_id])->filter();

        try {
            $branchIds = $branchIds->merge($user->branches()->pluck('branches.id'));
        } catch (\Throwable $e) {
            // Keep direct branch assignments when the optional relation is unavailable.
        }

        return $branchIds->unique()->values();
    }
}
