import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiRequest, queryString } from './api';
import Icon from './Icons';
import { addPendingSale, getPendingSales, keys, loadJson, makeReference, saveJson, setPendingSales } from './storage';
import { EmptyState, Modal, SkeletonList, flattenErrors, formatDate, money } from './Ui';

function resolveUnit(product, unitId) {
    return product.units?.find((unit) => String(unit.id) === String(unitId))
        || product.units?.find((unit) => unit.is_default_selling_unit)
        || product.units?.find((unit) => unit.is_base_unit)
        || product.units?.[0];
}

function unitPrice(unit, priceType = 'retail') {
    return Number(priceType === 'wholesale' ? (unit?.wholesale_price ?? unit?.selling_price) : unit?.selling_price) || 0;
}

function lineValues(line) {
    const gross = Number(line.quantity || 0) * unitPrice(line.unit, line.price_type);
    const discount = gross * (Math.min(Math.max(Number(line.product.discount_percentage || 0), 0), 100) / 100);
    const net = Math.max(gross - discount, 0);
    const taxRate = Number(line.product.tax_rate || 0);
    const tax = line.product.tax_method === 'Inclusive' && taxRate > 0 ? net - (net / (1 + (taxRate / 100))) : net * (taxRate / 100);
    const subtotal = line.product.tax_method === 'Inclusive' ? net - tax : net;
    return { discount, tax, subtotal, total: subtotal + tax };
}

function calculateTotals(cart) {
    return cart.reduce((totals, line) => {
        const values = lineValues(line);
        totals.subtotal += values.subtotal;
        totals.tax += values.tax;
        totals.discount += values.discount;
        totals.grandTotal += values.total;
        totals.quantity += Number(line.quantity || 0);
        return totals;
    }, { subtotal: 0, tax: 0, discount: 0, grandTotal: 0, quantity: 0 });
}

async function syncPendingSales(token) {
    const pending = getPendingSales();
    if (!pending.length || !navigator.onLine) return { synced: 0, failed: 0 };
    const payloads = pending.map(({ summary, queued_at, sync_error, ...sale }) => sale);
    const result = await apiRequest('/sync/sales', { token, method: 'POST', json: { sales: payloads } });
    const syncedRefs = new Set((result.synced || []).map((entry) => entry.client_reference));
    const failureMap = new Map((result.failed || []).map((entry) => [entry.client_reference, flattenErrors(entry.errors)]));
    setPendingSales(pending.filter((sale) => !syncedRefs.has(sale.client_reference)).map((sale) => ({ ...sale, sync_error: failureMap.get(sale.client_reference) || sale.sync_error })));
    return result.summary || { synced: syncedRefs.size, failed: failureMap.size };
}

function ProductCard({ product, unitId, onUnitChange, onAdd, currency, priceType }) {
    const unit = resolveUnit(product, unitId);
    const available = Math.floor(Number(product.stock_quantity || 0) / Math.max(Number(unit?.conversion_factor || 1), 1));
    const outOfStock = available < 1 || !unit;
    return (
        <article className={`product-card ${outOfStock ? 'product-card--disabled' : ''}`}>
            <button className="product-card__main" type="button" onClick={() => onAdd(product, unit)} disabled={outOfStock}>
                <span className="product-avatar">{product.name?.slice(0, 2).toUpperCase()}</span>
                <span className="product-copy"><strong>{product.name}</strong><small>{product.generic_name || product.barcode || 'Medicine'}</small><span><b>{money(unitPrice(unit, priceType), currency)}</b><em>{outOfStock ? 'Out of stock' : `${available} ${unit?.unit_short_name || unit?.unit_name || 'units'} left`}</em></span></span>
                <i className="add-circle"><Icon name="plus" size={19} /></i>
            </button>
            {product.units?.length > 1 && <label className="unit-picker"><span>Unit</span><select value={unit?.id || ''} onChange={(event) => onUnitChange(product.id, event.target.value)}>{product.units.map((option) => <option key={option.id} value={option.id}>{option.unit_short_name || option.unit_name}</option>)}</select></label>}
        </article>
    );
}

function stockRequested(line) {
    const focUnit = resolveUnit(line.product, line.foc_unit_id || line.unit.id);
    return (Number(line.quantity || 0) * Math.max(Number(line.unit.conversion_factor || 1), 1))
        + (Number(line.foc_quantity || 0) * Math.max(Number(focUnit?.conversion_factor || 1), 1));
}

function CartLine({ line, onChange, onRemove, currency }) {
    const values = lineValues(line);
    const focUnit = resolveUnit(line.product, line.foc_unit_id || line.unit.id);
    const stockExceeded = stockRequested(line) > Number(line.product.stock_quantity || 0);
    const maxQuantity = Math.max(Math.floor((Number(line.product.stock_quantity || 0) - (Number(line.foc_quantity || 0) * Math.max(Number(focUnit?.conversion_factor || 1), 1))) / Math.max(Number(line.unit.conversion_factor || 1), 1)), 0);
    const maxFocQuantity = Math.max(Math.floor((Number(line.product.stock_quantity || 0) - (Number(line.quantity || 0) * Math.max(Number(line.unit.conversion_factor || 1), 1))) / Math.max(Number(focUnit?.conversion_factor || 1), 1)), 0);
    return (
        <article className={`cart-line ${stockExceeded ? 'cart-line--error' : ''}`}>
            <div className="cart-line__head"><div><strong>{line.product.name}</strong><small>{line.product.barcode || 'No barcode'} · {line.price_type}</small></div><button className="icon-button icon-button--danger" type="button" onClick={onRemove} aria-label={`Remove ${line.product.name}`}><Icon name="close" size={18} /></button></div>
            <div className="cart-line__controls">
                <div className="stepper"><button type="button" aria-label="Reduce quantity" onClick={() => onChange({ quantity: Math.max(Number(line.quantity) - 1, 1) })}><Icon name="minus" size={17} /></button><input aria-label="Quantity" type="number" min="0.01" step="1" value={line.quantity} onChange={(event) => onChange({ quantity: Math.max(Number(event.target.value), 0.01) })} /><button type="button" aria-label="Increase quantity" disabled={Number(line.quantity) >= maxQuantity} onClick={() => onChange({ quantity: Number(line.quantity) + 1 })}><Icon name="plus" size={17} /></button></div>
                <select aria-label="Unit" value={line.unit.id} onChange={(event) => onChange({ unit: resolveUnit(line.product, event.target.value) })}>{line.product.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_short_name || unit.unit_name}</option>)}</select>
                <strong>{money(values.total, currency)}</strong>
            </div>
            <div className="foc-controls">
                <div className="foc-field"><span>FOC qty</span><div className="stepper"><button type="button" aria-label="Reduce FOC quantity" disabled={Number(line.foc_quantity || 0) <= 0} onClick={() => onChange({ foc_quantity: Math.max(Number(line.foc_quantity || 0) - 1, 0) })}><Icon name="minus" size={17} /></button><input aria-label="FOC quantity" type="number" min="0" step="1" value={line.foc_quantity || 0} onChange={(event) => onChange({ foc_quantity: Math.max(Number(event.target.value), 0) })} /><button type="button" aria-label="Increase FOC quantity" disabled={Number(line.foc_quantity || 0) >= maxFocQuantity} onClick={() => onChange({ foc_quantity: Number(line.foc_quantity || 0) + 1 })}><Icon name="plus" size={17} /></button></div></div>
                <label><span>FOC unit</span><select aria-label="FOC unit" value={focUnit?.id || line.unit.id} onChange={(event) => onChange({ foc_unit_id: event.target.value })}>{line.product.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_short_name || unit.unit_name}</option>)}</select></label>
            </div>
            {stockExceeded && <small className="stock-error">Stock exceeded. Reduce paid or FOC quantity.</small>}
            {Number(line.product.discount_percentage || 0) > 0 && <small className="line-discount">Includes {Number(line.product.discount_percentage).toFixed(0)}% product discount</small>}
        </article>
    );
}

function CustomerChooser({ token, selected, onSelect, online }) {
    const [query, setQuery] = useState('');
    const [customers, setCustomers] = useState(() => loadJson(keys.customers, []));
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', address: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        const timer = window.setTimeout(async () => {
            if (!online) return;
            setLoading(true);
            try {
                const result = await apiRequest(`/cashier/customers${queryString({ search: query })}`, { token });
                setCustomers(result || []);
                if (!query) saveJson(keys.customers, result || []);
            } catch (requestError) { setError(requestError.message); }
            finally { setLoading(false); }
        }, 250);
        return () => window.clearTimeout(timer);
    }, [online, query, token]);

    const create = async (event) => {
        event.preventDefault();
        if (!online) return setError('Connect to create a customer.');
        setLoading(true);
        setError('');
        try {
            const result = await apiRequest('/cashier/customers', { token, method: 'POST', json: form });
            onSelect(result.customer);
        } catch (requestError) { setError(requestError.message); }
        finally { setLoading(false); }
    };

    if (creating) return <form className="form-stack compact-form" onSubmit={create}><button className="back-link" type="button" onClick={() => setCreating(false)}><Icon name="arrow" size={17} /> Choose an existing customer</button>{error && <div className="form-alert">{error}</div>}<label className="field"><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label className="field"><span>Phone</span><input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label><label className="field"><span>Address <i>optional</i></span><textarea rows="2" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><button className="button button--primary" disabled={loading}>{loading ? 'Creating…' : 'Create & select'}</button></form>;

    return <div className="customer-chooser"><div className="search-box"><Icon name="search" size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or phone" /></div>{error && <div className="form-alert">{error}</div>}<button type="button" className={`customer-option ${!selected ? 'selected' : ''}`} onClick={() => onSelect(null)}><span className="customer-initial">W</span><span><strong>Walk-in customer</strong><small>Full payment required</small></span>{!selected && <Icon name="check" />}</button><div className="customer-results">{customers.map((customer) => <button type="button" key={customer.id} className={`customer-option ${selected?.id === customer.id ? 'selected' : ''}`} onClick={() => onSelect(customer)}><span className="customer-initial">{customer.name?.charAt(0).toUpperCase()}</span><span><strong>{customer.name}</strong><small>{customer.phone}</small></span>{selected?.id === customer.id && <Icon name="check" />}</button>)}{loading && <span className="inline-loading"><span className="spinner" /> Loading customers…</span>}</div><button type="button" className="button button--soft button--full" onClick={() => setCreating(true)} disabled={!online}><Icon name="plus" size={18} /> New customer</button></div>;
}

function printReceipt(sale, settings, currency) {
    const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    const popup = window.open('', '_blank', 'width=420,height=700');
    if (!popup) return;
    const items = sale.items || [];
    popup.document.write(`<html><head><title>${escape(sale.invoice_number)}</title><style>body{font:14px monospace;padding:20px;max-width:320px;margin:auto}h2,p{text-align:center}.row{display:flex;justify-content:space-between;gap:12px;margin:8px 0}.total{font-size:18px;font-weight:bold;border-top:1px dashed;padding-top:12px}</style></head><body><h2>${escape(settings.pharmacy_name || 'Pharmacy POS')}</h2><p>${escape(settings.receipt_header || '')}</p><p>${escape(sale.invoice_number || '')}<br>${escape(formatDate(sale.sale_date || new Date().toISOString()))}</p>${items.map((item) => `<div class="row"><span>${escape(item.product?.name || item.product_name || 'Item')} × ${escape(item.quantity)}</span><span>${escape(money(item.total_price || Number(item.quantity) * Number(item.unit_price), currency))}</span></div>`).join('')}<div class="row total"><span>Total</span><span>${escape(money(sale.grand_total, currency))}</span></div><p>${escape(settings.receipt_footer || 'Thank you')}</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
}

function Receipt({ sale, settings, onClose, currency }) {
    const attempted = useRef(false);
    const items = sale.items || [];
    useEffect(() => {
        if (!settings.auto_print_receipt || attempted.current) return;
        attempted.current = true;
        const timer = window.setTimeout(() => printReceipt(sale, settings, currency), 250);
        return () => window.clearTimeout(timer);
    }, [currency, sale, settings]);
    const receiptText = [settings.pharmacy_name || 'Pharmacy POS', `Receipt ${sale.invoice_number || sale.client_reference || ''}`, ...items.map((item) => `${item.product?.name || item.product_name || 'Item'} × ${item.quantity}`), `Total: ${money(sale.grand_total, currency)}`].join('\n');
    const share = async () => navigator.share ? navigator.share({ title: `Receipt ${sale.invoice_number || ''}`, text: receiptText }) : navigator.clipboard.writeText(receiptText);
    return <Modal open title="Sale complete" onClose={onClose} footer={<><button className="button button--soft" type="button" onClick={share}><Icon name="share" size={18} /> Share</button><button className="button button--primary" type="button" onClick={() => printReceipt(sale, settings, currency)}><Icon name="receipt" size={18} /> Print receipt</button></>}><div className="success-emblem"><Icon name="check" size={34} /></div><div className="receipt-summary"><span>Receipt</span><strong>{sale.invoice_number || 'Queued sale'}</strong><small>{formatDate(sale.sale_date || new Date().toISOString())}</small></div><div className="receipt-items">{items.map((item, index) => <div key={item.id || index}><span>{item.product?.name || item.product_name || 'Item'} <small>× {Number(item.quantity)}</small></span><strong>{money(item.total_price || Number(item.quantity) * Number(item.unit_price), currency)}</strong></div>)}</div><div className="receipt-total"><span>Total paid</span><strong>{money(sale.grand_total, currency)}</strong></div></Modal>;
}

export default function SalesScreen({ token, profile, online, notify, onPriceModeChange }) {
    const branchId = profile.current_branch_id;
    const cartKey = keys.cart(profile.id, branchId);
    const [products, setProducts] = useState(() => loadJson(keys.products(branchId), []));
    const [loadingProducts, setLoadingProducts] = useState(!products.length);
    const [query, setQuery] = useState('');
    const [selectedUnits, setSelectedUnits] = useState({});
    const [cart, setCart] = useState(() => loadJson(cartKey, []));
    const [mobileStep, setMobileStep] = useState('products');
    const [salePriceType, setSalePriceType] = useState('retail');
    const [session, setSession] = useState(() => loadJson(keys.session(branchId), null));
    const [sessionOpen, setSessionOpen] = useState(false);
    const [sessionForm, setSessionForm] = useState({ amount: '', notes: '' });
    const [sessionBusy, setSessionBusy] = useState(false);
    const [customerOpen, setCustomerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentStatus, setPaymentStatus] = useState('Paid');
    const [amountReceived, setAmountReceived] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [receipt, setReceipt] = useState(null);
    const [settings, setSettings] = useState({ currency_symbol: '$', pharmacy_name: 'Pharmacy POS' });
    const searchSequence = useRef(0);
    const currency = settings.currency_symbol || '$';
    const totals = useMemo(() => calculateTotals(cart), [cart]);
    const hasStockIssue = useMemo(() => cart.some((line) => stockRequested(line) > Number(line.product.stock_quantity || 0)), [cart]);
    const navigateSaleStep = useCallback((next, { replace = false } = {}) => {
        const state = { ...(window.history.state || {}), cashierSaleStep: next };
        delete state.cashierSaleOverlay;
        if (replace) window.history.replaceState(state, '', window.location.href);
        else if (window.history.state?.cashierSaleStep !== next) window.history.pushState(state, '', window.location.href);
        setMobileStep(next);
    }, []);
    const openSaleOverlay = useCallback((name) => {
        if (window.history.state?.cashierSaleOverlay !== name) {
            window.history.pushState({ ...(window.history.state || {}), cashierSaleOverlay: name }, '', window.location.href);
        }
        if (name === 'customer') setCustomerOpen(true);
        if (name === 'session') setSessionOpen(true);
    }, []);
    const closeSaleOverlay = useCallback((name) => {
        if (window.history.state?.cashierSaleOverlay === name) return window.history.back();
        if (name === 'customer') setCustomerOpen(false);
        if (name === 'session') setSessionOpen(false);
        if (name === 'receipt') setReceipt(null);
    }, []);

    const loadRegister = useCallback(async () => {
        if (!online) return;
        const sequence = ++searchSequence.current;
        setLoadingProducts(true);
        try {
            const [nextProducts, nextSession, nextSettings] = await Promise.all([apiRequest(`/cashier/products${queryString({ query })}`, { token }), apiRequest('/cashier/sessions/active', { token }), apiRequest('/cashier/receipt-settings', { token })]);
            if (sequence !== searchSequence.current) return;
            setProducts(nextProducts || []);
            setSession(nextSession);
            setSettings(nextSettings || settings);
            saveJson(keys.session(branchId), nextSession);
            if (!query) saveJson(keys.products(branchId), nextProducts || []);
        } catch (requestError) { requestError.status === 401 ? window.location.reload() : setError(requestError.message); }
        finally { if (sequence === searchSequence.current) setLoadingProducts(false); }
    }, [branchId, online, query, token]);

    useEffect(() => { const timer = window.setTimeout(loadRegister, query ? 280 : 0); return () => window.clearTimeout(timer); }, [loadRegister, query]);
    useEffect(() => saveJson(cartKey, cart), [cart, cartKey]);
    useEffect(() => {
        const initialStep = window.history.state?.cashierSaleStep;
        if (['products', 'cart', 'checkout'].includes(initialStep)) setMobileStep(initialStep);
        else navigateSaleStep('products', { replace: true });
        const onBack = (event) => {
            if ((window.location.hash.replace('#', '') || 'sale') !== 'sale') return;
            const next = event.state?.cashierSaleStep;
            const overlay = event.state?.cashierSaleOverlay;
            setMobileStep(['products', 'cart', 'checkout'].includes(next) ? next : 'products');
            setCustomerOpen(overlay === 'customer');
            setSessionOpen(overlay === 'session');
            if (overlay !== 'receipt') setReceipt(null);
        };
        window.addEventListener('popstate', onBack);
        return () => window.removeEventListener('popstate', onBack);
    }, [navigateSaleStep]);
    useEffect(() => {
        const activeOverlay = customerOpen ? 'customer' : sessionOpen ? 'session' : receipt ? 'receipt' : null;
        const historyOverlay = window.history.state?.cashierSaleOverlay || null;
        if (activeOverlay && historyOverlay !== activeOverlay) {
            window.history.pushState({ ...(window.history.state || {}), cashierSaleOverlay: activeOverlay }, '', window.location.href);
        } else if (!activeOverlay && historyOverlay) {
            window.history.back();
        }
    }, [customerOpen, receipt, sessionOpen]);
    useEffect(() => { if (!cart.length && mobileStep !== 'products') navigateSaleStep('products', { replace: true }); }, [cart.length, mobileStep, navigateSaleStep]);
    useEffect(() => {
        if (!online) return undefined;
        const sync = async () => { try { const result = await syncPendingSales(token); if (Number(result.synced || 0) > 0) notify(`${result.synced} pending sale${result.synced > 1 ? 's' : ''} synced.`); } catch { /* Retry later. */ } };
        sync();
        window.addEventListener('online', sync);
        return () => window.removeEventListener('online', sync);
    }, [notify, online, token]);

    const addProduct = useCallback((product, unit) => {
        if (!session) { openSaleOverlay('session'); notify('Open your shift before adding items.', 'info'); return false; }
        setCart((current) => {
            const existing = current.find((line) => line.product.id === product.id && String(line.unit.id) === String(unit.id));
            const max = Math.floor(Number(product.stock_quantity || 0) / Math.max(Number(unit.conversion_factor || 1), 1));
            if (existing) return current.map((line) => line === existing ? { ...line, quantity: Math.min(Number(line.quantity) + 1, max) } : line);
            return [...current, { id: `${product.id}-${unit.id}-${Date.now()}`, product, unit, quantity: 1, foc_quantity: 0, foc_unit_id: unit.id, price_type: salePriceType }];
        });
        return true;
    }, [notify, openSaleOverlay, salePriceType, session]);

    const scanBarcode = useCallback(async (barcode) => {
        const value = String(barcode || '').trim();
        if (!value) return;
        setError('');
        try {
            const matches = online ? await apiRequest(`/cashier/products${queryString({ query: value })}`, { token }) : products;
            const match = (matches || []).find((product) => String(product.barcode || '').toLowerCase() === value.toLowerCase());
            if (!match) return setError(`No product found for barcode ${value}.`);
            const unit = resolveUnit(match, selectedUnits[match.id]);
            if (!unit) return setError('This product has no selling unit.');
            if (addProduct(match, unit)) { setQuery(''); notify(`${match.name} added to cart.`); }
        } catch (requestError) { setError(requestError.message); }
    }, [addProduct, notify, online, products, selectedUnits, token]);

    useEffect(() => {
        let buffer = '';
        let lastKeyAt = 0;
        const handler = (event) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
            const now = Date.now();
            if (now - lastKeyAt > 100) buffer = '';
            lastKeyAt = now;
            if (event.key === 'Enter') { if (buffer.length >= 3) scanBarcode(buffer); buffer = ''; }
            else if (event.key.length === 1) buffer += event.key;
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [scanBarcode]);

    const changePriceType = (next) => {
        setSalePriceType(next);
        onPriceModeChange?.(next);
        setCart((current) => current.map((line) => ({ ...line, price_type: next })));
    };
    const changeLine = (id, patch) => setCart((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
    const removeLine = (id) => setCart((current) => current.filter((line) => line.id !== id));
    const startCheckout = () => {
        setError('');
        if (!session) return openSaleOverlay('session');
        if (!cart.length || hasStockIssue) return;
        setAmountReceived(paymentMethod === 'Cash' ? totals.grandTotal.toFixed(2) : '0');
        navigateSaleStep('checkout');
    };

    const updateSession = async (event) => {
        event.preventDefault();
        if (!online) return setError('Connect to the internet to manage your shift.');
        setSessionBusy(true);
        setError('');
        try {
            if (session) {
                await apiRequest(`/cashier/sessions/${session.id}/close`, { token, method: 'POST', json: { closing_balance: sessionForm.amount, notes: sessionForm.notes } });
                setSession(null); saveJson(keys.session(branchId), null); notify('Shift closed successfully.');
            } else {
                const created = await apiRequest('/cashier/sessions/open', { token, method: 'POST', json: { opening_balance: sessionForm.amount || 0, notes: sessionForm.notes } });
                const active = await apiRequest('/cashier/sessions/active', { token });
                setSession(active || created); saveJson(keys.session(branchId), active || created); notify('Shift opened. You are ready to sell.');
            }
            closeSaleOverlay('session'); setSessionForm({ amount: '', notes: '' });
        } catch (requestError) { setError(requestError.message); }
        finally { setSessionBusy(false); }
    };

    const submitSale = async () => {
        if (!selectedCustomer && paymentStatus !== 'Paid') return setError('Choose a customer for partial or due sales.');
        if (paymentMethod === 'Cash' && paymentStatus === 'Paid' && Number(amountReceived || 0) < totals.grandTotal) return setError(`Cash received is short by ${money(totals.grandTotal - Number(amountReceived || 0), currency)}.`);
        if (hasStockIssue) return setError('Cart quantity exceeds available stock.');
        setSubmitting(true); setError('');
        const payload = { client_reference: makeReference(), branch_id: branchId, cash_session_id: session.id, customer_id: selectedCustomer?.id || null, payment_method: paymentMethod, payment_status: selectedCustomer ? paymentStatus : 'Paid', amount_received: paymentMethod === 'Cash' ? Number(amountReceived || 0) : (paymentStatus === 'Paid' ? totals.grandTotal : 0), sale_date: new Date().toISOString(), items: cart.map((line) => ({ product_id: line.product.id, product_unit_id: line.unit.id, quantity: Number(line.quantity), foc_quantity: Number(line.foc_quantity || 0), foc_product_unit_id: line.foc_unit_id || line.unit.id, unit_price: unitPrice(line.unit, line.price_type), price_type: line.price_type, tax_rate: Number(line.product.tax_rate || 0) })) };
        const receiptItems = cart.map((line) => ({ product: { name: line.product.name }, quantity: Number(line.quantity), unit_price: unitPrice(line.unit, line.price_type), total_price: lineValues(line).total }));
        const pending = { ...payload, queued_at: new Date().toISOString(), summary: { grand_total: totals.grandTotal, items_count: cart.length, customer_name: selectedCustomer?.name || 'Walk-in customer' } };
        try {
            if (!online) throw new ApiError('Offline');
            const result = await apiRequest('/sync/sales', { token, method: 'POST', json: { sales: [payload] } });
            if (result.failed?.length) throw new ApiError(flattenErrors(result.failed[0].errors) || 'Sale could not be completed.', 422);
            setReceipt(result.synced?.[0]?.record || { ...pending, grand_total: totals.grandTotal, items: receiptItems });
            notify('Sale completed successfully.');
        } catch (requestError) {
            if (requestError.status) { setError(requestError.message); setSubmitting(false); return; }
            addPendingSale(pending); setReceipt({ ...pending, grand_total: totals.grandTotal, items: receiptItems }); notify('Sale saved safely and will sync when online.', 'info');
        }
        setCart([]); setSelectedCustomer(null); setPaymentMethod('Cash'); setPaymentStatus('Paid'); setAmountReceived(''); navigateSaleStep('products', { replace: true }); openSaleOverlay('receipt'); setSubmitting(false);
        if (online) loadRegister();
    };

    return (
        <main className="sale-screen">
            {error && <div className="form-alert form-alert--page" role="alert">{error}<button type="button" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}

            {mobileStep === 'products' && <><section className={`shift-strip ${session ? 'shift-strip--open' : ''}`}><span className="shift-strip__icon"><Icon name="cash" size={21} /></span><div><strong>{session ? 'Shift open' : 'Shift not started'}</strong><small>{session ? `Since ${formatDate(session.opened_at)} · ${money(session.total_sales, currency)} sales` : 'Enter your opening cash to begin'}</small></div><button type="button" onClick={() => { setError(''); setSessionOpen(true); }}>{session ? 'Manage' : 'Start shift'}</button></section><section className="catalog-section"><div className="price-mode"><span>Price mode</span><div><button type="button" className={salePriceType === 'retail' ? 'active' : ''} onClick={() => changePriceType('retail')}>Retail</button><button type="button" className={salePriceType === 'wholesale' ? 'active' : ''} onClick={() => changePriceType('wholesale')}>Wholesale</button></div></div><div className="search-box search-box--large"><Icon name="search" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); scanBarcode(query); } }} placeholder="Scan barcode or search medicine" autoComplete="off" />{query && <button type="button" onClick={() => setQuery('')}><Icon name="close" size={18} /></button>}</div><div className="section-heading"><div><h2>Products</h2><p>{loadingProducts ? 'Finding stock…' : `${products.length} available results`}</p></div>{!online && <span className="muted-badge">Cached stock</span>}</div>{loadingProducts && !products.length ? <SkeletonList count={5} /> : products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} unitId={selectedUnits[product.id]} onUnitChange={(id, unitId) => setSelectedUnits((current) => ({ ...current, [id]: unitId }))} onAdd={addProduct} currency={currency} priceType={salePriceType} />)}</div> : <EmptyState icon="search" title="No products found">Try a different medicine name or barcode.</EmptyState>}</section>{cart.length > 0 && <button className="cart-dock" type="button" onClick={() => navigateSaleStep('cart')} aria-label={`View cart with ${cart.length} products`}><span className="cart-dock__count">{cart.length}</span><span><small>{totals.quantity} items</small><strong>View cart</strong></span><b>{money(totals.grandTotal, currency)}</b><Icon name="chevron" size={19} /></button>}</>}

            {mobileStep === 'cart' && <section className="sale-stage"><div className="section-heading"><div><h2>Current sale</h2><p>{cart.length} product{cart.length === 1 ? '' : 's'} · {salePriceType} pricing</p></div><button type="button" onClick={() => window.history.back()}><Icon name="plus" size={17} /> Add items</button></div><div className="cart-lines">{cart.map((line) => <CartLine key={line.id} line={line} onChange={(patch) => changeLine(line.id, patch)} onRemove={() => removeLine(line.id)} currency={currency} />)}</div><div className="totals-card"><div><span>Subtotal</span><b>{money(totals.subtotal, currency)}</b></div>{totals.discount > 0 && <div className="discount-row"><span>Product savings</span><b>−{money(totals.discount, currency)}</b></div>}<div><span>Tax</span><b>{money(totals.tax, currency)}</b></div><div className="totals-card__grand"><span>Grand total</span><b>{money(totals.grandTotal, currency)}</b></div></div>{hasStockIssue && <div className="form-alert">Cart quantity exceeds available stock.</div>}<div className="stage-actions"><button className="button button--ghost" type="button" onClick={() => window.history.back()}>Products</button><button className="button button--primary" type="button" disabled={hasStockIssue} onClick={startCheckout}>Checkout <Icon name="chevron" size={18} /></button></div></section>}

            {mobileStep === 'checkout' && <section className="sale-stage checkout-stage"><div className="section-heading"><div><h2>Final checkout</h2><p>{cart.length} product{cart.length === 1 ? '' : 's'} in this sale</p></div><button type="button" onClick={() => window.history.back()}><Icon name="arrow" size={17} /> Back to cart</button></div><div className="amount-hero"><span>Amount to pay</span><strong>{money(totals.grandTotal, currency)}</strong></div><button className="selection-card" type="button" onClick={() => setCustomerOpen(true)}><span className="customer-initial">{selectedCustomer?.name?.charAt(0).toUpperCase() || 'W'}</span><span><small>Customer</small><strong>{selectedCustomer?.name || 'Walk-in customer'}</strong></span><span className="change-label">Change</span></button>{selectedCustomer && <div className="checkout-section"><label>Payment status</label><div className="segmented segmented--three">{['Paid', 'Partial', 'Due'].map((status) => <button type="button" className={paymentStatus === status ? 'active' : ''} key={status} onClick={() => setPaymentStatus(status)}>{status}</button>)}</div></div>}{!selectedCustomer && <p className="checkout-hint">Partial and Due are available after selecting a customer.</p>}<div className="checkout-section"><label>Payment method</label><div className="segmented">{['Cash', 'Card', 'Mobile', 'Wallet'].map((method) => <button type="button" className={paymentMethod === method ? 'active' : ''} key={method} onClick={() => { setPaymentMethod(method); setAmountReceived(method === 'Cash' ? totals.grandTotal.toFixed(2) : '0'); }}>{method}</button>)}</div></div>{paymentMethod === 'Cash' && <label className="field cash-field"><span>Cash received</span><input type="number" inputMode="decimal" min="0" step="0.01" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} /><small>Change: <b>{money(Math.max(Number(amountReceived || 0) - totals.grandTotal, 0), currency)}</b></small></label>}{!online && <div className="offline-checkout-note"><Icon name="sync" size={19} /><span><strong>This sale will be queued</strong><small>It will sync automatically when this device reconnects.</small></span></div>}<div className="stage-actions"><button className="button button--ghost" type="button" onClick={() => window.history.back()} disabled={submitting}>Back</button><button className="button button--primary" type="button" onClick={submitSale} disabled={submitting || hasStockIssue}>{submitting ? <span className="spinner" /> : <Icon name={online ? 'check' : 'sync'} size={20} />}{submitting ? 'Completing…' : online ? 'Complete sale' : 'Save offline'}</button></div></section>}

            <Modal open={customerOpen} title="Choose customer" onClose={() => setCustomerOpen(false)}><CustomerChooser token={token} selected={selectedCustomer} online={online} onSelect={(customer) => { setSelectedCustomer(customer); if (!customer) setPaymentStatus('Paid'); setCustomerOpen(false); }} /></Modal>
            <Modal open={sessionOpen} title={session ? 'Close this shift' : 'Start cashier shift'} onClose={() => !sessionBusy && setSessionOpen(false)} footer={<><button type="button" className="button button--ghost" onClick={() => setSessionOpen(false)} disabled={sessionBusy}>Cancel</button><button form="shift-form" className={`button ${session ? 'button--danger' : 'button--primary'}`} disabled={sessionBusy || !online}>{sessionBusy ? 'Saving…' : session ? 'Close shift' : 'Start shift'}</button></>}>
                {session && <div className="session-report">
                    <div className="shift-metrics"><div><span>Opening cash</span><b>{money(session.opening_balance, currency)}</b></div><div><span>Net cash</span><b>{money(session.net_cash_sales, currency)}</b></div><div><span>Expected cash</span><b>{money(session.expected_closing, currency)}</b></div></div>
                    <span className="session-report__label">Sales by payment method</span>
                    <div className="payment-breakdown"><div><span>Cash</span><b>{money(session.cash_sales_total, currency)}</b></div><div><span>Card</span><b>{money(session.card_sales_total, currency)}</b></div><div><span>Mobile</span><b>{money(session.mobile_sales_total, currency)}</b></div><div><span>Wallet</span><b>{money(session.wallet_sales_total, currency)}</b></div></div>
                    <div className="session-sales-total"><span>Total sales <small>{session.sale_count || 0} receipts</small></span><b>{money(session.total_sales, currency)}</b></div>
                </div>}
                <form id="shift-form" className="form-stack" onSubmit={updateSession}><label className="field"><span>{session ? 'Counted cash' : 'Opening cash'}</span><input type="number" min="0" step="0.01" inputMode="decimal" value={sessionForm.amount} onChange={(event) => setSessionForm({ ...sessionForm, amount: event.target.value })} required /></label><label className="field"><span>Notes <i>optional</i></span><textarea rows="3" value={sessionForm.notes} onChange={(event) => setSessionForm({ ...sessionForm, notes: event.target.value })} /></label>{!online && <div className="form-alert">Connect to manage your shift.</div>}</form>
            </Modal>
            {receipt && <Receipt sale={receipt} settings={settings} currency={currency} onClose={() => setReceipt(null)} />}
        </main>
    );
}

export { calculateTotals, syncPendingSales };
