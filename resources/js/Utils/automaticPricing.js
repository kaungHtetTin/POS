const SCALE = 1000000000000n;
const decimal = (value) => {
    if (!/^\d+(\.\d{0,12})?$/.test(String(value))) throw new Error('Invalid decimal');
    const [whole, fraction = ''] = String(value).split('.');
    return BigInt(whole) * SCALE + BigInt(fraction.padEnd(12, '0'));
};
const ceil = (value, divisor) => (value + divisor - 1n) / divisor;

// Display preview only. The server calculates authoritative prices on every save.
export function automaticPrice(cost, rule, factor = '1') {
    try {
        const amount = decimal(cost);
        if (amount <= 0n || decimal(factor) <= 0n) return null;
        const markup = amount * (SCALE + decimal(rule.markup_percent) / 100n) / SCALE;
        const minimum = amount + decimal(rule.minimum_profit);
        const rounded = ceil(markup > minimum ? markup : minimum, decimal(rule.rounding)) * decimal(rule.rounding);
        const cents = ceil(rounded * decimal(factor) / SCALE, SCALE / 100n);
        return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
    } catch { return null; }
}

export function purchaseBuyingCost(factor, cost) {
    try {
        const divisor = decimal(factor);
        if (divisor <= 0n) return null;
        const value = decimal(cost) * SCALE / divisor;
        const rounded = (value + 500000n) / 1000000n;
        return `${rounded / 1000000n}.${String(rounded % 1000000n).padStart(6, '0')}`;
    } catch { return null; }
}
