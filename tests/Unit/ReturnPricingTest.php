<?php

namespace Tests\Unit;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\ReturnPricing;
use PHPUnit\Framework\TestCase;

class ReturnPricingTest extends TestCase
{
    public function test_invoice_and_tax_allocations_reconcile_to_recorded_totals(): void
    {
        $sale = new Sale(['grand_total' => 11, 'tax' => 1]);
        $sale->setRelation('items', collect([
            $this->line('a', 5, 2),
            $this->line('b', 5, 2),
        ]));

        $pricing = new ReturnPricing();
        $this->assertSame(['a' => 550, 'b' => 550], $pricing->saleLineAmounts($sale));
        $this->assertSame(['a' => 50, 'b' => 50], $pricing->saleLineTaxes($sale));
    }

    public function test_partial_returns_add_up_to_the_allocated_line_amount(): void
    {
        $line = $this->line('a', 0.03, 2);
        $pricing = new ReturnPricing();

        $first = $pricing->returnCents($line, 3, 0, 1);
        $second = $pricing->returnCents($line, 3, 1, 1);

        $this->assertSame(3, $first + $second);
        $this->assertSame(0, $pricing->returnCents($line, 3, 2, 0));
    }

    public function test_mixed_tax_items_use_their_recorded_tax_snapshots(): void
    {
        $sale = new Sale(['grand_total' => 11.50, 'tax' => 1.50]);
        $sale->setRelation('items', collect([
            $this->line('a', 5, 1)->forceFill(['payable_total' => 5.50, 'tax_amount' => 0.50, 'financial_snapshot' => true]),
            $this->line('b', 5, 1)->forceFill(['payable_total' => 6, 'tax_amount' => 1, 'financial_snapshot' => true]),
        ]));

        $pricing = new ReturnPricing();
        $this->assertSame(['a' => 550, 'b' => 600], $pricing->saleLineAmounts($sale));
        $this->assertSame(['a' => 50, 'b' => 100], $pricing->saleLineTaxes($sale));
    }

    private function line(string $id, float $total, int $baseQuantity): SaleItem
    {
        return (new SaleItem())->forceFill([
            'id' => $id,
            'total_price' => $total,
            'base_quantity' => $baseQuantity,
        ]);
    }
}
