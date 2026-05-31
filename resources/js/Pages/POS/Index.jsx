import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PosLayout from '@/Layouts/PosLayout';
import { usePage, Head, useForm, router } from '@inertiajs/react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    PersonAdd as PersonAddIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    QrCodeScanner as ScanIcon,
    Search as SearchIcon,
    ShoppingCartCheckout as CheckoutIcon,
    ViewList as ListViewIcon,
    ViewModule as GridViewIcon,
} from '@mui/icons-material';

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function PosIndex({ auth, paymentMethods, paymentStatuses, posDefaults, activeSession = null, error = null }) {
    const page = usePage();
    const { settings = {}, translations = {}, ziggy = {}, flash = {} } = page.props;
    const pageErrors = page.props?.errors || {};
    const displayError = error || flash?.error || pageErrors?.error;
    const __ = (key) => translations[key] || key;
    const currencySymbol = settings.app?.currency_symbol || '$';
    const appBase = ziggy?.base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const behavior = {
        default_view: posDefaults?.default_view || 'table',
        default_payment_method: posDefaults?.default_payment_method || paymentMethods?.[0] || 'Cash',
        auto_print_receipt: Boolean(posDefaults?.auto_print_receipt ?? settings.pos?.auto_print_receipt),
        barcode_focus: Boolean(posDefaults?.barcode_focus ?? true),
        show_generic_first: Boolean(posDefaults?.show_generic_first),
        receipt_width: Number(posDefaults?.receipt_width ?? settings.pos?.receipt_width ?? 80),
        silent_print: Boolean(posDefaults?.silent_print ?? settings.pos?.silent_print),
        silent_printer_name: String(posDefaults?.silent_printer_name ?? settings.pos?.silent_printer_name ?? '').trim(),
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [scanError, setScanError] = useState('');
    const [resultsView, setResultsView] = useState(behavior.default_view === 'grid' ? 'grid' : 'table');
    const [catalogCategories, setCatalogCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [catalogPage, setCatalogPage] = useState(1);
    const [catalogHasMore, setCatalogHasMore] = useState(false);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [customerSearchInput, setCustomerSearchInput] = useState('');
    const [customerLoading, setCustomerLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '', address: '' });
    const [newCustomerSubmitting, setNewCustomerSubmitting] = useState(false);
    const [newCustomerError, setNewCustomerError] = useState('');
    const [openingAmountInput, setOpeningAmountInput] = useState('0');
    const [closingCountedInput, setClosingCountedInput] = useState('');
    const [closingNotesInput, setClosingNotesInput] = useState('');
    const [sessionSubmitting, setSessionSubmitting] = useState(false);
    const [shiftDialogOpen, setShiftDialogOpen] = useState(!activeSession?.id);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [customerSectionExpanded, setCustomerSectionExpanded] = useState(false);
    const [discountExpanded, setDiscountExpanded] = useState(false);
    const [paymentOptionsExpanded, setPaymentOptionsExpanded] = useState(false);

    const scanBuffer = useRef('');
    const lastScanTime = useRef(0);
    const searchInputRef = useRef(null);
    const silentPrintFallbackRef = useRef(false);

    const { data, setData, post, processing, errors } = useForm({
        customer_id: null,
        discount: 0,
        amount_received: 0,
        payment_method: paymentMethods?.includes(behavior.default_payment_method) ? behavior.default_payment_method : (paymentMethods?.[0] || 'Cash'),
        payment_status: paymentStatuses?.[0] || 'Paid',
        items: [],
    });

    const branchId = auth.user?.current_branch_id || auth.user?.branch_id;
    const branchName = auth.user?.accessible_branches?.find((b) => b.id === branchId)?.name;
    const isOutOfStock = (product) => Number(product?.stock_quantity ?? 0) <= 0;
    const getProductDisplayName = (product) => {
        const generic = String(product?.generic_name || '').trim();
        const name = String(product?.name || '').trim();
        if (behavior.show_generic_first && generic) {
            return `${generic}${name ? ` (${name})` : ''}`;
        }
        return name || generic;
    };
    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    useEffect(() => {
        setData('items', cart.map((line) => ({
            product_id: line.product_id,
            unit_id: line.unit_id,
            quantity: line.quantity,
        })));
    }, [cart, setData]);

    useEffect(() => {
        setData('customer_id', selectedCustomer?.id ?? null);
    }, [selectedCustomer, setData]);

    useEffect(() => {
        if (data.payment_method !== 'Cash' && Number(data.amount_received || 0) !== 0) {
            setData('amount_received', 0);
        }
    }, [data.payment_method, data.amount_received, setData]);

    useEffect(() => {
        if (activeSession?.id) {
            setClosingCountedInput(String(Number(activeSession.expected_amount || 0).toFixed(2)));
            setClosingNotesInput('');
        } else {
            setClosingCountedInput('');
            setClosingNotesInput('');
        }
    }, [activeSession?.id, activeSession?.expected_amount]);

    useEffect(() => {
        if (!behavior.barcode_focus) return;
        const t = setTimeout(() => searchInputRef.current?.focus(), 150);
        return () => clearTimeout(t);
    }, [behavior.barcode_focus]);

    const fetchCustomers = useCallback(async (query) => {
        setCustomerLoading(true);
        try {
            const response = await fetch(route('pos.customers', { query: query.trim() || undefined }));
            const list = await response.json();
            setCustomerOptions(Array.isArray(list) ? list : []);
        } catch {
            setCustomerOptions([]);
        } finally {
            setCustomerLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            fetchCustomers(customerSearchInput);
        }, 300);
        return () => clearTimeout(t);
    }, [customerSearchInput, fetchCustomers]);

    const openNewCustomer = () => {
        setNewCustomerForm({ name: '', phone: '', email: '', address: '' });
        setNewCustomerError('');
        setNewCustomerOpen(true);
    };

    const closeNewCustomer = () => {
        setNewCustomerOpen(false);
        setNewCustomerError('');
    };

    const submitNewCustomer = async (e) => {
        e.preventDefault();
        setNewCustomerError('');
        if (!newCustomerForm.name?.trim()) {
            setNewCustomerError(__('Name is required.'));
            return;
        }
        setNewCustomerSubmitting(true);
        try {
            const response = await fetch(route('pos.customers.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(newCustomerForm),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const errors = data?.errors ? Object.values(data.errors).flat() : [];
                const msg = errors.length ? errors.join(' ') : (data?.message || __('Failed to create customer.'));
                setNewCustomerError(msg);
                return;
            }
            setSelectedCustomer(data);
            setCustomerOptions((prev) => (prev.some((c) => c.id === data.id) ? prev : [data, ...prev]));
            closeNewCustomer();
        } catch {
            setNewCustomerError(__('Network error. Please try again.'));
        } finally {
            setNewCustomerSubmitting(false);
        }
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                return;
            }

            const currentTime = Date.now();

            if (currentTime - lastScanTime.current > 100) {
                scanBuffer.current = '';
            }

            lastScanTime.current = currentTime;

            if (e.key === 'Enter') {
                if (scanBuffer.current.length > 3) {
                    handleBarcodeScan(scanBuffer.current);
                    scanBuffer.current = '';
                }
            } else if (e.key.length === 1) {
                scanBuffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const normalizeBarcode = (value) => String(value ?? '').trim().toLowerCase();
    const isLikelyBarcode = (value) => {
        const query = String(value ?? '').trim();
        return query.length >= 3 && !/\s/.test(query);
    };

    const fetchSearch = async (options = {}) => {
        const { autoAddFromBarcode = false, clearInputAfterSearch = false } = options;
        const query = searchQuery.trim();
        setScanError('');

        if (!query) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const response = await fetch(route('pos.products', { query }));
            const data = await response.json();
            const products = Array.isArray(data) ? data : [];
            setSearchResults(products);

            if (autoAddFromBarcode && isLikelyBarcode(query)) {
                const normalizedQuery = normalizeBarcode(query);
                const match = products.find((product) => normalizeBarcode(product?.barcode) === normalizedQuery);
                if (match) {
                    addProductToCart(match);
                }
            }
        } finally {
            setSearchLoading(false);
            if (clearInputAfterSearch) {
                setSearchQuery('');
                if (behavior.barcode_focus) {
                    window.setTimeout(() => searchInputRef.current?.focus(), 0);
                }
            }
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(route('pos.categories'));
            const data = await response.json();
            setCatalogCategories(Array.isArray(data) ? data : []);
        } catch {
            setCatalogCategories([]);
        }
    };

    const fetchCatalog = async ({ categoryId, page, append }) => {
        setScanError('');
        setCatalogLoading(true);
        try {
            const response = await fetch(route('pos.catalog', { category_id: categoryId || null, page, per_page: 60 }));
            const payload = await response.json();
            const items = Array.isArray(payload?.data) ? payload.data : [];
            const meta = payload?.meta || {};
            const hasMore = Number(meta.current_page || 1) < Number(meta.last_page || 1);

            setCatalogHasMore(hasMore);
            setCatalogPage(Number(meta.current_page || page || 1));
            setSearchResults((prev) => (append ? [...prev, ...items] : items));
        } finally {
            setCatalogLoading(false);
        }
    };

    useEffect(() => {
        if (resultsView !== 'grid') return;
        if (catalogCategories.length === 0) {
            fetchCategories();
        }
        fetchCatalog({ categoryId: selectedCategoryId, page: 1, append: false });
    }, [resultsView]);

    useEffect(() => {
        if (resultsView !== 'grid') return;
        fetchCatalog({ categoryId: selectedCategoryId, page: 1, append: false });
    }, [selectedCategoryId]);

    const handleBarcodeScan = async (barcode) => {
        setScanError('');
        try {
            const response = await fetch(route('pos.scan', { barcode }));
            if (!response.ok) {
                setScanError(`${__('Barcode not found')}: ${barcode}`);
                return;
            }
            const product = await response.json();
            addProductToCart(product);
        } catch {
            setScanError(`${__('Barcode scan failed')}: ${barcode}`);
        }
    };

    const addProductToCart = (product) => {
        if (isOutOfStock(product)) {
            setScanError(`${product?.name || __('Product')}: ${__('Out of stock')}`);
            return;
        }

        const units = product?.units || [];
        const preferredUnit = units.find((u) => u.is_base_unit) || units[0];

        if (!preferredUnit) {
            setScanError(__('Selected product has no units configured.'));
            return;
        }

        setCart((prev) => {
            const existingIndex = prev.findIndex(
                (l) => l.product_id === product.id && l.unit_id === preferredUnit.unit_id
            );

            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: Number(updated[existingIndex].quantity || 0) + 1,
                };
                return updated;
            }

            return [
                ...prev,
                {
                    id: makeId(),
                    product_id: product.id,
                    name: getProductDisplayName(product),
                    generic_name: product.generic_name || '',
                    barcode: product.barcode,
                    image_path: product.image_path || null,
                    tax_method: product.tax_method,
                    tax_rate: Number(product.total_tax_rate || 0),
                    stock_quantity: product.stock_quantity || 0,
                    units,
                    unit_id: preferredUnit.unit_id,
                    unit_name: preferredUnit.short_name || preferredUnit.name,
                    conversion_factor: preferredUnit.conversion_factor || 1,
                    unit_price: preferredUnit.selling_price || 0,
                    quantity: 1,
                },
            ];
        });
    };

    const updateCartLine = (id, patch) => {
        setCart((prev) =>
            prev.map((line) => {
                if (line.id !== id) return line;

                const updated = { ...line, ...patch };

                if (patch.unit_id) {
                    const unit = (updated.units || []).find((u) => u.unit_id === patch.unit_id);
                    if (unit) {
                        updated.unit_name = unit.short_name || unit.name;
                        updated.conversion_factor = unit.conversion_factor || 1;
                        updated.unit_price = unit.selling_price || 0;
                    }
                }

                return updated;
            })
        );
    };

    const removeCartLine = (id) => setCart((prev) => prev.filter((l) => l.id !== id));

    const totals = useMemo(() => {
        let totalAmount = 0;
        let tax = 0;

        for (const line of cart) {
            const qty = Number(line.quantity || 0);
            const unitPrice = Number(line.unit_price || 0);
            const rate = Number(line.tax_rate || 0);
            const lineTotal = qty * unitPrice;

            if (line.tax_method === 'Inclusive' && rate > 0) {
                const preTax = lineTotal / (1 + rate / 100);
                totalAmount += preTax;
                tax += lineTotal - preTax;
            } else {
                totalAmount += lineTotal;
                tax += lineTotal * (rate / 100);
            }
        }

        const discount = Math.max(Number(data.discount || 0), 0);
        const grandTotal = Math.max(totalAmount + tax - discount, 0);

        return {
            totalAmount,
            tax,
            discount,
            grandTotal,
        };
    }, [cart, data.discount]);

    const isCashPayment = data.payment_method === 'Cash';
    const amountReceivedValue = Math.max(Number(data.amount_received || 0), 0);
    const changeDueValue = isCashPayment ? Math.max(amountReceivedValue - totals.grandTotal, 0) : 0;
    const cashShortageValue = isCashPayment ? Math.max(totals.grandTotal - amountReceivedValue, 0) : 0;
    const isPaidCashSale = isCashPayment && data.payment_status === 'Paid';
    const hasActiveSession = Boolean(activeSession?.id);
    const activeSessionExpected = Number(activeSession?.expected_amount || 0);
    const activeSessionDifference = activeSession?.difference == null ? null : Number(activeSession.difference || 0);

    const printSaleReceiptBrowser = (receipt) => {
        if (!receipt) return;

        const pharmacyName = settings.invoice?.pharmacy_name || __('Pharmacy POS');
        const headerText = settings.invoice?.receipt_header || '';
        const footerText = settings.invoice?.receipt_footer || '';
        const logoUrl = settings.invoice?.logo_path ? withBase(`/storage/${String(settings.invoice.logo_path).replace(/^\/+/, '')}`) : '';
        const receiptWidth = Number(settings.pos?.receipt_width || 80);
        const saleDate = receipt.sale_date ? new Date(receipt.sale_date).toLocaleString() : new Date().toLocaleString();
        const items = Array.isArray(receipt.items) ? receipt.items : [];

        const itemRows = items.map((item) => {
            const qty = Number(item.quantity || 0);
            const total = Number(item.total_price || 0);
            return `
                <tr>
                    <td class="name">${escapeHtml(item.name)}</td>
                    <td class="qty">${qty}</td>
                    <td class="amount">${currencySymbol}${total.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        const printWindow = window.open('', '_blank', 'width=460,height=760');
        if (!printWindow) {
            setScanError('Pop-up blocked. Please allow pop-ups to print invoice.');
            return;
        }

        printWindow.document.write(`
            <!doctype html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>${escapeHtml(receipt.invoice_number || 'Invoice')}</title>
                <style>
                    @page { size: ${receiptWidth}mm auto; margin: 4mm; }
                    body { font-family: Arial, sans-serif; margin: 0; padding: 8px; color: #111; }
                    .receipt { width: ${receiptWidth}mm; max-width: 100%; margin: 0 auto; }
                    .center { text-align: center; }
                    .logo { max-width: 44mm; max-height: 22mm; object-fit: contain; margin-bottom: 6px; }
                    .name { font-size: 15px; font-weight: 700; }
                    .meta, .footer { font-size: 11px; color: #444; white-space: pre-wrap; }
                    .line { border-top: 1px dashed #999; margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { padding: 3px 0; vertical-align: top; }
                    th { border-bottom: 1px solid #999; text-align: left; }
                    .qty, .amount { text-align: right; white-space: nowrap; }
                    .totals { margin-top: 6px; font-size: 12px; }
                    .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
                    .totals .grand { font-weight: 700; font-size: 13px; }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="center">
                        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="logo" class="logo" />` : ''}
                        <div class="name">${escapeHtml(pharmacyName)}</div>
                        ${headerText ? `<div class="meta">${escapeHtml(headerText)}</div>` : ''}
                    </div>
                    <div class="line"></div>
                    <div class="meta">Invoice: ${escapeHtml(receipt.invoice_number || '-')}</div>
                    <div class="meta">Date: ${escapeHtml(saleDate)}</div>
                    <div class="meta">Customer: ${escapeHtml(receipt.customer_name || 'Walk-in')}</div>
                    <div class="meta">Payment: ${escapeHtml(receipt.payment_method || '-')} (${escapeHtml(receipt.payment_status || '-')})</div>
                    <div class="line"></div>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th class="qty">Qty</th>
                                <th class="amount">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRows}
                        </tbody>
                    </table>
                    <div class="line"></div>
                    <div class="totals">
                        <div class="row"><span>Subtotal</span><span>${currencySymbol}${Number(receipt.subtotal || 0).toFixed(2)}</span></div>
                        <div class="row"><span>Tax</span><span>${currencySymbol}${Number(receipt.tax || 0).toFixed(2)}</span></div>
                        <div class="row"><span>Discount</span><span>${currencySymbol}${Number(receipt.discount || 0).toFixed(2)}</span></div>
                        <div class="row grand"><span>Grand Total</span><span>${currencySymbol}${Number(receipt.grand_total || 0).toFixed(2)}</span></div>
                        ${Number(receipt.amount_received || 0) > 0 ? `<div class="row"><span>Cash Received</span><span>${currencySymbol}${Number(receipt.amount_received || 0).toFixed(2)}</span></div>` : ''}
                        ${Number(receipt.amount_received || 0) > 0 ? `<div class="row"><span>Change</span><span>${currencySymbol}${Number(receipt.change_due || 0).toFixed(2)}</span></div>` : ''}
                    </div>
                    ${footerText ? `<div class="line"></div><div class="center footer">${escapeHtml(footerText)}</div>` : ''}
                </div>
                <script>
                    window.onload = function () {
                        window.print();
                        setTimeout(function () { window.close(); }, 300);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const loadQzTrayScript = async () => {
        if (window.qz) {
            return window.qz;
        }

        const scriptCandidates = [
            'https://localhost:8181/qz-tray.js',
            'http://localhost:8182/qz-tray.js',
            'https://cdn.jsdelivr.net/npm/qz-tray/qz-tray.js',
        ];
        const failures = [];

        for (const src of scriptCandidates) {
            try {
                await new Promise((resolve, reject) => {
                    const existing = document.querySelector(`script[data-qz-src="${src}"]`);
                    if (existing) {
                        existing.addEventListener('load', () => resolve(), { once: true });
                        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = src;
                    script.async = true;
                    script.dataset.qzSrc = src;
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error(`Failed to load ${src}`));
                    document.head.appendChild(script);
                });

                if (window.qz) {
                    return window.qz;
                }
                failures.push(`${src}: loaded but window.qz was not found`);
            } catch {
                failures.push(`${src}: blocked or unreachable`);
                // Try next source.
            }
        }

        const detail = failures.length ? ` ${failures.join(' | ')}` : '';
        throw new Error(`QZ Tray bridge is not available.${detail}`);
    };

    const connectQzTray = async () => {
        const qz = await loadQzTrayScript();

        if (!window.__qzUnsignedConfigured && qz?.security) {
            // Development-friendly setup: local unsigned jobs.
            qz.security.setCertificatePromise((resolve) => resolve());
            qz.security.setSignaturePromise(() => (resolve) => resolve());
            window.__qzUnsignedConfigured = true;
        }

        if (!qz.websocket.isActive()) {
            await qz.websocket.connect({ retries: 2, delay: 1 });
        }

        return qz;
    };

    const buildThermalReceiptText = (receipt) => {
        const receiptWidth = Number(settings.pos?.receipt_width || behavior.receipt_width || 80);
        const lineWidth = receiptWidth <= 58 ? 32 : 48;
        const divider = '-'.repeat(lineWidth);
        const padRight = (text, len) => String(text ?? '').slice(0, len).padEnd(len, ' ');
        const padLeft = (text, len) => String(text ?? '').slice(0, len).padStart(len, ' ');

        const pharmacyName = settings.invoice?.pharmacy_name || __('Pharmacy POS');
        const saleDate = receipt.sale_date ? new Date(receipt.sale_date).toLocaleString() : new Date().toLocaleString();
        const items = Array.isArray(receipt.items) ? receipt.items : [];

        const rows = [
            String(pharmacyName),
            divider,
            `Invoice: ${receipt.invoice_number || '-'}`,
            `Date: ${saleDate}`,
            `Customer: ${receipt.customer_name || 'Walk-in'}`,
            `Payment: ${receipt.payment_method || '-'} (${receipt.payment_status || '-'})`,
            divider,
        ];

        items.forEach((item) => {
            const itemName = String(item.name || 'Item');
            const qty = Number(item.quantity || 0);
            const total = Number(item.total_price || 0);
            rows.push(itemName.slice(0, lineWidth));
            rows.push(`${padRight(`Qty ${qty}`, lineWidth - 12)}${padLeft(`${currencySymbol}${total.toFixed(2)}`, 12)}`);
        });

        rows.push(divider);
        rows.push(`${padRight('Subtotal', lineWidth - 12)}${padLeft(`${currencySymbol}${Number(receipt.subtotal || 0).toFixed(2)}`, 12)}`);
        rows.push(`${padRight('Tax', lineWidth - 12)}${padLeft(`${currencySymbol}${Number(receipt.tax || 0).toFixed(2)}`, 12)}`);
        rows.push(`${padRight('Discount', lineWidth - 12)}${padLeft(`${currencySymbol}${Number(receipt.discount || 0).toFixed(2)}`, 12)}`);
        rows.push(`${padRight('Grand Total', lineWidth - 12)}${padLeft(`${currencySymbol}${Number(receipt.grand_total || 0).toFixed(2)}`, 12)}`);
        if (Number(receipt.amount_received || 0) > 0) {
            rows.push(`${padRight('Cash Received', lineWidth - 12)}${padLeft(`${currencySymbol}${Number(receipt.amount_received || 0).toFixed(2)}`, 12)}`);
            rows.push(`${padRight('Change', lineWidth - 12)}${padLeft(`${currencySymbol}${Number(receipt.change_due || 0).toFixed(2)}`, 12)}`);
        }

        if (settings.invoice?.receipt_footer) {
            rows.push(divider);
            rows.push(String(settings.invoice.receipt_footer));
        }

        // Add feed + full cut command for most ESC/POS printers.
        return `${rows.join('\n')}\n\n\n\x1dV\x41\x10`;
    };

    const printSaleReceiptSilent = async (receipt) => {
        if (!behavior.silent_print) {
            return false;
        }

        const printerName = behavior.silent_printer_name;
        if (!printerName) {
            throw new Error('Silent print is enabled but QZ printer name is empty.');
        }

        const qz = await connectQzTray();
        const config = qz.configs.create(printerName);
        const payload = buildThermalReceiptText(receipt);
        await qz.print(config, [{ type: 'raw', format: 'plain', data: payload }]);
        return true;
    };

    const printSaleReceipt = async (receipt) => {
        if (!receipt) return;

        if (behavior.silent_print) {
            try {
                const printed = await printSaleReceiptSilent(receipt);
                if (printed) {
                    return;
                }
            } catch (error) {
                // Fall back to browser print when QZ tray is unavailable/misconfigured.
                const reason = error?.message ? ` (${error.message})` : '';
                silentPrintFallbackRef.current = true;
                setScanError(`Silent print failed${reason}. Falling back to browser print.`);
            }
        }

        printSaleReceiptBrowser(receipt);
    };

    const submit = (e) => {
        e.preventDefault();
        if (!hasActiveSession) {
            setScanError(__('Open cashier session before completing sale.'));
            return;
        }
        silentPrintFallbackRef.current = false;
        post(route('pos.checkout'), {
            preserveScroll: true,
            onSuccess: async (page) => {
                const receipt = page?.props?.flash?.sale_receipt;
                if (receipt && behavior.auto_print_receipt) {
                    await printSaleReceipt(receipt);
                }
                setCart([]);
                if (resultsView === 'table') {
                    setSearchResults([]);
                    setSearchQuery('');
                }
                if (!silentPrintFallbackRef.current) {
                    setScanError('');
                }
                setSelectedCustomer(null);
                setCustomerSearchInput('');
                setData('customer_id', null);
                setData('discount', 0);
                setData('amount_received', 0);
                setData('payment_method', paymentMethods?.includes(behavior.default_payment_method) ? behavior.default_payment_method : (paymentMethods?.[0] || 'Cash'));
                setData('payment_status', paymentStatuses?.[0] || 'Paid');
                setPaymentDialogOpen(false);
                setCustomerSectionExpanded(false);
                setDiscountExpanded(false);
                setPaymentOptionsExpanded(false);
                if (behavior.barcode_focus) {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                }
            },
        });
    };

    const startCashSession = () => {
        const openingAmount = Math.max(Number(openingAmountInput || 0), 0);
        setSessionSubmitting(true);
        router.post(route('pos.session.open'), {
            opening_amount: openingAmount,
        }, {
            preserveScroll: true,
            onSuccess: () => setShiftDialogOpen(false),
            onFinish: () => setSessionSubmitting(false),
            onError: () => setSessionSubmitting(false),
        });
    };

    const closeCashSession = () => {
        const countedAmount = Math.max(Number(closingCountedInput || 0), 0);
        setSessionSubmitting(true);
        router.post(route('pos.session.close'), {
            closing_counted_amount: countedAmount,
            notes: closingNotesInput,
        }, {
            preserveScroll: true,
            onSuccess: () => setShiftDialogOpen(false),
            onFinish: () => setSessionSubmitting(false),
            onError: () => setSessionSubmitting(false),
        });
    };

    const openPaymentDialog = () => {
        if (!hasActiveSession) {
            setShiftDialogOpen(true);
            return;
        }

        if (cart.length > 0) {
            setPaymentDialogOpen(true);
        }
    };

    return (
        <PosLayout header={__('POS Interface')}>
            <Head title="POS" />

            <Box sx={{ p: 2 }}>
                {displayError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {displayError}
                    </Alert>
                )}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }}>
                    <Paper sx={{ p: 2, flex: 1.15, width: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, borderTop: '3px solid', borderTopColor: 'primary.main' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <ScanIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {__('Product Search / Barcode Scan')}
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={resultsView}
                                onChange={(e, next) => {
                                    if (next) setResultsView(next);
                                }}
                            >
                                <ToggleButton value="table">
                                    <ListViewIcon fontSize="small" />
                                </ToggleButton>
                                <ToggleButton value="grid">
                                    <GridViewIcon fontSize="small" />
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <Chip size="small" label={`${__('Branch')}: ${branchName || branchId || '-'}`} variant="outlined" />
                        </Stack>

                        {scanError && (
                            <Alert severity="error" sx={{ mb: 1.5 }}>
                                {scanError}
                            </Alert>
                        )}

                        {resultsView === 'table' ? (
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    inputRef={searchInputRef}
                                    placeholder={__('Search by name, generic name, or barcode...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            fetchSearch({ autoAddFromBarcode: true, clearInputAfterSearch: true });
                                        }
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={fetchSearch}
                                    disabled={searchLoading}
                                    sx={{ minWidth: 110 }}
                                >
                                    {__('Search')}
                                </Button>
                            </Stack>
                        ) : (
                            <Box sx={{ pb: 0.5 }}>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                        gap: 1,
                                    }}
                                >
                                    <Button
                                        variant={selectedCategoryId === '' ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setSelectedCategoryId('')}
                                        sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                                    >
                                        {__('All')}
                                    </Button>
                                    {catalogCategories.map((cat) => (
                                        <Button
                                            key={cat.id}
                                            variant={selectedCategoryId === cat.id ? 'contained' : 'outlined'}
                                            size="small"
                                            onClick={() => setSelectedCategoryId(cat.id)}
                                            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                                        >
                                            {cat.name}
                                        </Button>
                                    ))}
                                </Box>
                                {catalogLoading && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                                        {__('Loading...')}
                                    </Typography>
                                )}
                            </Box>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            {__('RESULTS')}
                        </Typography>

                        {resultsView === 'table' ? (
                            <TableContainer sx={{ mt: 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>{__('Product')}</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>{__('Barcode')}</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                {__('Stock')}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="center">
                                                {__('Add')}
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {searchResults.map((p) => {
                                            const outOfStock = isOutOfStock(p);

                                            return (
                                            <TableRow
                                                key={p.id}
                                                hover
                                                sx={outOfStock ? { bgcolor: 'error.lighter' } : undefined}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {getProductDisplayName(p)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {p.barcode || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 700, color: outOfStock ? 'error.main' : 'inherit' }}
                                                    >
                                                        {p.stock_quantity}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        color={outOfStock ? 'error' : 'primary'}
                                                        onClick={() => addProductToCart(p)}
                                                        disabled={outOfStock}
                                                        title={outOfStock ? __('Out of stock') : __('Add')}
                                                    >
                                                        <AddIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        )})}
                                        {searchResults.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                                                    <Typography variant="body2" color="text.secondary italic">
                                                        {__('Search products or scan a barcode to add items.')}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box
                                sx={{
                                    mt: 1,
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 1.5,
                                }}
                            >
                                {searchResults.map((p) => {
                                    const outOfStock = isOutOfStock(p);
                                    const units = p.units || [];
                                    const preferred = units.find((u) => u.is_base_unit) || units[0];
                                    const price = Number(preferred?.selling_price || 0);
                                    const unitLabel = preferred?.short_name || preferred?.name || '';
                                    const imageUrl = p.image_path ? `/storage/${p.image_path}` : null;

                                    return (
                                        <Card
                                            key={p.id}
                                            variant="outlined"
                                            sx={{
                                                overflow: 'hidden',
                                                borderColor: outOfStock ? 'error.main' : undefined,
                                                bgcolor: outOfStock ? 'error.lighter' : undefined,
                                            }}
                                        >
                                            <CardActionArea onClick={() => addProductToCart(p)} disabled={outOfStock}>
                                                <Box
                                                    sx={{
                                                        height: 120,
                                                        bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.100' : 'rgba(255, 255, 255, 0.06)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {imageUrl ? (
                                                        <Box
                                                            component="img"
                                                            src={imageUrl}
                                                            alt={getProductDisplayName(p)}
                                                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {__('No Image')}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <CardContent sx={{ py: 1.25 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={getProductDisplayName(p)}>
                                                        {getProductDisplayName(p)}
                                                    </Typography>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {unitLabel ? `${__('Unit')}: ${unitLabel}` : __('Unit')}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                                            {currencySymbol}{price.toFixed(2)}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {__('Stock')}
                                                        </Typography>
                                                        {outOfStock ? (
                                                            <Chip
                                                                size="small"
                                                                color="error"
                                                                label={__('Out of stock')}
                                                                sx={{
                                                                    height: 20,
                                                                    '& .MuiChip-label': {
                                                                        px: 0.75,
                                                                        fontSize: '0.68rem',
                                                                        fontWeight: 600,
                                                                    },
                                                                }}
                                                            />
                                                        ) : (
                                                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                                {p.stock_quantity}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    );
                                })}
                                {searchResults.length === 0 && (
                                    <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                                        <Typography variant="body2" color="text.secondary italic" align="center">
                                            {__('Search products or scan a barcode to add items.')}
                                        </Typography>
                                    </Paper>
                                )}
                                {searchResults.length > 0 && catalogHasMore && (
                                    <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            disabled={catalogLoading}
                                            onClick={() => fetchCatalog({ categoryId: selectedCategoryId, page: catalogPage + 1, append: true })}
                                        >
                                            {__('Load more')}
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Paper>

                    <Paper sx={{ p: 2, flex: 1, width: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, borderTop: '3px solid', borderTopColor: hasActiveSession ? 'success.main' : 'warning.main' }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {__('Current Sale')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {cart.length} {cart.length === 1 ? __('item') : __('items')}
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                variant="outlined"
                                color={hasActiveSession ? 'success' : 'warning'}
                                onClick={() => setShiftDialogOpen(true)}
                            >
                                {hasActiveSession ? __('Shift Active') : __('Start Shift')}
                            </Button>
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            {__('Cart')}
                        </Typography>

                        <TableContainer sx={{ minHeight: 260 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                        <TableCell sx={{ fontWeight: 700 }}>{__('Item')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{__('Unit')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">
                                            {__('Qty')}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">
                                            {__('Total')}
                                        </TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {cart.map((line) => {
                                        const qty = Number(line.quantity || 0);
                                        const unitPrice = Number(line.unit_price || 0);
                                        const lineTotal = qty * unitPrice;
                                        const maxQty = Math.floor((Number(line.stock_quantity || 0) || 0) / (Number(line.conversion_factor || 1) || 1));

                                        return (
                                            <TableRow key={line.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {line.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {line.barcode || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        value={line.unit_id}
                                                        onChange={(e) => updateCartLine(line.id, { unit_id: e.target.value })}
                                                        sx={{ minWidth: 120 }}
                                                    >
                                                        {(line.units || []).map((u) => (
                                                            <MenuItem key={u.unit_id} value={u.unit_id}>
                                                                {u.short_name || u.name}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={line.quantity}
                                                        onChange={(e) => updateCartLine(line.id, { quantity: e.target.value })}
                                                        inputProps={{ min: 0.01, step: '0.01' }}
                                                        sx={{ width: 90 }}
                                                        error={maxQty >= 0 && qty > maxQty}
                                                        helperText={maxQty >= 0 && qty > maxQty ? `${__('Max')} ${maxQty}` : ''}
                                                    />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {currencySymbol}{lineTotal.toFixed(2)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" color="error" onClick={() => removeCartLine(line.id)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {cart.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                                                <Typography variant="body2" color="text.secondary italic">
                                                    {__('Cart is empty.')}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    {__('Subtotal')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {currencySymbol}{totals.totalAmount.toFixed(2)}
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    {__('Tax')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {currencySymbol}{totals.tax.toFixed(2)}
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    {__('Discount')}
                                </Typography>
                                {discountExpanded || Number(data.discount || 0) > 0 ? (
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={data.discount}
                                            onChange={(e) => setData('discount', e.target.value)}
                                            InputProps={{
                                                startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>{currencySymbol}</Typography>,
                                            }}
                                            inputProps={{ min: 0, step: '0.01' }}
                                            sx={{ width: 120 }}
                                        />
                                        <Button
                                            size="small"
                                            color="inherit"
                                            onClick={() => {
                                                setData('discount', 0);
                                                setDiscountExpanded(false);
                                            }}
                                        >
                                            {__('Remove')}
                                        </Button>
                                    </Stack>
                                ) : (
                                    <Button size="small" onClick={() => setDiscountExpanded(true)}>
                                        {__('Add discount')}
                                    </Button>
                                )}
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                    {__('Grand Total')}
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
                                    {currencySymbol}{totals.grandTotal.toFixed(2)}
                                </Typography>
                            </Stack>
                        </Stack>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Box>
                            <Stack spacing={1.5}>
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {__('Customer')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                {selectedCustomer?.name || __('Walk-in customer')}
                                            </Typography>
                                        </Box>
                                        <Button size="small" onClick={() => setCustomerSectionExpanded((prev) => !prev)}>
                                            {customerSectionExpanded ? __('Done') : __('Change')}
                                        </Button>
                                    </Stack>
                                    {customerSectionExpanded && (
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start" sx={{ mt: 1 }}>
                                            <Autocomplete
                                                size="small"
                                                fullWidth
                                                options={customerOptions}
                                                value={selectedCustomer}
                                                onChange={(e, value) => setSelectedCustomer(value)}
                                                inputValue={customerSearchInput}
                                                onInputChange={(e, value) => setCustomerSearchInput(value || '')}
                                                getOptionLabel={(option) => (option?.name ?? '') || ''}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.id}>
                                                        <Stack>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {[option.phone, option.email].filter(Boolean).join(' / ') || __('No contact')}
                                                            </Typography>
                                                        </Stack>
                                                    </li>
                                                )}
                                                loading={customerLoading}
                                                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        placeholder={__('Search by name, phone, or email...')}
                                                        size="small"
                                                    />
                                                )}
                                            />
                                            <Button
                                                type="button"
                                                variant="outlined"
                                                size="small"
                                                startIcon={<PersonAddIcon />}
                                                onClick={openNewCustomer}
                                                sx={{ minWidth: 140 }}
                                            >
                                                {__('New customer')}
                                            </Button>
                                        </Stack>
                                    )}
                                </Box>

                                {!hasActiveSession && (
                                    <Alert severity="warning">
                                        {__('Start your shift before completing sales.')}
                                    </Alert>
                                )}

                                {errors.items && (
                                    <Alert severity="error">{errors.items}</Alert>
                                )}

                                <Button
                                    variant="contained"
                                    startIcon={<CheckoutIcon />}
                                    disabled={processing || (hasActiveSession && cart.length === 0)}
                                    fullWidth
                                    onClick={hasActiveSession ? openPaymentDialog : () => setShiftDialogOpen(true)}
                                    sx={{ minHeight: 46, fontWeight: 800, letterSpacing: '0.02em' }}
                                >
                                    {hasActiveSession
                                        ? `${__('Pay')} ${currencySymbol}${totals.grandTotal.toFixed(2)}`
                                        : __('Start Shift')}
                                </Button>
                            </Stack>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            <Dialog open={shiftDialogOpen} onClose={() => !sessionSubmitting && setShiftDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {__('Cashier Session')}
                    <IconButton size="small" onClick={() => setShiftDialogOpen(false)} disabled={sessionSubmitting}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.5}>
                        {pageErrors.session && (
                            <Alert severity="error">
                                {pageErrors.session}
                            </Alert>
                        )}

                        {!hasActiveSession ? (
                            <>
                                <Typography variant="body2" color="text.secondary">
                                    {__('Start your shift by entering the cash currently in the drawer.')}
                                </Typography>
                                <TextField
                                    size="small"
                                    fullWidth
                                    type="number"
                                    label={__('Opening Cash')}
                                    value={openingAmountInput}
                                    onChange={(e) => setOpeningAmountInput(e.target.value)}
                                    inputProps={{ min: 0, step: '0.01' }}
                                    InputProps={{
                                        startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>{currencySymbol}</Typography>,
                                    }}
                                />
                            </>
                        ) : (
                            <>
                                <Chip size="small" color="success" label={__('Shift Active')} sx={{ alignSelf: 'flex-start' }} />
                                <Stack spacing={0.75}>
                                    <Typography variant="caption" color="text.secondary">
                                        {__('Opened at')}: {activeSession?.opened_at ? new Date(activeSession.opened_at).toLocaleString() : '-'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {__('Opening')}: {currencySymbol}{Number(activeSession?.opening_amount || 0).toFixed(2)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {__('Cash Received')}: {currencySymbol}{Number(activeSession?.cash_received_total || 0).toFixed(2)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {__('Change Given')}: {currencySymbol}{Number(activeSession?.change_given_total || 0).toFixed(2)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {__('Net Cash Sales')}: {currencySymbol}{Number(activeSession?.net_cash_sales || 0).toFixed(2)}
                                    </Typography>
                                </Stack>
                                <Divider />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {__('Expected Drawer')}: {currencySymbol}{activeSessionExpected.toFixed(2)}
                                </Typography>
                                <TextField
                                    size="small"
                                    fullWidth
                                    type="number"
                                    label={__('Counted Cash')}
                                    value={closingCountedInput}
                                    onChange={(e) => setClosingCountedInput(e.target.value)}
                                    inputProps={{ min: 0, step: '0.01' }}
                                    InputProps={{
                                        startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>{currencySymbol}</Typography>,
                                    }}
                                />
                                <TextField
                                    size="small"
                                    label={__('Closing Notes (optional)')}
                                    value={closingNotesInput}
                                    onChange={(e) => setClosingNotesInput(e.target.value)}
                                />
                                {activeSessionDifference !== null && (
                                    <Typography variant="caption" color={activeSessionDifference === 0 ? 'success.main' : (activeSessionDifference > 0 ? 'warning.main' : 'error.main')}>
                                        {__('Difference')}: {currencySymbol}{activeSessionDifference.toFixed(2)}
                                    </Typography>
                                )}
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShiftDialogOpen(false)} disabled={sessionSubmitting}>
                        {__('Cancel')}
                    </Button>
                    {!hasActiveSession ? (
                        <Button variant="contained" onClick={startCashSession} disabled={sessionSubmitting}>
                            {__('Start Shift')}
                        </Button>
                    ) : (
                        <Button variant="contained" color="warning" onClick={closeCashSession} disabled={sessionSubmitting}>
                            {__('End Shift')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <Dialog open={paymentDialogOpen} onClose={() => !processing && setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
                <Box component="form" onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {__('Payment')}
                        <IconButton size="small" onClick={() => setPaymentDialogOpen(false)} disabled={processing}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={1.5}>
                            <Box sx={{ p: 1.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                        {__('Amount to pay')}
                                    </Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                        {currencySymbol}{totals.grandTotal.toFixed(2)}
                                    </Typography>
                                </Stack>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                    {__('Payment Method')}
                                </Typography>
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    fullWidth
                                    value={data.payment_method}
                                    onChange={(e, next) => {
                                        if (next) setData('payment_method', next);
                                    }}
                                >
                                    {(paymentMethods || []).map((method) => (
                                        <ToggleButton key={method} value={method} sx={{ flex: 1, textTransform: 'none' }}>
                                            {__(method)}
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            </Box>

                            {isCashPayment && (
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        type="number"
                                        label={__('Amount Received')}
                                        value={data.amount_received}
                                        onChange={(e) => setData('amount_received', e.target.value)}
                                        error={!!errors.amount_received || (isPaidCashSale && cashShortageValue > 0)}
                                        helperText={
                                            errors.amount_received
                                            || (isPaidCashSale && cashShortageValue > 0 ? `${__('Need')} ${currencySymbol}${cashShortageValue.toFixed(2)} ${__('more')}` : '')
                                        }
                                        InputProps={{
                                            startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>{currencySymbol}</Typography>,
                                        }}
                                        inputProps={{ min: 0, step: '0.01' }}
                                    />
                                    <TextField
                                        size="small"
                                        fullWidth
                                        label={__('Change')}
                                        value={`${currencySymbol}${changeDueValue.toFixed(2)}`}
                                        InputProps={{ readOnly: true }}
                                    />
                                </Stack>
                            )}

                            <Box>
                                <Button size="small" onClick={() => setPaymentOptionsExpanded((prev) => !prev)}>
                                    {paymentOptionsExpanded ? __('Hide options') : __('More options')}
                                </Button>
                                {paymentOptionsExpanded && (
                                    <TextField
                                        select
                                        size="small"
                                        fullWidth
                                        label={__('Payment Status')}
                                        value={data.payment_status}
                                        onChange={(e) => setData('payment_status', e.target.value)}
                                        error={!!errors.payment_status}
                                        helperText={errors.payment_status}
                                        sx={{ mt: 1 }}
                                    >
                                        {(paymentStatuses || []).map((status) => (
                                            <MenuItem key={status} value={status}>
                                                {__(status)}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            </Box>

                            {errors.items && (
                                <Alert severity="error">{errors.items}</Alert>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button type="button" onClick={() => setPaymentDialogOpen(false)} disabled={processing}>
                            {__('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={<CheckoutIcon />}
                            disabled={processing || cart.length === 0 || !hasActiveSession || (isPaidCashSale && cashShortageValue > 0)}
                        >
                            {__('Complete Sale')}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Dialog open={newCustomerOpen} onClose={closeNewCustomer} maxWidth="sm" fullWidth>
                <form onSubmit={submitNewCustomer}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {__('New customer')}
                        <IconButton size="small" onClick={closeNewCustomer}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 0.5 }}>
                            {newCustomerError && (
                                <Alert severity="error" onClose={() => setNewCustomerError('')}>
                                    {newCustomerError}
                                </Alert>
                            )}
                            <TextField
                                size="small"
                                label={__('Name')}
                                fullWidth
                                value={newCustomerForm.name}
                                onChange={(e) => setNewCustomerForm((p) => ({ ...p, name: e.target.value }))}
                                required
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    size="small"
                                    label={__('Phone')}
                                    fullWidth
                                    value={newCustomerForm.phone}
                                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                                />
                                <TextField
                                    size="small"
                                    label={__('Email')}
                                    fullWidth
                                    type="email"
                                    value={newCustomerForm.email}
                                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, email: e.target.value }))}
                                />
                            </Stack>
                            <TextField
                                size="small"
                                label={__('Address')}
                                fullWidth
                                multiline
                                rows={2}
                                value={newCustomerForm.address}
                                onChange={(e) => setNewCustomerForm((p) => ({ ...p, address: e.target.value }))}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button type="button" size="small" onClick={closeNewCustomer}>
                            {__('Cancel')}
                        </Button>
                        <Button type="submit" variant="contained" size="small" disabled={newCustomerSubmitting}>
                            {newCustomerSubmitting ? __('Creating...') : __('Create & use')}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </PosLayout>
    );
}
