import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest, queryString } from './api';
import Icon from './Icons';
import { getPendingSales } from './storage';
import { EmptyState, SkeletonList, flattenErrors, formatDate, money } from './Ui';
import { syncPendingSales } from './SalesScreen';

function SaleDetail({ sale, currency }) {
    const items = sale.items || [];
    return (
        <div className="sale-detail">
            <div className="detail-hero"><span>Grand total</span><strong>{money(sale.grand_total, currency)}</strong><small>{formatDate(sale.sale_date)}</small></div>
            <dl className="detail-grid">
                <div><dt>Customer</dt><dd>{sale.customer?.name || 'Walk-in customer'}</dd></div>
                <div><dt>Payment</dt><dd>{sale.payment_method} · {sale.payment_status}</dd></div>
                <div><dt>Cashier</dt><dd>{sale.cashier?.name || sale.sale_staff?.name || '—'}</dd></div>
                <div><dt>Branch</dt><dd>{sale.branch?.name || '—'}</dd></div>
            </dl>
            <h3>Items</h3>
            <div className="detail-items">
                {items.map((item) => (
                    <div key={item.id}>
                        <span><strong>{item.product?.name || 'Item'}</strong><small>{Number(item.quantity)} {item.unit?.short_name || item.unit?.name || ''}{Number(item.foc_quantity || 0) > 0 ? ` + ${Number(item.foc_quantity)} FOC` : ''}</small></span>
                        <b>{money(item.total_price, currency)}</b>
                    </div>
                ))}
            </div>
            <div className="totals-card totals-card--plain">
                <div><span>Subtotal</span><b>{money(sale.total_amount, currency)}</b></div>
                <div><span>Discount</span><b>−{money(sale.discount, currency)}</b></div>
                <div><span>Tax</span><b>{money(sale.tax, currency)}</b></div>
                <div className="totals-card__grand"><span>Total</span><b>{money(sale.grand_total, currency)}</b></div>
            </div>
        </div>
    );
}

export default function HistoryScreen({ token, online, notify, onViewChange }) {
    const [sales, setSales] = useState([]);
    const [pending, setPending] = useState(() => getPendingSales());
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState('');
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [currency, setCurrency] = useState('$');

    const load = useCallback(async (page = 1) => {
        setPending(getPendingSales());
        if (!online) return;
        setLoading(true);
        setError('');
        try {
            const [result, settings] = await Promise.all([
                apiRequest(`/cashier/sales${queryString({ search: query, page, per_page: 15 })}`, { token }),
                apiRequest('/cashier/receipt-settings', { token }),
            ]);
            setSales(result.data || []);
            setPagination({ current_page: result.current_page || 1, last_page: result.last_page || 1 });
            setCurrency(settings.currency_symbol || '$');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }, [online, query, token]);

    useEffect(() => {
        const timer = window.setTimeout(() => load(1), query ? 300 : 0);
        const onPending = (event) => setPending(event.detail || []);
        window.addEventListener('cashier:pending-sales', onPending);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('cashier:pending-sales', onPending);
        };
    }, [load, query]);

    useEffect(() => {
        onViewChange?.(detail ? 'detail' : 'list');
    }, [detail, onViewChange]);

    useEffect(() => {
        const onBack = (event) => {
            if ((window.location.hash.replace('#', '') || 'sale') === 'history' && event.state?.cashierHistoryView !== 'detail') {
                setDetail(null);
                setDetailLoading(false);
            }
        };
        window.addEventListener('popstate', onBack);
        return () => window.removeEventListener('popstate', onBack);
    }, []);

    const retry = async () => {
        setSyncing(true);
        setError('');
        try {
            const result = await syncPendingSales(token);
            setPending(getPendingSales());
            if (result.synced) notify(`${result.synced} sale${result.synced === 1 ? '' : 's'} synced.`);
            if (result.failed) setError(`${result.failed} sale${result.failed === 1 ? '' : 's'} still need attention.`);
            await load(1);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSyncing(false);
        }
    };

    const showDetail = async (sale) => {
        if (!online) return;
        window.history.pushState({ ...(window.history.state || {}), cashierHistoryView: 'detail' }, '', window.location.href);
        setDetail(sale);
        setDetailLoading(true);
        try {
            setDetail(await apiRequest(`/cashier/sales/${sale.id}`, { token }));
        } catch (requestError) {
            setError(requestError.message);
            setDetail(null);
            if (window.history.state?.cashierHistoryView === 'detail') window.history.back();
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        if (window.history.state?.cashierHistoryView === 'detail') window.history.back();
        else setDetail(null);
    };

    if (detail || detailLoading) {
        return (
            <main className="history-screen history-detail-page">
                <section className="page-stage">
                    <div className="page-stage__heading">
                        <button className="back-link" type="button" onClick={closeDetail}><Icon name="arrow" size={18} /> Sale history</button>
                        <div><span>Receipt details</span><h2>{detail?.invoice_number || 'Loading sale…'}</h2></div>
                    </div>
                    {error && <div className="form-alert form-alert--page">{error}</div>}
                    {detailLoading ? <SkeletonList count={4} /> : <SaleDetail sale={detail} currency={currency} />}
                </section>
            </main>
        );
    }

    return (
        <main className="history-screen">
            <div className="search-box search-box--large"><Icon name="search" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Receipt number or customer" />{query && <button type="button" onClick={() => setQuery('')}><Icon name="close" size={18} /></button>}</div>

            {pending.length > 0 && (
                <section className="pending-panel">
                    <div className="section-heading"><div><h2>Waiting to sync</h2><p>{pending.length} sale{pending.length === 1 ? '' : 's'} stored on this device</p></div><button type="button" onClick={retry} disabled={!online || syncing}><Icon name="sync" size={17} />{syncing ? 'Syncing…' : 'Sync now'}</button></div>
                    <div className="pending-list">
                        {pending.map((sale) => <article key={sale.client_reference}><span className={sale.sync_error ? 'pending-icon pending-icon--error' : 'pending-icon'}><Icon name={sale.sync_error ? 'close' : 'sync'} size={18} /></span><div><strong>{sale.summary?.customer_name || 'Walk-in customer'}</strong><small>{formatDate(sale.queued_at)} · {sale.summary?.items_count || sale.items?.length || 0} items</small>{sale.sync_error && <em>{sale.sync_error}</em>}</div><b>{money(sale.summary?.grand_total, currency)}</b></article>)}
                    </div>
                </section>
            )}

            <section>
                <div className="section-heading"><div><h2>Completed sales</h2><p>{online ? 'Current branch receipts' : 'Connect to refresh server history'}</p></div>{online && <button className="icon-button" type="button" onClick={() => load(pagination.current_page)} aria-label="Refresh"><Icon name="sync" size={18} /></button>}</div>
                {error && <div className="form-alert form-alert--page">{error}</div>}
                {loading ? <SkeletonList count={5} /> : sales.length ? (
                    <div className="sale-list">
                        {sales.map((sale) => (
                            <button type="button" key={sale.id} onClick={() => showDetail(sale)} disabled={!online}>
                                <span className="sale-list__icon"><Icon name="receipt" size={21} /></span>
                                <span><strong>{sale.invoice_number}</strong><small>{formatDate(sale.sale_date)} · {sale.customer?.name || 'Walk-in'}</small><em>{sale.items_count} items · {sale.payment_method}</em></span>
                                <span className="sale-list__total"><b>{money(sale.grand_total, currency)}</b><small className={`status status--${String(sale.payment_status).toLowerCase()}`}>{sale.payment_status}</small></span>
                                <Icon name="chevron" size={17} />
                            </button>
                        ))}
                    </div>
                ) : <EmptyState icon="history" title="No sales to show">Completed receipts for this branch will appear here.</EmptyState>}

                {pagination.last_page > 1 && <div className="pagination"><button type="button" disabled={pagination.current_page <= 1 || loading} onClick={() => load(pagination.current_page - 1)}><Icon name="arrow" size={17} /> Newer</button><span>{pagination.current_page} / {pagination.last_page}</span><button type="button" disabled={pagination.current_page >= pagination.last_page || loading} onClick={() => load(pagination.current_page + 1)}>Older <Icon name="chevron" size={17} /></button></div>}
            </section>

        </main>
    );
}
