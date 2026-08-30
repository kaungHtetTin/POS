import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, Link, router, useForm, usePage } from '@/spa';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Pagination,
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
    AccountBalanceWallet as BalanceIcon,
    Close as CloseIcon,
    FilterAlt as FilterIcon,
    Payment as PaymentIcon,
    ReceiptLong as PurchaseIcon,
    RestartAlt as ResetIcon,
    Search as SearchIcon,
    Visibility as ViewIcon,
    WarningAmber as WarningIcon,
} from '@mui/icons-material';

export default function OutstandingBalance({
    auth,
    branches = [],
    filters = {},
    summary = {},
    purchases = {},
}) {
    const { translations = {} } = usePage().props;
    const __ = (key) => translations[key] || key;
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status ?? 'all');
    const [dueStatus, setDueStatus] = useState(filters.due_status ?? 'all');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');
    const [search, setSearch] = useState(filters.search ?? '');
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentPurchase, setPaymentPurchase] = useState(null);

    const {
        data: paymentData,
        setData: setPaymentData,
        post: postPayment,
        processing: paymentProcessing,
        errors: paymentErrors,
        reset: resetPayment,
    } = useForm({
        supplier_id: '',
        purchase_id: '',
        branch_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'Cash',
        reference_number: '',
        notes: '',
    });

    const canManageInventory = auth.user?.permissions?.includes('manage_inventory');
    const rows = purchases?.data || [];

    const money = (value) => Number(value || 0).toFixed(2);

    const formatDate = (value) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
    };

    const filterPayload = (page = undefined) => ({
        branch_id: branchId || undefined,
        payment_status: paymentStatus || undefined,
        due_status: dueStatus || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: search || undefined,
        page,
    });

    const applyFilters = (page = undefined) => {
        router.get(route('finance.outstanding-balance'), filterPayload(page), {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaultBranch = auth.user?.current_branch_id || '';
        setBranchId(defaultBranch);
        setPaymentStatus('all');
        setDueStatus('all');
        setFromDate('');
        setToDate('');
        setSearch('');
        router.get(route('finance.outstanding-balance'));
    };

    const handleSearchKey = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyFilters();
        }
    };

    const openPaymentDialog = (purchase) => {
        setPaymentPurchase(purchase);
        resetPayment();
        setPaymentData({
            supplier_id: purchase.supplier?.id || '',
            purchase_id: purchase.id,
            branch_id: purchase.branch?.id || auth.user?.current_branch_id || auth.user?.branch_id || '',
            payment_date: new Date().toISOString().split('T')[0],
            amount: Number(purchase.due_amount || 0).toFixed(2),
            payment_method: 'Cash',
            reference_number: '',
            notes: '',
        });
        setPaymentOpen(true);
    };

    const closePaymentDialog = () => {
        setPaymentOpen(false);
        setPaymentPurchase(null);
        resetPayment();
    };

    const submitPayment = (event) => {
        event.preventDefault();
        postPayment(route('supplier-payments.store'), {
            preserveScroll: true,
            onSuccess: () => closePaymentDialog(),
        });
    };

    const statusChip = (purchase) => {
        if (purchase.days_until_due === null || purchase.days_until_due === undefined) {
            return <Chip size="small" label={__('No due date')} variant="outlined" />;
        }

        if (purchase.days_until_due < 0) {
            return <Chip size="small" label={`${Math.abs(purchase.days_until_due)} ${__('days overdue')}`} color="error" variant="outlined" />;
        }

        if (purchase.days_until_due === 0) {
            return <Chip size="small" label={__('Due today')} color="warning" variant="outlined" />;
        }

        return <Chip size="small" label={`${__('Due in')} ${purchase.days_until_due} ${__('days')}`} color="info" variant="outlined" />;
    };

    const summaryCards = useMemo(() => ([
        ['Outstanding Purchases', summary.purchase_count || 0],
        ['Suppliers', summary.supplier_count || 0],
        ['Outstanding Balance', `$${money(summary.due_amount)}`],
        ['Overdue Balance', `$${money(summary.overdue_amount)}`],
        ['Original Total', `$${money(summary.total_amount)}`],
        ['Paid So Far', `$${money(summary.paid_amount)}`],
    ]), [summary]);

    return (
        <MainLayout auth={auth} header={__('Outstanding Balance')}>
            <Head title={__('Outstanding Balance')} />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {__('Finance')}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>
                            {__('Outstanding Balance')}
                        </Typography>
                    </Box>
                    <Chip icon={<BalanceIcon />} label={`${__('Payable')} ${money(summary.due_amount)}`} color="warning" variant="outlined" sx={{ height: 36, alignSelf: { xs: 'flex-start', md: 'center' } }} />
                </Stack>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <WarningIcon fontSize="small" color="warning" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('SUPPLIER PAYABLE FILTERS')}</Typography>
                    </Stack>

                    <ReportFilterToolbar
                        ariaLabel={__('Supplier payable filters')}
                        fieldKinds={['wide', 'select', 'select', 'date', 'date', 'search']}
                        onSubmit={() => applyFilters()}
                        actions={(
                            <>
                                <Button variant="contained" size="small" startIcon={<FilterIcon />} type="submit">{__('Apply')}</Button>
                                <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>{__('Reset')}</Button>
                                <CsvExportButton source={purchases} dataKey="purchases" filename="outstanding-balances.csv" />
                            </>
                        )}
                    >
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '1 1 210px' }, minWidth: 0 }}>
                            <InputLabel>{__('Branch')}</InputLabel>
                            <Select value={branchId} label={__('Branch')} onChange={(event) => setBranchId(event.target.value)}>
                                <MenuItem value="">{__('Current Branch')}</MenuItem>
                                <MenuItem value="all">{__('All Accessible')}</MenuItem>
                                {branches.map((branch) => (
                                    <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' }, minWidth: 0 }}>
                            <InputLabel>{__('Payment')}</InputLabel>
                            <Select value={paymentStatus} label={__('Payment')} onChange={(event) => setPaymentStatus(event.target.value)}>
                                <MenuItem value="all">{__('All unpaid')}</MenuItem>
                                <MenuItem value="Due">{__('Due')}</MenuItem>
                                <MenuItem value="Partial">{__('Partial')}</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 1 170px' }, minWidth: 0 }}>
                            <InputLabel>{__('Due Status')}</InputLabel>
                            <Select value={dueStatus} label={__('Due Status')} onChange={(event) => setDueStatus(event.target.value)}>
                                <MenuItem value="all">{__('All due dates')}</MenuItem>
                                <MenuItem value="overdue">{__('Overdue')}</MenuItem>
                                <MenuItem value="due_today">{__('Due today')}</MenuItem>
                                <MenuItem value="next_7">{__('Next 7 days')}</MenuItem>
                                <MenuItem value="upcoming">{__('Upcoming')}</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            type="date"
                            label={__('Due From')}
                            value={fromDate}
                            onChange={(event) => setFromDate(event.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' } }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label={__('Due To')}
                            value={toDate}
                            onChange={(event) => setToDate(event.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' } }}
                        />
                        <TextField
                            size="small"
                            label={__('Search')}
                            placeholder={__('Invoice, supplier, phone, email')}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={handleSearchKey}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ flex: { xs: '1 1 100%', lg: '2 1 260px' }, minWidth: 0 }}
                        />
                    </ReportFilterToolbar>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(6, 1fr)' }, gap: 1.2 }}>
                        {summaryCards.map(([label, value]) => (
                            <Paper key={label} variant="outlined" sx={{ p: 1.25 }}>
                                <Typography variant="caption" color="text.secondary">{__(label)}</Typography>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{value}</Typography>
                            </Paper>
                        ))}
                    </Box>
                </Paper>

                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <PurchaseIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('SUPPLIER PAYMENT LIST')}</Typography>
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Due Date')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Invoice')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Supplier')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Branch')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">{__('Total')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">{__('Paid')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">{__('Need To Pay')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">{__('Status')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">{__('Actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((purchase) => (
                                    <TableRow key={purchase.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDate(purchase.due_date)}</Typography>
                                            <Typography variant="caption" color="text.secondary">{__('Purchase')}: {formatDate(purchase.purchase_date)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{purchase.invoice_number}</Typography>
                                            <Typography variant="caption" color="text.secondary">{purchase.payments_count} {__('payment records')}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{purchase.supplier?.name || '-'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{purchase.supplier?.phone || purchase.supplier?.email || __('No contact')}</Typography>
                                        </TableCell>
                                        <TableCell>{purchase.branch?.name || '-'}</TableCell>
                                        <TableCell align="right">${money(purchase.total_amount)}</TableCell>
                                        <TableCell align="right">${money(purchase.paid_amount)}</TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                                                ${money(purchase.due_amount)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack spacing={0.5} alignItems="center">
                                                {statusChip(purchase)}
                                                <Chip
                                                    size="small"
                                                    label={__(purchase.payment_status)}
                                                    color={purchase.payment_status === 'Partial' ? 'warning' : 'error'}
                                                    variant="outlined"
                                                />
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center">
                                            {canManageInventory ? (
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Tooltip title={__('Record payment')}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => openPaymentDialog(purchase)}
                                                                disabled={Number(purchase.due_amount || 0) <= 0}
                                                            >
                                                                <PaymentIcon fontSize="inherit" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title={__('View purchase invoice')}>
                                                        <IconButton
                                                            component={Link}
                                                            href={route('purchases.show', { purchase: purchase.id })}
                                                            size="small"
                                                            color="primary"
                                                        >
                                                            <ViewIcon fontSize="inherit" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">{__('No outstanding supplier balances found for selected filters.')}</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {Number(purchases.last_page || 1) > 1 && (
                        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Pagination
                                size="small"
                                count={purchases.last_page}
                                page={purchases.current_page}
                                onChange={(event, page) => applyFilters(page)}
                                color="primary"
                            />
                        </Stack>
                    )}
                </Paper>
            </Box>

            <Dialog open={paymentOpen} onClose={closePaymentDialog} maxWidth="sm" fullWidth>
                <form onSubmit={submitPayment}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {__('Record Supplier Payment')}
                        <IconButton size="small" onClick={closePaymentDialog}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Paper variant="outlined" sx={{ p: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {paymentPurchase?.invoice_number || '-'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {__('Supplier')}: {paymentPurchase?.supplier?.name || '-'} | {__('Due Date')}: {formatDate(paymentPurchase?.due_date)} | {__('Need To Pay')}: ${money(paymentPurchase?.due_amount)}
                                </Typography>
                            </Paper>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label={__('Payment Date')}
                                    type="date"
                                    fullWidth
                                    size="small"
                                    value={paymentData.payment_date}
                                    onChange={(event) => setPaymentData('payment_date', event.target.value)}
                                    error={!!paymentErrors.payment_date}
                                    helperText={paymentErrors.payment_date}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                />
                                <TextField
                                    select
                                    label={__('Method')}
                                    fullWidth
                                    size="small"
                                    value={paymentData.payment_method}
                                    onChange={(event) => setPaymentData('payment_method', event.target.value)}
                                    error={!!paymentErrors.payment_method}
                                    helperText={paymentErrors.payment_method}
                                    required
                                >
                                    <MenuItem value="Cash">{__('Cash')}</MenuItem>
                                    <MenuItem value="Card">{__('Card')}</MenuItem>
                                    <MenuItem value="Mobile">{__('Mobile')}</MenuItem>
                                    <MenuItem value="Wallet">{__('Wallet')}</MenuItem>
                                </TextField>
                            </Stack>
                            <TextField
                                label={__('Amount')}
                                type="number"
                                fullWidth
                                size="small"
                                value={paymentData.amount}
                                onChange={(event) => setPaymentData('amount', event.target.value)}
                                error={!!paymentErrors.amount}
                                helperText={paymentErrors.amount || `${__('Maximum')}: $${money(paymentPurchase?.due_amount)}`}
                                inputProps={{ min: 0.01, max: Number(paymentPurchase?.due_amount || 0), step: '0.01' }}
                                required
                            />
                            <TextField
                                label={__('Reference Number')}
                                fullWidth
                                size="small"
                                value={paymentData.reference_number}
                                onChange={(event) => setPaymentData('reference_number', event.target.value)}
                                error={!!paymentErrors.reference_number}
                                helperText={paymentErrors.reference_number}
                            />
                            <TextField
                                label={__('Notes')}
                                fullWidth
                                size="small"
                                multiline
                                rows={3}
                                value={paymentData.notes}
                                onChange={(event) => setPaymentData('notes', event.target.value)}
                                error={!!paymentErrors.notes}
                                helperText={paymentErrors.notes}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={closePaymentDialog} size="small">{__('Cancel')}</Button>
                        <Button type="submit" variant="contained" size="small" disabled={paymentProcessing}>
                            {__('Save Payment')}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
