const PREFIX = 'pharmacy.cashier.';

export const keys = {
    token: `${PREFIX}token`,
    profile: `${PREFIX}profile`,
    products: (branchId) => `${PREFIX}products.${branchId || 'none'}`,
    customers: `${PREFIX}customers`,
    session: (branchId) => `${PREFIX}session.${branchId || 'none'}`,
    cart: (userId, branchId) => `${PREFIX}cart.${userId}.${branchId || 'none'}`,
    pendingSales: `${PREFIX}pending-sales`,
};

export function loadJson(key, fallback = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

export function saveJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage can be unavailable in private browsing. The live session still works.
    }
}

export function makeReference() {
    const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `pwa-sale-${id}`;
}

export function getPendingSales() {
    return loadJson(keys.pendingSales, []);
}

export function setPendingSales(sales) {
    saveJson(keys.pendingSales, sales);
    window.dispatchEvent(new CustomEvent('cashier:pending-sales', { detail: sales }));
}

export function addPendingSale(sale) {
    const next = [...getPendingSales().filter((item) => item.client_reference !== sale.client_reference), sale];
    setPendingSales(next);
    return next;
}
