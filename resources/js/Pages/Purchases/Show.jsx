import React, { useMemo } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Print as PrintIcon,
    ReceiptLong as PurchaseIcon,
} from '@mui/icons-material';

export default function PurchaseShow({ auth, purchase }) {
    const { settings = {} } = usePage().props;
    const currencySymbol = settings.app?.currency_symbol || '$';

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
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PrintIcon />}
                        onClick={() => window.print()}
                    >
                        Print
                    </Button>
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
                                {formatDate(purchase.purchase_date)}
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
                </Paper>
            </Box>
        </MainLayout>
    );
}
