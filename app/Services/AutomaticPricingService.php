<?php

namespace App\Services;

use App\Models\PricingRule;
use App\Models\Product;
use App\Models\ProductUnit;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AutomaticPricingService
{
    public const FIELDS = ['selling_price', 'wholesale_price'];
    public const MAX_PRICE = '999999999999.99';

    /** Acquire before product, purchase and inventory locks, inside a transaction. */
    public function lock(): int
    {
        return (int) DB::table('pricing_states')->where('id', 1)->lockForUpdate()->value('version');
    }

    public function assertSellable(ProductUnit $unit, string $field): void
    {
        if ($unit->{$field.'_mode'} === 'automatic' && bccomp((string) $unit->$field, '0', 2) <= 0) {
            throw ValidationException::withMessages(['items' => 'This automatic price needs a buying cost. Set the medicine cost or a manual price before selling.']);
        }
    }

    public function calculate(string $cost, array $rule, string $factor = '1'): ?string
    {
        if (bccomp($cost, '0', 6) <= 0) return null;
        $markup = bcmul($cost, bcadd('1', bcdiv((string) $rule['markup_percent'], '100', 10), 10), 12);
        $floor = bcadd($cost, (string) $rule['minimum_profit'], 12);
        $candidate = bccomp($markup, $floor, 12) >= 0 ? $markup : $floor;
        $increment = (string) $rule['rounding'];
        $steps = bcdiv($candidate, $increment, 0);
        if (bccomp(bcmul($steps, $increment, 12), $candidate, 12) < 0) $steps = bcadd($steps, '1', 0);
        $amount = bcmul(bcmul($steps, $increment, 12), $factor, 2);
        if (bccomp($amount, self::MAX_PRICE, 2) > 0) {
            throw ValidationException::withMessages(['pricing' => 'Calculated price exceeds the supported amount. Reduce cost, conversion factor or markup.']);
        }
        return $amount;
    }

    /** Latest dated purchase, then creation time/ID. Paid cost excludes FOC dilution. */
    public function readCost(Product $product): string
    {
        $item = DB::table('purchase_items as items')->join('purchases', 'purchases.id', '=', 'items.purchase_id')
            ->where('items.product_id', $product->id)->where('items.quantity', '>', 0)
            ->orderByDesc('purchases.purchase_date')->orderByDesc('purchases.created_at')
            ->orderByDesc('purchases.id')->orderByDesc('items.created_at')->orderByDesc('items.id')->first(['items.*']);
        if (!$item) return (string) ($product->pricing_base_cost ?? '0');
        // Use the historical quantities, never today's editable unit conversion.
        $paidBase = bcsub((string) $item->base_quantity, (string) ($item->foc_base_quantity ?? 0), 0);
        if (bccomp($paidBase, '0', 0) <= 0) return '0';
        $paidCost = bcmul((string) $item->quantity, (string) $item->unit_price, 6);
        return bcadd(bcdiv($paidCost, $paidBase, 12), '0.0000005', 6);
    }

    public function refreshProduct(Product $product, string $trigger, ?string $actor = null, ?PricingRule $onlyRule = null, bool $enroll = false): array
    {
        $product = Product::query()->lockForUpdate()->findOrFail($product->id);
        $cost = $this->readCost($product);
        $rules = $onlyRule ? collect([$onlyRule]) : PricingRule::all();
        $stats = ['changed' => 0, 'cost_required' => 0];
        foreach ($product->product_units()->with('unit')->lockForUpdate()->get() as $unit) {
            foreach ($rules as $rule) {
                $field = $rule->code;
                if ($rule->pricing_mode === 'manual') {
                    $unit->fill([$field.'_mode' => 'manual', $field.'_status' => 'manual']);
                    continue;
                }
                if ($enroll) $unit->{$field.'_mode'} = 'automatic';
                if ($unit->{$field.'_mode'} !== 'automatic') {
                    $unit->{$field.'_status'} = 'manual';
                    continue;
                }
                $amount = $this->calculate($cost, $rule->toArray(), (string) $unit->conversion_factor);
                if ($amount === null) {
                    $unit->{$field.'_status'} = 'cost_required';
                    $stats['cost_required']++;
                    continue;
                }
                $unit->{$field.'_status'} = 'calculated';
                if (bccomp((string) $unit->$field, $amount, 2) !== 0) {
                    $this->record($product, $unit, $field, (string) $unit->$field, $amount, $cost, $trigger, $actor, $rule);
                    $unit->$field = $amount;
                    $stats['changed']++;
                }
            }
            $unit->save();
        }
        $product->forceFill(['pricing_buying_cost' => $cost, 'pricing_version' => $product->pricing_version + 1])->save();
        DB::table('pricing_states')->where('id', 1)->increment('version');
        return $stats;
    }

    public function record(Product $product, ProductUnit $unit, string $field, string $old, string $new, ?string $cost, string $trigger, ?string $actor, ?PricingRule $rule = null): void
    {
        DB::table('price_changes')->insert([
            'product_id' => $product->id, 'product_unit_id' => $unit->id, 'product_name' => $product->name,
            'unit_name' => $unit->unit->name, 'price_type' => $field, 'old_price' => $old, 'new_price' => $new,
            'cost_used' => $cost, 'rule_snapshot' => $rule ? json_encode($rule->toArray()) : null,
            'trigger' => $trigger, 'actor_id' => $actor, 'created_at' => now(),
        ]);
    }

    /** Purchase price inputs remain manual only for units already in Manual mode. */
    public function purchasePrices(array $item, ?string $actor): void
    {
        $unit = ProductUnit::where('product_id', $item['product_id'])->where('unit_id', $item['unit_id'])->firstOrFail();
        foreach (self::FIELDS as $field) {
            if ($unit->{$field.'_mode'} === 'automatic') continue;
            $amount = number_format((float) $item[$field], 2, '.', '');
            if (bccomp($amount, '0', 2) <= 0) {
                throw ValidationException::withMessages(['items' => 'Manual selling and wholesale prices must be greater than zero.']);
            }
            if (bccomp((string) $unit->$field, $amount, 2) !== 0) {
                $this->record($unit->product, $unit, $field, (string) $unit->$field, $amount, null, 'purchase_manual', $actor);
            }
            $unit->$field = $amount;
        }
        $unit->save();
    }

    public function refreshProducts(iterable $ids, string $trigger, ?string $actor): void
    {
        foreach (Product::whereIn('id', collect($ids)->unique())->orderBy('id')->get() as $product) {
            $this->refreshProduct($product, $trigger, $actor);
        }
    }

    /** Also guards manual amounts from stale medicine forms after a purchase/rule change. */
    public function saveUnits(Product $product, array $rows): void
    {
        $rules = PricingRule::all()->keyBy('code');
        $existing = $product->product_units()->get()->keyBy('unit_id');
        $default = collect($rows)->search(fn ($row) => $row['is_default_selling_unit'] ?? false);
        $default = $default === false ? 0 : $default;
        $retained = [];
        foreach ($rows as $index => $row) {
            $unit = $existing->get($row['unit_id']) ?? $product->product_units()->make(['unit_id' => $row['unit_id']]);
            $row['is_base_unit'] = $index === 0;
            $row['conversion_factor'] = $index === 0 ? 1 : $row['conversion_factor'];
            $row['is_default_selling_unit'] = $index === $default;
            $row['wholesale_price'] ??= $row['selling_price'];
            foreach (self::FIELDS as $field) {
                $mode = $row[$field.'_mode'] ?? ($unit->exists ? $unit->{$field.'_mode'} : $rules[$field]->pricing_mode);
                if ($mode === 'automatic' && $rules[$field]->pricing_mode !== 'automatic') {
                    throw ValidationException::withMessages(["product_units.{$index}.{$field}_mode" => 'Enable this automatic pricing rule in Settings first.']);
                }
                $row[$field.'_mode'] = $mode;
                if ($mode === 'automatic') $row[$field] = $unit->exists ? $unit->$field : 0;
            }
            $unit->fill($row)->save();
            $retained[] = $unit->id;
        }
        $product->product_units()->whereNotIn('id', $retained)->delete();
    }

    public function preview(PricingRule $rule, array $values, bool $enroll): array
    {
        $version = $this->lock();
        $counts = ['products' => 0, 'prices' => 0, 'manual_overrides' => 0, 'cost_required' => 0];
        $examples = [];
        $hash = hash_init('sha256', HASH_HMAC, (string) config('app.key'));
        hash_update($hash, json_encode([$version, $rule->code, $rule->version, $values, $enroll]));
        Product::with('product_units.unit')->orderBy('id')->chunkById(250, function ($products) use ($rule, $values, $enroll, &$counts, &$examples, $hash) {
            foreach ($products as $product) {
                $cost = $this->readCost($product);
                $affected = false;
                foreach ($product->product_units as $unit) {
                    if ($unit->{$rule->code.'_mode'} !== 'automatic' && !($enroll && $product->status === 'Active')) continue;
                    $amount = $this->calculate($cost, $values, (string) $unit->conversion_factor);
                    $affected = true;
                    $counts['prices']++;
                    if ($unit->{$rule->code.'_mode'} === 'manual') $counts['manual_overrides']++;
                    if ($amount === null) $counts['cost_required']++;
                    hash_update($hash, json_encode([$product->id, $product->pricing_version, $unit->id,
                        $unit->conversion_factor, $unit->{$rule->code}, $unit->{$rule->code.'_mode'}, $cost]));
                    if (count($examples) < 20) $examples[] = ['product' => $product->name, 'unit' => $unit->unit->name,
                        'old_price' => $unit->{$rule->code}, 'new_price' => $amount, 'base_cost' => $cost];
                }
                if ($affected) $counts['products']++;
            }
        });
        return $counts + ['examples' => $examples, 'token' => hash_final($hash)];
    }
}
