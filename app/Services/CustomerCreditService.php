<?php

namespace App\Services;

use App\Models\Customer;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class CustomerCreditService
{
    // Called inside the checkout transaction, after calculating the actual total.
    public function payment(array $data, float $total): array
    {
        $credit = $data['payment_status'] !== 'Paid';
        $received = !$credit && $data['payment_method'] !== 'Cash'
            ? $total : round((float) ($data['amount_received'] ?? 0), 2);
        $total = round($total, 2);

        if ($credit) {
            if (empty($data['customer_id'])) {
                throw ValidationException::withMessages(['payment_status' => 'Credit payments require a selected customer.']);
            }
            $customer = Customer::query()->lockForUpdate()->findOrFail($data['customer_id']);
            if ($customer->sales()->outstanding()->whereDate('due_date', '<', today())->exists()) {
                throw ValidationException::withMessages(['payment_status' => 'This customer has an overdue balance. Full payment is required.']);
            }
            if ($received >= $total) {
                throw ValidationException::withMessages(['amount_received' => 'Select Paid when paying the full total.']);
            }
        } elseif ($received < $total) {
            throw ValidationException::withMessages(['amount_received' => 'Full payment is required for paid sales. Select Credit for a partial payment.']);
        }

        $saleDate = Carbon::parse($data['sale_date'] ?? now())->startOfDay();
        $dueDate = $credit ? Carbon::parse($data['due_date'] ?? $saleDate->copy()->addDays(7))->startOfDay() : null;
        if ($dueDate && $dueDate->lt($saleDate)) {
            throw ValidationException::withMessages(['due_date' => 'The due date cannot be before the sale date.']);
        }

        return [
            'amount_received' => $received,
            'change_due' => max($received - $total, 0),
            // Keep legacy storage values compatible with existing accounting reports.
            'payment_status' => $credit ? ($received > 0 ? 'Partial' : 'Due') : 'Paid',
            'due_date' => $dueDate?->toDateString(),
        ];
    }
}
