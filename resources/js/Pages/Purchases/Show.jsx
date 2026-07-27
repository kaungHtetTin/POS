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
    Print as PrintIcon,
    ReceiptLong as PurchaseIcon,
} from '@mui/icons-material';

export default function PurchaseShow({ auth, purchase }) {
    const { settings = {} } = usePage().props;
    const currencySymbol = settings.app?.currency_symbol || '$';
    const [paymentOpen, setPaymentOpen] = useState(false);

    const {
        data: paymentData,
        setData: setPaymentData,
        post: postPayment,
        processing: paymentProcessing,
        errors: paymentErrors,
        reset: resetPayment,
    } = useForm({
        supplier_id: purchase.supplier_id,
        purchase_id: purchase.id,
        branch_id: purchase.branch_id || auth.user?.current_branch_id || auth.user?.branch_id || '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: Number(purchase.due_amount || 0).toFixed(2),
        payment_method: 'Cash',
        reference_number: '',
        notes: '',
    });

    const money = (value) => `${currencySymbol}${Number(value || 0).toFixed(2)}`;

    const formatDate = (value) => {
        if (!value) {
            return '-';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const totals = useMemo(() => {
        return (purchase.items || []).reduce(
            (acc, item) => {
                acc.paidQuantity += Number(item.quantity || 0);
                acc.focQuantity += Number(item.foc_quantity || 0);
                acc.receivedQuantity += Number(item.received_quantity || 0);
                acc.baseQuantity += Number(item.base_quantity || 0);
                return acc;
            },
            {
                paidQuantity: 0,
                focQuantity: 0,
                receivedQuantity: 0,
                baseQuantity: 0,
            }
        );
    }, [purchase.items]);

    const statusColor = purchase.payment_status === 'Paid'
        ? 'success'
        : purchase.payment_status === 'Partial'
            ? 'warning'
            : 'error';

    const openPaymentDialog = () => {
        resetPayment();
        setPaymentData({
            supplier_id: purchase.supplier_id,
            purchase_id: purchase.id,
            branch_id: purchase.branch_id || auth.user?.current_branch_id || auth.user?.branch_id || '',
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
        resetPayment();
    };

    const submitPayment = (event) => {
        event.preventDefault();
        postPayment(route('supplier-payments.store'), {
            preserveScroll: true,
            onSuccess: () => closePaymentDialog(),
        });
    };

    return (
        <MainLayout auth={auth} header="Purchase Invoice">
            <Head title={`Purchase ${purchase.invoice_number}`} />

            <Box sx={{ flexGrow: 1 }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    spacing={1.5}
                    sx={{ mb: 2 }}
                    className="print:hidden"
                >
                    <Button
                        component={Link}
                        href={route('purchases.index')}
                        variant="outlined"
                        size="small"
                        startIcon={<ArrowBackIcon />}
                    >
                        Back
                    </Button>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<PaymentIcon />}
                            onClick={openPaymentDialog}
                            disabled={Number(purchase.due_amount || 0) <= 0}
                            sx={{ height: 40, whiteSpace: 'nowrap' }}
                        >
                            Record Payment
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PrintIcon />}
                            onClick={() => window.print()}
                            sx={{ height: 40, whiteSpace: 'nowrap' }}
                        >
                            Print
                        </Button>
                    </Stack>
                </Stack>

                <Paper sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        spacing={2}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <PurchaseIcon color="primary" />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                    Purchase Invoice
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {purchase.invoice_number}
                                </Typography>
                            </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={purchase.payment_status} color={statusColor} variant="outlined" />
                            <Typography variant="body2" color="text.secondary">
                                Purchase: {formatDate(purchase.purchase_date)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Due: {formatDate(purchase.due_date)}
                            </Typography>
                        </Stack>
                    </Stack>

                    <Divider sx={{ my: 2.5 }} />

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                            gap: 2,
                        }}
                    >
                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                SUPPLIER
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                                {purchase.supplier?.name || '-'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {purchase.supplier?.phone || '-'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {purchase.supplier?.email || ''}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {purchase.supplier?.address || ''}
                            </Typography>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                RECEIVED BRANCH
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                                {purchase.branch?.name || '-'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {purchase.branch?.phone || '-'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {purchase.branch?.email || ''}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {purchase.branch?.address || ''}
                            </Typography>
                        </Paper>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                            gap: 1.5,
                            mt: 2,
                        }}
                    >
                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Paid Qty</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>{totals.paidQuantity}</Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">FOC Qty</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>{totals.focQuantity}</Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Received Qty</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>{totals.receivedQuantity}</Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Base Qty</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>{totals.baseQuantity}</Typography>
                        </Paper>
                    </Box>

                    <TableContainer sx={{ mt: 2.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Qty</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">FOC</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Received</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Cost</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Retail</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Wholesale</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Line Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(purchase.items || []).map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                {item.product_name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {item.generic_name || item.barcode || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{item.batch_number || '-'}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Exp: {formatDate(item.expiry_date)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">{item.unit_name || '-'}</TableCell>
                                        <TableCell align="right">{item.quantity}</TableCell>
                                        <TableCell align="right">{item.foc_quantity}</TableCell>
                                        <TableCell align="right">{item.received_quantity}</TableCell>
                                        <TableCell align="right">{money(item.unit_price)}</TableCell>
                                        <TableCell align="right">{money(item.selling_price)}</TableCell>
                                        <TableCell align="right">{money(item.wholesale_price)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                                            {money(item.total_price)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Stack alignItems="flex-end" sx={{ mt: 2.5 }}>
                        <Box sx={{ width: { xs: '100%', sm: 320 } }}>
                            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                                <Typography variant="body2" color="text.secondary">Payment Due Date</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDate(purchase.due_date)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                                <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{money(purchase.total_amount)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                                <Typography variant="body2" color="text.secondary">Paid Amount</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{money(purchase.paid_amount)}</Typography>
                            </Stack>
                            <Divider />
                            <Stack direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Due Amount</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{money(purchase.due_amount)}</Typography>
                            </Stack>
                        </Box>
                    </Stack>

                    <Divider sx={{ my: 2.5 }} />

                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                        Supplier Payments
                    </Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Recorded By</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(purchase.payments || []).map((payment) => (
                                    <TableRow key={payment.id} hover>
                                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                        <TableCell>{payment.payment_method}</TableCell>
                                        <TableCell>{payment.reference_number || '-'}</TableCell>
                                        <TableCell>{payment.user?.name || '-'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{money(payment.amount)}</TableCell>
                                    </TableRow>
                                ))}
                                {(purchase.payments || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 2.5 }}>
                                            <Typography variant="body2" color="text.secondary">No supplier payments recorded.</Typography>
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
                        Record Purchase Payment
                        <IconButton size="small" onClick={closePaymentDialog}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Paper variant="outlined" sx={{ p: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {purchase.invoice_number}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Supplier: {purchase.supplier?.name || '-'} | Due Date: {formatDate(purchase.due_date)} | Due: {money(purchase.due_amount)}
                                </Typography>
                            </Paper>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Payment Date"
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
                                    label="Method"
                                    fullWidth
                                    size="small"
                                    value={paymentData.payment_method}
                                    onChange={(event) => setPaymentData('payment_method', event.target.value)}
                                    error={!!paymentErrors.payment_method}
                                    helperText={paymentErrors.payment_method}
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
                                value={paymentData.amount}
                                onChange={(event) => setPaymentData('amount', event.target.value)}
                                error={!!paymentErrors.amount}
                                helperText={paymentErrors.amount || `Maximum: ${money(purchase.due_amount)}`}
                                inputProps={{ min: 0.01, max: Number(purchase.due_amount || 0), step: '0.01' }}
                                required
                            />
                            <TextField
                                label="Reference Number"
                                fullWidth
                                size="small"
                                value={paymentData.reference_number}
                                onChange={(event) => setPaymentData('reference_number', event.target.value)}
                                error={!!paymentErrors.reference_number}
                                helperText={paymentErrors.reference_number}
                            />
                            <TextField
                                label="Notes"
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
                        <Button onClick={closePaymentDialog} size="small">Cancel</Button>
                        <Button type="submit" variant="contained" size="small" disabled={paymentProcessing}>
                            Save Payment
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
