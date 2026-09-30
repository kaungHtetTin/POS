import React, { useMemo, useState } from 'react';
import DataTableFooter from '@/Components/DataTableFooter';
import ClickableTableRow from '@/Components/ClickableTableRow';
import TableRowActions, { TableActionCell, TableActionHead } from '@/Components/TableRowActions';
import MainLayout from '@/Layouts/MainLayout';
import CsvExportButton from '@/Components/CsvExportButton';
import StatCardGrid from '@/Components/StatCardGrid';
import { AppBarActions, AppBarBack } from '@/Components/AppBarPortal';
import { Head, router, useForm, usePage } from '@/spa';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
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
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Close as CloseIcon,
    Payment as PaymentIcon,
    ReceiptLong as PurchaseIcon,
} from '@mui/icons-material';

export default function SupplierShow({ auth, supplier, purchases, duePurchases, payments, statementSummary = {} }) {
    const { settings = {} } = usePage().props;
    const currencySymbol = settings.app?.currency_symbol || '$';
    const [paymentOpen, setPaymentOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        supplier_id: supplier.id,
        purchase_id: '',
        branch_id: auth.user?.current_branch_id || auth.user?.branch_id || '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'Cash',
        reference_number: '',
        notes: '',
    });
    const purchaseRows = purchases?.data || purchases || [];
    const paymentRows = payments?.data || payments || [];

    const money = (value) => `${currencySymbol}${Number(value || 0).toFixed(2)}`;

    const formatDate = (value) => {
        if (!value) return '-';

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return new Intl.DateTimeFormat(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const totals = useMemo(() => {
        return {
            totalPurchases: Number(statementSummary.total_purchases || 0),
            totalDue: Number(statementSummary.total_due || 0),
            totalPayments: Number(statementSummary.total_payments || 0),
        };
    }, [statementSummary]);

    const selectedPurchase = duePurchases.find((purchase) => purchase.id === data.purchase_id);
    const maxPaymentAmount = selectedPurchase ? Number(selectedPurchase.due_amount || 0) : Number(supplier.balance || 0);

    const openPaymentDialog = (purchase = null) => {
        reset();
        setData({
            supplier_id: supplier.id,
            purchase_id: purchase?.id || '',
            branch_id: purchase?.branch_id || auth.user?.current_branch_id || auth.user?.branch_id || '',
            payment_date: new Date().toISOString().split('T')[0],
            amount: purchase ? Number(purchase.due_amount || 0).toFixed(2) : '',
            payment_method: 'Cash',
            reference_number: '',
            notes: '',
        });
        setPaymentOpen(true);
    };

    const closePaymentDialog = () => {
        setPaymentOpen(false);
        reset();
    };

    const submitPayment = (event) => {
        event.preventDefault();
        post(route('supplier-payments.store'), {
            preserveScroll: true,
            onSuccess: () => closePaymentDialog(),
        });
    };

    const statusColor = (status) => status === 'Paid' ? 'success' : status === 'Partial' ? 'warning' : 'error';
    const goToPage = (pageName, page) => {
        router.get(route('suppliers.show', { supplier: supplier.id }), {
            purchases_page: purchases?.current_page,
            payments_page: payments?.current_page,
            [pageName]: page,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <MainLayout auth={auth} header="Supplier Statement">
            <Head title={`${supplier.name} Statement`} />
            <AppBarBack href={route('suppliers.index')} label="Back to Suppliers" />

            <Box sx={{ flexGrow: 1 }}>
                <AppBarActions>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PaymentIcon />}
                        onClick={() => openPaymentDialog()}
                        disabled={Number(supplier.balance || 0) <= 0}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        Record Payment
                    </Button>
                </AppBarActions>

                <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                {supplier.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {supplier.phone || '-'} {supplier.email ? ` / ${supplier.email}` : ''}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {supplier.address || 'No address provided'}
                            </Typography>
                        </Box>
                        <StatCardGrid items={[
                            { label: 'Outstanding', value: money(supplier.balance), tone: 'warning' },
                            { label: 'Purchases', value: money(totals.totalPurchases) },
                            { label: 'Payments', value: money(totals.totalPayments), tone: 'success' },
                        ]} sx={{ mb: 0, minWidth: { md: 560 } }} />
                    </Stack>
                </Paper>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <PurchaseIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                Purchases
                            </Typography>
                        </Stack>
                        <CsvExportButton source={purchases} dataKey="purchases" pageParam="purchases_page" filename="supplier-purchases.csv" />
                    </Stack>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Invoice</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Paid</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Due</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                                    <TableActionHead>Actions</TableActionHead>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {purchaseRows.map((purchase) => (
                                    <ClickableTableRow key={purchase.id} href={route('purchases.show', { purchase: purchase.id })} label={`View purchase ${purchase.invoice_number}`}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                {purchase.invoice_number}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{purchase.branch?.name || '-'}</TableCell>
                                        <TableCell align="center">{formatDate(purchase.purchase_date)}</TableCell>
                                        <TableCell align="right">{money(purchase.total_amount)}</TableCell>
                                        <TableCell align="right">{money(purchase.paid_amount)}</TableCell>
                                        <TableCell align="right">{money(purchase.due_amount)}</TableCell>
                                        <TableCell align="center">
                                            <Chip size="small" label={purchase.payment_status} color={statusColor(purchase.payment_status)} variant="outlined" />
                                        </TableCell>
                                        <TableActionCell>
                                            <TableRowActions label={purchase.invoice_number}>
                                            <Tooltip title={Number(purchase.due_amount || 0) <= 0 ? 'No due amount' : 'Record payment'}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        aria-label={`Record payment for ${purchase.invoice_number}`}
                                                        onClick={() => openPaymentDialog(purchase)}
                                                        disabled={Number(purchase.due_amount || 0) <= 0}
                                                    >
                                                        <PaymentIcon fontSize="inherit" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            </TableRowActions>
                                        </TableActionCell>
                                    </ClickableTableRow>
                                ))}
                                {purchaseRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">No purchases found.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <DataTableFooter paginator={purchases} onPageChange={(page) => goToPage('purchases_page', page)} />
                    <Divider sx={{ my: 1.5 }} />
                    <Stack alignItems="flex-end">
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            Total Due: {money(totals.totalDue)}
                        </Typography>
                    </Stack>
                </Paper>

                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            Payment History
                        </Typography>
                        <CsvExportButton source={payments} dataKey="payments" pageParam="payments_page" filename="supplier-payments.csv" />
                    </Stack>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Invoice</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Recorded By</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paymentRows.map((payment) => (
                                    <TableRow key={payment.id} hover>
                                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                        <TableCell>{payment.purchase?.invoice_number || '-'}</TableCell>
                                        <TableCell>{payment.payment_method}</TableCell>
                                        <TableCell>{payment.reference_number || '-'}</TableCell>
                                        <TableCell>{payment.user?.name || '-'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{money(payment.amount)}</TableCell>
                                    </TableRow>
                                ))}
                                {paymentRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">No payments recorded.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <DataTableFooter paginator={payments} onPageChange={(page) => goToPage('payments_page', page)} />
                </Paper>
            </Box>

            <Dialog open={paymentOpen} onClose={closePaymentDialog} maxWidth="sm" fullWidth>
                <form onSubmit={submitPayment}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Record Supplier Payment
                        <IconButton size="small" onClick={closePaymentDialog}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                                select
                                label="Apply To"
                                fullWidth
                                size="small"
                                value={data.purchase_id}
                                onChange={(event) => {
                                    const purchase = duePurchases.find((item) => item.id === event.target.value);
                                    setData({
                                        ...data,
                                        purchase_id: event.target.value,
                                        branch_id: purchase?.branch_id || data.branch_id,
                                        amount: purchase ? Number(purchase.due_amount || 0).toFixed(2) : '',
                                    });
                                }}
                                error={!!errors.purchase_id}
                                helperText={errors.purchase_id || 'Leave blank to apply payment to oldest due purchases first.'}
                            >
                                <MenuItem value="">Oldest due purchases</MenuItem>
                                {duePurchases.map((purchase) => (
                                    <MenuItem key={purchase.id} value={purchase.id}>
                                        {purchase.invoice_number} - {money(purchase.due_amount)}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Payment Date"
                                    type="date"
                                    fullWidth
                                    size="small"
                                    value={data.payment_date}
                                    onChange={(event) => setData('payment_date', event.target.value)}
                                    error={!!errors.payment_date}
                                    helperText={errors.payment_date}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                />
                                <TextField
                                    select
                                    label="Method"
                                    fullWidth
                                    size="small"
                                    value={data.payment_method}
                                    onChange={(event) => setData('payment_method', event.target.value)}
                                    error={!!errors.payment_method}
                                    helperText={errors.payment_method}
                                    required
                                >
                                    <MenuItem value="Cash">Cash</MenuItem>
                                    <MenuItem value="Card">Card</MenuItem>
                                    <MenuItem value="Mobile">Mobile</MenuItem>
                                    <MenuItem value="Wallet">Wallet</MenuItem>
                                </TextField>
                            </Stack>
                            <TextField
                                label="Amount"
                                type="number"
                                fullWidth
                                size="small"
                                value={data.amount}
                                onChange={(event) => setData('amount', event.target.value)}
                                error={!!errors.amount}
                                helperText={errors.amount || `Maximum: ${money(maxPaymentAmount)}`}
                                inputProps={{ min: 0.01, max: maxPaymentAmount, step: '0.01' }}
                                required
                            />
                            <TextField
                                label="Reference Number"
                                fullWidth
                                size="small"
                                value={data.reference_number}
                                onChange={(event) => setData('reference_number', event.target.value)}
                                error={!!errors.reference_number}
                                helperText={errors.reference_number}
                            />
                            <TextField
                                label="Notes"
                                fullWidth
                                size="small"
                                multiline
                                rows={3}
                                value={data.notes}
                                onChange={(event) => setData('notes', event.target.value)}
                                error={!!errors.notes}
                                helperText={errors.notes}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={closePaymentDialog} size="small">Cancel</Button>
                        <Button type="submit" variant="contained" size="small" disabled={processing}>
                            Save Payment
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
