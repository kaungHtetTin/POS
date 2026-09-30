<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;

class ReturnPricing
{
    /** Allocate the recorded invoice total to its batch-split lines in cents. */
    public function saleLineAmounts(Sale $sale): array
    {
        return $this->allocate($sale, (float) $sale->grand_total, 'payable_total');
    }

    public function saleLineTaxes(Sale $sale): array
    {
        return $this->allocate($sale, (float) $sale->tax, 'tax_amount');
    }

    private function allocate(Sale $sale, float $total, string $snapshotColumn): array
    {
        $items = $sale->items->sortBy('id')->values();
        $invoiceCents = (int) round($total * 100);
        $useSnapshots = $items->isNotEmpty() && $items->every(fn ($item) => (bool) $item->financial_snapshot);
        $column = $useSnapshots ? $snapshotColumn : 'total_price';
        $weight = (float) $items->sum($column);
        $allocated = 0;
        $amounts = [];

        foreach ($items as $index => $item) {
            $target = $index === $items->count() - 1
                ? $invoiceCents
                : ($weight > 0 ? (int) round($invoiceCents * $items->take($index + 1)->sum($column) / $weight) : 0);
            $cents = $target - $allocated;
            $amounts[$item->id] = max($cents, 0);
            $allocated = $target;
        }

        return $amounts;
    }

    /** Cumulative rounding guarantees that returning every unit refunds its full allocated amount. */
    public function returnCents(SaleItem $item, int $lineCents, int $previousBase, int $newBase): int
    {
        $totalBase = (int) $item->base_quantity;
        if ($totalBase <= 0) {
            return 0;
        }

        return (int) round($lineCents * ($previousBase + $newBase) / $totalBase)
            - (int) round($lineCents * $previousBase / $totalBase);
    }
}
