<?php

namespace App\Http\Controllers;

use App\Models\PricingRule;
use App\Models\Product;
use App\Services\AutomaticPricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PricingRuleController extends Controller
{
    private function values(Request $request): array
    {
        $values = $request->validate([
            'pricing_mode' => 'required|in:manual,automatic',
            'markup_percent' => ['required', 'numeric', 'between:0,1000', 'regex:/^\d+(\.\d{1,4})?$/'],
            'rounding' => 'required|integer|between:1,100000',
            'minimum_profit' => ['required', 'numeric', 'between:0,99999999999', 'regex:/^\d+(\.\d{1,2})?$/'],
            'version' => 'required|integer|min:1',
            'apply_to_existing' => 'required|boolean',
            'preview_token' => 'nullable|string|size:64',
        ]);
        return ['pricing_mode' => $values['pricing_mode'], 'markup_percent' => bcadd((string) $values['markup_percent'], '0', 4),
            'rounding' => (int) $values['rounding'], 'minimum_profit' => bcadd((string) $values['minimum_profit'], '0', 2)];
    }

    public function preview(Request $request, PricingRule $rule, AutomaticPricingService $pricing)
    {
        $values = $this->values($request);
        if ($values['pricing_mode'] !== 'automatic') throw ValidationException::withMessages(['pricing_mode' => 'Choose Automatic mode to preview calculated prices.']);
        return DB::transaction(fn () => response()->json($pricing->preview($rule, $values, $request->boolean('apply_to_existing'))));
    }

    public function update(Request $request, PricingRule $rule, AutomaticPricingService $pricing)
    {
        $values = $this->values($request);
        $stats = DB::transaction(function () use ($request, $rule, $pricing, $values) {
            $pricing->lock();
            $rule = PricingRule::lockForUpdate()->findOrFail($rule->code);
            if ((int) $request->input('version') !== $rule->version) {
                throw ValidationException::withMessages(['pricing' => 'This rule changed. Reload settings before saving.']);
            }
            $enroll = $request->boolean('apply_to_existing');
            if ($values['pricing_mode'] === 'automatic') {
                $preview = $pricing->preview($rule, $values, $enroll);
                if (!hash_equals($preview['token'], (string) $request->input('preview_token'))) {
                    throw ValidationException::withMessages(['pricing' => 'Preview the current impact before saving. Prices or costs may have changed since the last preview.']);
                }
            } elseif ($enroll) {
                throw ValidationException::withMessages(['apply_to_existing' => 'Bulk application requires Automatic mode.']);
            }
            $rule->update($values + ['version' => $rule->version + 1]);
            $stats = ['changed' => 0, 'cost_required' => 0];
            Product::orderBy('id')->chunkById(250, function ($products) use ($rule, $enroll, $pricing, $request, &$stats) {
                foreach ($products as $product) {
                    $result = $pricing->refreshProduct($product, 'rule_save', $request->user()->id, $rule, $enroll && $product->status === 'Active');
                    $stats['changed'] += $result['changed'];
                    $stats['cost_required'] += $result['cost_required'];
                }
            });
            DB::table('pricing_states')->where('id', 1)->increment('version');
            return $stats;
        });
        return redirect()->route('settings.index', ['section' => 'prices'], 303)->with('success',
            "Pricing rule saved. {$stats['changed']} prices updated; {$stats['cost_required']} prices need a buying cost.");
    }
}
