import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Block as VoidIcon,
    Search as SearchIcon,
    Receipt as SalesIcon,
    FilterAlt as FilterIcon,
    Print as PrintIcon,
} from '@mui/icons-material';

export default function SalesIndex({ auth, sales, branches, salesStaff = [], filters }) {
    const { settings = {}, ziggy = {}, translations = {}, errors = {} } = usePage().props;
    const __ = (key) => translations[key] || key;
    const appBase = ziggy?.base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const [branchId, setBranchId] = useState(filters?.branch_id || auth.user?.current_branch_id || '');
    
    // Default to current month
    const defaultFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const defaultTo = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    const [fromDate, setFromDate] = useState(filters?.from_date || defaultFrom);
    const [toDate, setToDate] = useState(filters?.to_date || defaultTo);
    const [search, setSearch] = useState(filters?.search || '');
    const [saleStaffId, setSaleStaffId] = useState(filters?.sale_staff_id || '');
    const [quickRange, setQuickRangeState] = useState(filters?.from_date === defaultFrom && filters?.to_date === defaultTo ? 'month' : '');
    const [voidingSale, setVoidingSale] = useState(null);
    const [voidReason, setVoidReason] = useState('');

    const setQuickRange = (range) => {
        setQuickRangeState(range);
        const today = new Date();
        let from = new Date();
        let to = new Date();

        switch (range) {
            case 'today':
                from = today;
                to = today;
                break;
            case 'month':
                from = new Date(today.getFullYear(), today.getMonth(), 1);
                to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'year':
                from = new Date(today.getFullYear(), 0, 1);
                to = new Date(today.getFullYear(), 11, 31);
                break;
            case 'all':
                from = new Date(2000, 0, 1); // Far past
                to = new Date(2100, 11, 31); // Far future
                break;
            default:
                return;
        }

        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0];
        
        setFromDate(fromStr);
        setToDate(toStr);

        // Auto-apply after selecting quick range
        router.get(
            route('sales.index'),
            {
                branch_id: branchId || undefined,
                sale_staff_id: saleStaffId || undefined,
                from_date: fromStr,
                to_date: toStr,
                search: search || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const totalGrand = useMemo(() => {
        return (sales || []).reduce((sum, s) => {
            if ((s.status || 'Completed') === 'Voided') return sum;
            return sum + Number(s.grand_total || 0);
        }, 0);
    }, [sales]);

    const voidedCount = useMemo(() => {
        return (sales || []).filter((s) => (s.status || 'Completed') === 'Voided').length;
    }, [sales]);

    const applyFilters = () => {
        router.get(
            route('sales.index'),
            {
                branch_id: branchId || undefined,
                sale_staff_id: saleStaffId || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                search: search || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const clearFilters = () => {
        const today = new Date().toISOString().split('T')[0];
        setSearch('');
        setFromDate(today);
        setToDate(today);
        setBranchId(auth.user?.current_branch_id || '');
        setSaleStaffId('');
        router.get(route('sales.index'));
    };

    const openVoidDialog = (sale) => {
        setVoidingSale(sale);
        setVoidReason('');
    };

    const closeVoidDialog = () => {
        setVoidingSale(null);
        setVoidReason('');
    };

    const submitVoid = () => {
        if (!voidingSale) return;

        router.post(
            route('sales.void', voidingSale.id),
            { reason: voidReason },
            {
                preserveScroll: true,
                onSuccess: () => closeVoidDialog(),
            }
        );
    };

    const money = (n) => Number(n || 0).toFixed(2);
    const currencySymbol = settings.app?.currency_symbol || '$';
    const pharmacyName = settings.invoice?.pharmacy_name || 'Pharmacy POS';
    const logoUrl = settings.invoice?.logo_path ? withBase(`/storage/${String(settings.invoice.logo_path).replace(/^\/+/, '')}`) : '';
    const receiptHeader = settings.invoice?.receipt_header || '';
    const receiptFooter = settings.invoice?.receipt_footer || '';

    const formatDateTime = (value) => {
        try {
            return new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(value));
        } catch {
            return value;
        }
    };

    const printInvoice = (sale) => {
        const escapeHtml = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        const printWindow = window.open('', '_blank', 'width=520,height=760');
        if (!printWindow) {
            return;
        }

        printWindow.document.write(`
            <!doctype html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>${escapeHtml(sale.invoice_number)}</title>
                <style>
                    @page { size: auto; margin: 10mm; }
                    body { font-family: Arial, sans-serif; color: #111; }
                    .receipt { max-width: 420px; margin: 0 auto; }
                    .center { text-align: center; }
                    .logo { max-width: 120px; max-height: 64px; object-fit: contain; margin-bottom: 8px; }
                    .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
                    .sub { font-size: 12px; color: #555; white-space: pre-wrap; }
                    .line { border-top: 1px dashed #999; margin: 10px 0; }
                    .row { display: flex; justify-content: space-between; font-size: 13px; margin: 4px 0; }
                    .row .label { color: #555; }
                    .row .value { font-weight: 600; }
                    .grand { font-size: 15px; font-weight: 700; }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="center">
                        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="logo" class="logo" />` : ''}
                        <div class="title">${escapeHtml(pharmacyName)}</div>
                        ${receiptHeader ? `<div class="sub">${escapeHtml(receiptHeader)}</div>` : ''}
                    </div>
                    <div class="line"></div>
                    <div class="row"><span class="label">${escapeHtml(__('Invoice'))}</span><span class="value">${escapeHtml(sale.invoice_number || '-')}</span></div>
                    <div class="row"><span class="label">${escapeHtml(__('Status'))}</span><span class="value">${escapeHtml(sale.status || 'Completed')}</span></div>
                    <div class="row"><span class="label">${escapeHtml(__('Date'))}</span><span class="value">${escapeHtml(formatDateTime(sale.sale_date))}</span></div>
                    <div class="row"><span class="label">${escapeHtml(__('Branch'))}</span><span class="value">${escapeHtml(sale.branch?.name || '-')}</span></div>
                    <div class="row"><span class="label">${escapeHtml(__('Cashier'))}</span><span class="value">${escapeHtml(sale.user?.name || '-')}</span></div>
                    <div class="row"><span class="label">${escapeHtml(__('Sale Staff'))}</span><span class="value">${escapeHtml(sale.sale_staff?.name || sale.user?.name || '-')}</span></div>
                    <div class="row"><span class="label">${escapeHtml(__('Customer'))}</span><span class="value">${escapeHtml(sale.customer?.name || '-')}</span></div>
                    <div class="line"></div>
                    <div class="row"><span class="label">${escapeHtml(__('Subtotal'))}</span><span class="value">${currencySymbol}${money(sale.total_amount)}</span></div>
                    <div class="row"><span class="label">${escapeHtml(__('Tax'))}</span><span class="value">${currencySymbol}${money(sale.tax)}</span></div>
                    <div class="row"><span class="label">${escapeHtml(__('Discount'))}</span><span class="value">${currencySymbol}${money(sale.discount)}</span></div>
                    <div class="row grand"><span>${escapeHtml(__('Grand Total'))}</span><span>${currencySymbol}${money(sale.grand_total)}</span></div>
                    <div class="line"></div>
                    <div class="row"><span class="label">${escapeHtml(__('Payment'))}</span><span class="value">${escapeHtml(`${sale.payment_method} / ${sale.payment_status}`)}</span></div>
                    ${receiptFooter ? `<div class="line"></div><div class="center sub">${escapeHtml(receiptFooter)}</div>` : ''}
                </div>
                <script>
                    window.onload = function () { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <MainLayout auth={auth} header="Sale History">
            <Head title="Sale History" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SalesIcon fontSize="small" color="primary" />
                            SALE HISTORY
                        </Typography>
                    </Stack>

                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        <TextField
                            size="small"
                            placeholder="Search invoice or customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />,
                            }}
                            sx={{ flex: '1 1 280px', minWidth: { xs: '100%', sm: 280 } }}
                        />

                        <FormControl size="small" sx={{ flex: '1 1 240px', minWidth: { xs: '100%', sm: 240 } }}>
                            <InputLabel>Branch</InputLabel>
                            <Select value={branchId} label="Branch" onChange={(e) => setBranchId(e.target.value)}>
                                <MenuItem value="">Current Branch</MenuItem>
                                <MenuItem value="all">All Accessible</MenuItem>
                                {branches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>
                                        {b.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flex: '1 1 220px', minWidth: { xs: '100%', sm: 220 } }}>
                            <InputLabel>Sale Staff</InputLabel>
                            <Select value={saleStaffId} label="Sale Staff" onChange={(e) => setSaleStaffId(e.target.value)}>
                                <MenuItem value="">All Staff</MenuItem>
                                {salesStaff.map((member) => (
                                    <MenuItem key={member.id} value={member.id}>
                                        {member.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flex: '1 1 150px', minWidth: { xs: '100%', sm: 150 } }}>
                            <InputLabel>Quick Range</InputLabel>
                            <Select 
                                value={quickRange} 
                                label="Quick Range" 
                                onChange={(e) => setQuickRange(e.target.value)}
                            >
                                <MenuItem value="today">Today</MenuItem>
                                <MenuItem value="month">Current Month</MenuItem>
                                <MenuItem value="year">Current Year</MenuItem>
                                <MenuItem value="all">All Time</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            type="date"
                            label="From"
                            InputLabelProps={{ shrink: true }}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            sx={{ flex: '1 1 170px', minWidth: { xs: '100%', sm: 170 } }}
                        />

                        <TextField
                            size="small"
                            type="date"
                            label="To"
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            sx={{ flex: '1 1 170px', minWidth: { xs: '100%', sm: 170 } }}
                        />

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<FilterIcon fontSize="small" />}
                            onClick={applyFilters}
                            sx={{ minWidth: 120, width: { xs: '100%', sm: 'auto' } }}
                        >
                            Apply
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={clearFilters}
                            sx={{ minWidth: 120, width: { xs: '100%', sm: 'auto' } }}
                        >
                            Reset
                        </Button>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                        <Chip size="small" variant="outlined" label={`Entries: ${(sales || []).length}`} />
                        <Chip size="small" variant="outlined" label={`Active Total: ${money(totalGrand)}`} color="primary" />
                        {voidedCount > 0 && (
                            <Chip size="small" variant="outlined" label={`Voided: ${voidedCount}`} color="error" />
                        )}
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Invoice</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Sale Staff</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Cashier</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">
                                        Total
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">
                                        Tax
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">
                                        Discount
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">
                                        Grand
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(sales || []).map((s) => (
                                    <TableRow key={s.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                                {s.invoice_number}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.branch?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.sale_staff?.name || s.user?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.user?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.customer?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                color={(s.status || 'Completed') === 'Voided' ? 'error' : 'success'}
                                                variant="outlined"
                                                label={s.status || 'Completed'}
                                                sx={{ height: 20, fontSize: 10 }}
                                            />
                                            {(s.status || 'Completed') === 'Voided' && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                    {s.voided_by_user?.name || ''}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{formatDateTime(s.sale_date)}</Typography>
                                        </TableCell>
                                        <TableCell align="right">{money(s.total_amount)}</TableCell>
                                        <TableCell align="right">{money(s.tax)}</TableCell>
                                        <TableCell align="right">{money(s.discount)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                                            {money(s.grand_total)}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.payment_method} / {s.payment_status}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                                                <Tooltip title="Print invoice">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        aria-label={`Print invoice ${s.invoice_number}`}
                                                        onClick={() => printInvoice(s)}
                                                    >
                                                        <PrintIcon fontSize="inherit" />
                                                    </IconButton>
                                                </Tooltip>
                                                {(s.status || 'Completed') !== 'Voided' && (
                                                    <Tooltip title="Void sale">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            aria-label={`Void sale ${s.invoice_number}`}
                                                            onClick={() => openVoidDialog(s)}
                                                        >
                                                            <VoidIcon fontSize="inherit" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {(sales || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={13} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No sales found for selected filters.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            <Dialog open={!!voidingSale} onClose={closeVoidDialog} maxWidth="xs" fullWidth>
                <DialogTitle>Void Sale</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                {voidingSale?.invoice_number}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Stock will be restored and this sale will be excluded from sales totals.
                            </Typography>
                        </Box>
                        {errors.void && (
                            <Typography variant="body2" color="error">
                                {errors.void}
                            </Typography>
                        )}
                        <TextField
                            label="Void reason"
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            multiline
                            minRows={3}
                            fullWidth
                            required
                            error={!!errors.reason}
                            helperText={errors.reason}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeVoidDialog} size="small">
                        Cancel
                    </Button>
                    <Button
                        onClick={submitVoid}
                        size="small"
                        variant="contained"
                        color="error"
                        disabled={voidReason.trim().length < 3}
                    >
                        Void Sale
                    </Button>
                </DialogActions>
            </Dialog>
        </MainLayout>
    );
}
