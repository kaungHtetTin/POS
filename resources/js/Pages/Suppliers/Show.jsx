import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
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
    Typography,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Close as CloseIcon,
    Payment as PaymentIcon,
    ReceiptLong as PurchaseIcon,
} from '@mui/icons-material';

export default function SupplierShow({ auth, supplier, purchases, duePurchases, payments }) {
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
            totalPurchases: purchases.reduce((sum, purchase) => sum + Number(purchase.total_amount || 0), 0),
            totalDue: purchases.reduce((sum, purchase) => sum + Number(purchase.due_amount || 0), 0),
            totalPayments: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        };
    }, [purchases, payments]);

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

    return (
        <MainLayout auth={auth} header="Supplier Statement">
            <Head title={`${supplier.name} Statement`} />

            <Box sx={{ flexGrow: 1 }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    spacing={1.5}
                    sx={{ mb: 2 }}
                >
                    <Button
                        component={Link}
                        href={route('suppliers.index')}
                        variant="outlined"
                        size="small"
                        startIcon={<ArrowBackIcon />}
                        sx={{ height: 40, whiteSpace: 'nowrap' }}
                    >
                        Back
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PaymentIcon />}
                        onClick={() => openPaymentDialog()}
                        disabled={Number(supplier.balance || 0) <= 0}
                        sx={{ height: 40, whiteSpace: 'nowrap' }}
                    >
                        Record Payment
                    </Button>
                </Stack>

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
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 140px)' },
                                gap: 1,
                            }}
                        >
                            <Paper variant="outlined" sx={{ p: 1.2 }}>
                                <Typography variant="caption" color="text.secondary">Credit Limit</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{money(supplier.credit_limit)}</Typography>
                            </Paper>
                            <Paper variant="outlined" sx={{ p: 1.2 }}>
                                <Typography variant="caption" color="text.secondary">Outstanding</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{money(supplier.balance)}</Typography>
                            </Paper>
                            <Paper variant="outlined" sx={{ p: 1.2 }}>
                                <Typography variant="caption" color="text.secondary">Purchases</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{money(totals.totalPurchases)}</Typography>
                            </Paper>
                            <Paper variant="outlined" sx={{ p: 1.2 }}>
                                <Typography variant="caption" color="text.secondary">Payments</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{money(totals.totalPayments)}</Typography>
                            </Paper>
                        </Box>
                    </Stack>
                </Paper>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <PurchaseIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            Purchases
                        </Typography>
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
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {purchases.map((purchase) => (
                                    <TableRow key={purchase.id} hover>
                                        <TableCell>
                                            <Typography
                                                component={Link}
                                                href={route('purchases.show', { purchase: purchase.id })}
                                                variant="body2"
                                                sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                            >
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
                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => openPaymentDialog(purchase)}
                                                disabled={Number(purchase.due_amount || 0) <= 0}
                                                sx={{ height: 32, whiteSpace: 'nowrap' }}
                                            >
                                                Pay
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {purchases.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">No purchases found.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack alignItems="flex-end">
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            Total Due: {money(totals.totalDue)}
                        </Typography>
                    </Stack>
                </Paper>

                <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                        Payment History
                    </Typography>
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
                                {payments.map((payment) => (
                                    <TableRow key={payment.id} hover>
                                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                        <TableCell>{payment.purchase?.invoice_number || '-'}</TableCell>
                                        <TableCell>{payment.payment_method}</TableCell>
                                        <TableCell>{payment.reference_number || '-'}</TableCell>
                                        <TableCell>{payment.user?.name || '-'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{money(payment.amount)}</TableCell>
                                    </TableRow>
                                ))}
                                {payments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">No payments recorded.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
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
