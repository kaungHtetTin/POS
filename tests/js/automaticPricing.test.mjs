import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../../resources/js/Utils/automaticPricing.js', import.meta.url), 'utf8');
const { automaticPrice, purchaseBuyingCost } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('preview matches server rounding and minimum-profit examples', () => {
    for (const [cost, markup, profit, rounding, expected] of [
        ['950', 20, 100, 50, '1150.00'], ['1000', 10, 300, 100, '1300.00'],
        ['1050', 0, 0, 100, '1100.00'], ['0.1', 0, 0, 1, '1.00'], ['0.000001', 0, 0, 1, '1.00'],
    ]) assert.equal(automaticPrice(cost, { markup_percent: markup, minimum_profit: profit, rounding }), expected);
    assert.equal(automaticPrice('1000', { markup_percent: 20, minimum_profit: 0, rounding: 50 }, '10'), '12000.00');
});

test('purchase cost converts to base units without free-quantity dilution', () => {
    assert.equal(purchaseBuyingCost('10', '1200'), '120.000000');
    assert.equal(purchaseBuyingCost('3', '1'), '0.333333');
});

test('unavailable or invalid preview inputs do not produce a price', () => {
    assert.equal(automaticPrice('0', { markup_percent: 20, minimum_profit: 0, rounding: 50 }), null);
    assert.equal(automaticPrice('1', { markup_percent: 20, minimum_profit: 0, rounding: 0 }), null);
    assert.equal(purchaseBuyingCost('0', '10'), null);
});
