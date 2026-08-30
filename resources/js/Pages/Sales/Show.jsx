import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, Link } from '@/spa';
import {
    Alert, Box, Button, Chip, Divider, Paper, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { ArrowBack, Person, Receipt } from '@mui/icons-material';

const money = (value) => Number(value || 0).toFixed(2);
const dateTime = (value) => value ? new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value)) : '-';

function Fact({ label, value, strong = false }) {
    return <Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" sx={{ fontWeight: strong ? 800 : 600 }}>{value ?? '-'}</Typography></Box>;
}

function MoneyRow({ label, value, strong = false, color = 'text.primary' }) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ py: 0.55 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: strong ? 900 : 700, color, fontVariantNumeric: 'tabular-nums' }}>${money(value)}</Typography>
        </Stack>
    );
}

function Metric({ label, value, color = 'text.primary', soft = 'action.hover' }) {
    return (
        <Box sx={{ p: 1.1, border: '1px solid', borderColor: 'divider', bgcolor: soft, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
            <Typography variant="subtitle1" sx={{ mt: 0.15, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>${money(value)}</Typography>
        </Box>
    );
}

export default function SaleShow({ auth, sale, returns = [], summary = {} }) {
    const isVoided = (sale.status || 'Completed') === 'Voided';
    const items = sale.items || [];

    return (
        <MainLayout auth={auth} header="Sale Detail">
            <Head title={`Sale ${sale.invoice_number}`} />
            <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
                    <Button component={Link} href={route('sales.index')} variant="outlined" size="small" startIcon={<ArrowBack />}>Back to Sales</Button>
                    <CsvExportButton source={items} filename={`${sale.invoice_number}-items.csv`} />
                </Stack>

                {isVoided && <Alert severity="error">Voided by {sale.voided_by_user?.name || 'Unknown'} on {dateTime(sale.voided_at)}. {sale.void_reason}</Alert>}

                <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center"><Receipt color="primary" /><Typography variant="h6" sx={{ fontWeight: 900 }}>{sale.invoice_number}</Typography><Chip size="small" label={sale.status || 'Completed'} color={isVoided ? 'error' : 'success'} variant="outlined" /></Stack>
                            <Typography variant="caption" color="text.secondary">Recorded transaction values are shown; current product prices are not used.</Typography>
                        </Box>
                        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                            <Fact label="Sale Date" value={dateTime(sale.sale_date)} />
                            <Fact label="Payment" value={`${sale.payment_method} / ${sale.payment_status}`} />
                            <Fact label="Grand Total" value={`$${money(sale.grand_total)}`} strong />
                        </Stack>
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                        <Fact label="Branch" value={sale.branch?.name} />
                        <Fact label="Cashier" value={sale.user?.name} />
                        <Fact label="Sale Representative" value={sale.sale_staff?.name || sale.user?.name} />
                        <Fact label="Cash Session" value={sale.cash_session ? `${dateTime(sale.cash_session.opened_at)} / ${sale.cash_session.status}` : '-'} />
                    </Box>
                </Paper>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px' }, gap: 1.5 }}>
                    <Paper sx={{ p: 1.5, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Sale Items</Typography>
                        <TableContainer><Table size="small">
                            <TableHead><TableRow><TableCell>Product / Batch</TableCell><TableCell>Unit</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Unit Price</TableCell><TableCell align="right">Discount</TableCell><TableCell align="right">Cost</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
                            <TableBody>{items.map((item) => <TableRow key={item.id} hover>
                                <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{item.product?.name || '-'}</Typography><Typography variant="caption" color="text.secondary">{item.product?.generic_name || item.product?.barcode || ''} · Batch {item.batch?.batch_number || '-'}</Typography></TableCell>
                                <TableCell>{item.unit?.short_name || item.unit?.name || '-'}</TableCell>
                                <TableCell align="right">{item.quantity}{Number(item.foc_quantity || 0) > 0 ? ` + ${item.foc_quantity} FOC` : ''}</TableCell>
                                <TableCell align="right">${money(item.unit_price)}</TableCell>
                                <TableCell align="right">${money(item.discount_amount)}</TableCell>
                                <TableCell align="right">${money(item.cost_total)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>${money(item.total_price)}</TableCell>
                            </TableRow>)}</TableBody>
                        </Table></TableContainer>
                    </Paper>

                    <Stack spacing={1.5}>
                        <Paper sx={{ p: 1.5 }}><Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><Person color="primary" fontSize="small" /><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Customer</Typography></Stack><Fact label="Name" value={sale.customer?.name || 'Walk-in Customer'} /><Fact label="Phone" value={sale.customer?.phone} /><Fact label="Email" value={sale.customer?.email} /></Paper>
                        <Paper sx={{ p: 1.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Financial Summary</Typography>
                                <Chip size="small" label={sale.payment_status} color={sale.payment_status === 'Paid' ? 'success' : 'warning'} variant="outlined" />
                            </Stack>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))', lg: '1fr' }, gap: 0.8, mb: 1.25 }}>
                                <Metric label="Net Revenue" value={summary.net_revenue} color="primary.main" soft="primary.soft" />
                                <Metric label="Recorded Cost" value={summary.cost_total} />
                                <Metric label="Gross Profit" value={summary.gross_profit} color={Number(summary.gross_profit || 0) >= 0 ? 'success.main' : 'error.main'} />
                            </Box>
                            <Box sx={{ px: 0.25 }}>
                                <MoneyRow label="Subtotal" value={sale.total_amount} />
                                <MoneyRow label="Discount" value={sale.discount} color={Number(sale.discount || 0) > 0 ? 'error.main' : 'text.primary'} />
                                <MoneyRow label="Tax collected" value={sale.tax} />
                                <Divider sx={{ my: 0.65 }} />
                                <MoneyRow label="Approved refunds" value={summary.approved_refunds} color={Number(summary.approved_refunds || 0) > 0 ? 'error.main' : 'text.primary'} />
                            </Box>
                            <Box sx={{ mt: 1, px: 1.1, py: 0.9, bgcolor: 'primary.soft', border: '1px solid', borderColor: 'primary.main' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>Net After Refunds</Typography>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>${money(summary.net_after_refunds)}</Typography>
                                </Stack>
                            </Box>
                        </Paper>
                    </Stack>
                </Box>

                <Paper sx={{ p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Customer Returns</Typography><CsvExportButton source={returns} filename={`${sale.invoice_number}-returns.csv`} /></Stack>
                    {returns.length === 0 ? <Typography variant="body2" color="text.secondary">No returns recorded for this sale.</Typography> : <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Reason</TableCell><TableCell>Status</TableCell><TableCell align="right">Items</TableCell><TableCell align="right">Refund</TableCell></TableRow></TableHead><TableBody>{returns.map((entry) => <TableRow key={entry.id}><TableCell>{dateTime(entry.created_at)}</TableCell><TableCell>{entry.reason}</TableCell><TableCell><Chip size="small" label={entry.status} variant="outlined" color={entry.status === 'Approved' ? 'success' : entry.status === 'Rejected' ? 'error' : 'warning'} /></TableCell><TableCell align="right">{entry.items?.length || 0}</TableCell><TableCell align="right">${money(entry.refund_amount)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}
                </Paper>
            </Stack>
        </MainLayout>
    );
}
