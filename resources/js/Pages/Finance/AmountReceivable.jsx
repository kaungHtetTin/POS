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
    RestartAlt as ResetIcon,
    Search as SearchIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';

export default function AmountReceivable({
    auth,
    branches = [],
    filters = {},
    paymentMethods = ['Cash', 'Card', 'Mobile', 'Wallet'],
    summary = {},
    sales = {},
}) {
    const { translations = {} } = usePage().props;
    const __ = (key) => translations[key] || key;
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status ?? 'all');
    const [paymentMethod, setPaymentMethod] = useState(filters.payment_method ?? 'all');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');
    const [minAmount, setMinAmount] = useState(filters.min_amount ?? '');
    const [maxAmount, setMaxAmount] = useState(filters.max_amount ?? '');
    const [sort, setSort] = useState(filters.sort ?? 'oldest');
    const [search, setSearch] = useState(filters.search ?? '');
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [receiveSale, setReceiveSale] = useState(null);

    const {
        data: receiveData,
        setData: setReceiveData,
        post,
        processing,
        errors,
        reset,
    } = useForm({
        amount: '',
        payment_method: 'Cash',
    });

    const rows = sales?.data || [];

    const money = (value) => Number(value || 0).toFixed(2);

    const formatDate = (value) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    };

    const filterPayload = (page = undefined) => ({
        branch_id: branchId || undefined,
        payment_status: paymentStatus || undefined,
        payment_method: paymentMethod || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        min_amount: minAmount || undefined,
        max_amount: maxAmount || undefined,
        sort: sort || undefined,
        search: search || undefined,
        page,
    });

    const applyFilters = (page = undefined) => {
        router.get(route('finance.amount-receivable'), filterPayload(page), {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaultBranch = auth.user?.current_branch_id || '';
        setBranchId(defaultBranch);
        setPaymentStatus('all');
        setPaymentMethod('all');
        setFromDate('');
        setToDate('');
        setMinAmount('');
        setMaxAmount('');
        setSort('oldest');
        setSearch('');
        router.get(route('finance.amount-receivable'));
    };

    const handleSearchKey = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyFilters();
        }
    };

    const openReceiveDialog = (sale) => {
        setReceiveSale(sale);
        reset();
        setReceiveData({
            amount: Number(sale.receivable_amount || 0).toFixed(2),
            payment_method: sale.payment_method || 'Cash',
        });
        setReceiveOpen(true);
    };

    const closeReceiveDialog = () => {
        setReceiveOpen(false);
        setReceiveSale(null);
        reset();
    };

    const submitReceive = (event) => {
        event.preventDefault();
        if (!receiveSale) return;

        post(route('finance.amount-receivable.receive', { sale: receiveSale.id }), {
            preserveScroll: true,
            onSuccess: () => closeReceiveDialog(),
        });
    };

    const summaryCards = useMemo(() => ([
        ['Receivable Sales', summary.sale_count || 0],
        ['Customers', summary.customer_count || 0],
        ['Amount Receivable', `$${money(summary.receivable_amount)}`],
        ['Original Sales', `$${money(summary.grand_total)}`],
        ['Collected So Far', `$${money(summary.received_amount)}`],
        ['Average Receivable', `$${money(summary.average_receivable)}`],
    ]), [summary]);

    return (
        <MainLayout auth={auth} header={__('Amount Receivable')}>
            <Head title={__('Amount Receivable')} />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {__('Finance')}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>
                            {__('Amount Receivable')}
                        </Typography>
                    </Box>
                    <Chip icon={<BalanceIcon />} label={`${__('Receivable')} ${money(summary.receivable_amount)}`} color="warning" variant="outlined" sx={{ height: 36, alignSelf: { xs: 'flex-start', md: 'center' } }} />
                </Stack>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <FilterIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('CUSTOMER RECEIVABLE FILTERS')}</Typography>
                    </Stack>

                    <ReportFilterToolbar
                        ariaLabel={__('Customer receivable filters')}
                        fieldKinds={['wide', 'select', 'select', 'date', 'date', 'amount', 'amount', 'select', 'search']}
                        onSubmit={() => applyFilters()}
                        actions={(
                            <>
                                <Button variant="contained" size="small" startIcon={<FilterIcon />} type="submit">{__('Apply')}</Button>
                                <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>{__('Reset')}</Button>
                                <CsvExportButton source={sales} dataKey="sales" filename="amount-receivable.csv" />
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
                            <InputLabel>{__('Status')}</InputLabel>
                            <Select value={paymentStatus} label={__('Status')} onChange={(event) => setPaymentStatus(event.target.value)}>
                                <MenuItem value="all">{__('All unpaid')}</MenuItem>
                                <MenuItem value="Due">{__('Due')}</MenuItem>
                                <MenuItem value="Partial">{__('Partial')}</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' }, minWidth: 0 }}>
                            <InputLabel>{__('Method')}</InputLabel>
                            <Select value={paymentMethod} label={__('Method')} onChange={(event) => setPaymentMethod(event.target.value)}>
                                <MenuItem value="all">{__('All methods')}</MenuItem>
                                {paymentMethods.map((method) => (
                                    <MenuItem key={method} value={method}>{__(method)}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            type="date"
                            label={__('Sale From')}
                            value={fromDate}
                            onChange={(event) => setFromDate(event.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' } }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label={__('Sale To')}
                            value={toDate}
                            onChange={(event) => setToDate(event.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' } }}
                        />
                        <TextField
                            size="small"
                            type="number"
                            label={__('Min Amount')}
                            value={minAmount}
                            onChange={(event) => setMinAmount(event.target.value)}
                            inputProps={{ min: 0, step: '0.01' }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 140px' } }}
                        />
                        <TextField
                            size="small"
                            type="number"
                            label={__('Max Amount')}
                            value={maxAmount}
                            onChange={(event) => setMaxAmount(event.target.value)}
                            inputProps={{ min: 0, step: '0.01' }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 140px' } }}
                        />
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 1 150px' }, minWidth: 0 }}>
                            <InputLabel>{__('Sort')}</InputLabel>
                            <Select value={sort} label={__('Sort')} onChange={(event) => setSort(event.target.value)}>
                                <MenuItem value="oldest">{__('Oldest sale')}</MenuItem>
                                <MenuItem value="newest">{__('Newest sale')}</MenuItem>
                                <MenuItem value="highest">{__('Highest due')}</MenuItem>
                                <MenuItem value="lowest">{__('Lowest due')}</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            label={__('Search')}
                            placeholder={__('Invoice, customer, phone, email')}
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
                        <BalanceIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('AMOUNT RECEIVABLE LIST')}</Typography>
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Sale Date')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Invoice')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Customer')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Branch')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">{__('Total')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">{__('Collected')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">{__('Need To Collect')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">{__('Status')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">{__('Actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((sale) => (
                                    <TableRow key={sale.id} hover>
                                        <TableCell>{formatDate(sale.sale_date)}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{sale.invoice_number}</Typography>
                                            <Typography variant="caption" color="text.secondary">{sale.payment_method}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {sale.customer?.id ? (
                                                <Link href={route('customers.show', { customer: sale.customer.id })}>
                                                    <Typography variant="body2">{sale.customer.name}</Typography>
                                                </Link>
                                            ) : (
                                                <Typography variant="body2">-</Typography>
                                            )}
                                            <Typography variant="caption" color="text.secondary">{sale.customer?.phone || sale.customer?.email || __('No contact')}</Typography>
                                        </TableCell>
                                        <TableCell>{sale.branch?.name || '-'}</TableCell>
                                        <TableCell align="right">${money(sale.grand_total)}</TableCell>
                                        <TableCell align="right">${money(sale.amount_received)}</TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                                                ${money(sale.receivable_amount)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                size="small"
                                                label={__(sale.payment_status)}
                                                color={sale.payment_status === 'Partial' ? 'warning' : 'error'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <Tooltip title={__('Receive payment')}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            onClick={() => openReceiveDialog(sale)}
                                                            disabled={Number(sale.receivable_amount || 0) <= 0}
                                                        >
                                                            <PaymentIcon fontSize="inherit" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                {sale.customer?.id && (
                                                    <Tooltip title={__('View customer')}>
                                                        <IconButton
                                                            component={Link}
                                                            href={route('customers.show', { customer: sale.customer.id })}
                                                            size="small"
                                                            color="primary"
                                                        >
                                                            <ViewIcon fontSize="inherit" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">{__('No customer receivables found for selected filters.')}</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {Number(sales.last_page || 1) > 1 && (
                        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Pagination
                                size="small"
                                count={sales.last_page}
                                page={sales.current_page}
                                onChange={(event, page) => applyFilters(page)}
                                color="primary"
                            />
                        </Stack>
                    )}
                </Paper>
            </Box>

            <Dialog open={receiveOpen} onClose={closeReceiveDialog} maxWidth="sm" fullWidth>
                <form onSubmit={submitReceive}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {__('Receive Customer Payment')}
                        <IconButton size="small" onClick={closeReceiveDialog}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Paper variant="outlined" sx={{ p: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {receiveSale?.invoice_number || '-'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {__('Customer')}: {receiveSale?.customer?.name || '-'} | {__('Need To Collect')}: ${money(receiveSale?.receivable_amount)}
                                </Typography>
                            </Paper>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label={__('Amount')}
                                    type="number"
                                    fullWidth
                                    size="small"
                                    value={receiveData.amount}
                                    onChange={(event) => setReceiveData('amount', event.target.value)}
                                    error={!!errors.amount}
                                    helperText={errors.amount || `${__('Maximum')}: $${money(receiveSale?.receivable_amount)}`}
                                    inputProps={{ min: 0.01, max: Number(receiveSale?.receivable_amount || 0), step: '0.01' }}
                                    required
                                />
                                <TextField
                                    select
                                    label={__('Method')}
                                    fullWidth
                                    size="small"
                                    value={receiveData.payment_method}
                                    onChange={(event) => setReceiveData('payment_method', event.target.value)}
                                    error={!!errors.payment_method}
                                    helperText={errors.payment_method}
                                    required
                                >
                                    {paymentMethods.map((method) => (
                                        <MenuItem key={method} value={method}>{__(method)}</MenuItem>
                                    ))}
                                </TextField>
                            </Stack>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={closeReceiveDialog} size="small">{__('Cancel')}</Button>
                        <Button type="submit" variant="contained" size="small" disabled={processing}>
                            {__('Receive Payment')}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
