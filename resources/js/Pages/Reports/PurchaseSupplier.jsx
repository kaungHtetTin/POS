import React, { useMemo, useState } from 'react';
import DataTableFooter from '@/Components/DataTableFooter';
import ClickableTableRow from '@/Components/ClickableTableRow';
import MainLayout from '@/Layouts/MainLayout';
import { AppBarBack } from '@/Components/AppBarPortal';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import StatCardGrid from '@/Components/StatCardGrid';
import { CompactBarChart, CompactDonutChart, CompactLineChart } from '@/Components/CompactReportChart';
import { Head, router } from '@/spa';
import {
    Box,
    Button,
    Chip,
    FormControl,
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
    Typography,
} from '@mui/material';
import {
    FilterAlt as FilterIcon,
    LocalShipping as SupplierIcon,
    ReceiptLong as PurchaseIcon,
    RestartAlt as ResetIcon,
} from '@mui/icons-material';

export default function PurchaseSupplierReport({
    auth,
    branches = [],
    supplier = {},
    filters = {},
    summary = {},
    status_breakdown = [],
    purchase_trend = [],
    category_summary = [],
    product_summary = [],
    payments = [],
    purchases = {},
}) {
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status ?? 'all');

    const money = (value) => Number(value || 0).toFixed(2);
    const formatDate = (value) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
    };

    const filterPayload = (page = undefined) => ({
        branch_id: branchId || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        payment_status: paymentStatus || undefined,
        page,
    });

    const applyFilters = (page = undefined) => {
        router.get(route('reports.purchases.supplier', { supplier: supplier.id }), filterPayload(page), { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setBranchId(auth.user?.current_branch_id || '');
        setFromDate('');
        setToDate('');
        setPaymentStatus('all');
        router.get(route('reports.purchases.supplier', { supplier: supplier.id }));
    };

    const trendData = useMemo(() => (purchase_trend || []).map((row) => ({
        period: row.period,
        purchases: Number(row.purchase_count || 0),
        total: Number(row.total_amount || 0),
        due: Number(row.due_amount || 0),
    })), [purchase_trend]);

    const statusData = useMemo(() => (status_breakdown || []).map((row) => ({
        name: row.payment_status,
        total: Number(row.total_amount || 0),
        due: Number(row.due_amount || 0),
        count: Number(row.purchase_count || 0),
    })), [status_breakdown]);

    const categoryData = useMemo(() => (category_summary || []).map((row) => ({
        name: row.category_name,
        total: Number(row.total_amount || 0),
        qty: Number(row.received_quantity || 0),
    })), [category_summary]);

    const currentPurchases = purchases?.data || [];
    const statusColors = ['#0E684E', '#2874bc', '#b77700', '#ce4444', '#7b8795'];

    return (
        <MainLayout auth={auth} header="Supplier Purchase Report">
            <Head title={`${supplier.name || 'Supplier'} Purchase Report`} />
            <AppBarBack href={route('reports.purchases')} label="Back to Purchase Reports" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Supplier detail
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>
                            {supplier.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {supplier.phone || 'No phone'} | {supplier.payment_terms || 'No payment terms'} | Balance ${money(supplier.balance)}
                        </Typography>
                    </Box>
                </Stack>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <SupplierIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Supplier purchase analysis</Typography>
                    </Stack>

                    <ReportFilterToolbar appBar
                        ariaLabel="Supplier purchase filters"
                        fieldKinds={['wide', 'date', 'date', 'select']}
                        onSubmit={() => applyFilters()}
                        actions={(
                            <>
                                <Button variant="contained" size="small" startIcon={<FilterIcon />} type="submit">Apply</Button>
                                <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>Reset</Button>
                                <CsvExportButton source={purchases} dataKey="purchases" filename="supplier-purchases.csv" />
                            </>
                        )}
                    >
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '1 1 220px' }, minWidth: 0 }}>
                            <InputLabel>Branch</InputLabel>
                            <Select value={branchId} label="Branch" onChange={(event) => setBranchId(event.target.value)}>
                                <MenuItem value="">Current Branch</MenuItem>
                                <MenuItem value="all">All Accessible</MenuItem>
                                {branches.map((branch) => (
                                    <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            type="date"
                            label="From"
                            value={fromDate}
                            onChange={(event) => setFromDate(event.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 170px' } }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="To"
                            value={toDate}
                            onChange={(event) => setToDate(event.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 170px' } }}
                        />
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 1 170px' }, minWidth: 0 }}>
                            <InputLabel>Payment</InputLabel>
                            <Select value={paymentStatus} label="Payment" onChange={(event) => setPaymentStatus(event.target.value)}>
                                <MenuItem value="all">All statuses</MenuItem>
                                <MenuItem value="Paid">Paid</MenuItem>
                                <MenuItem value="Partial">Partial</MenuItem>
                                <MenuItem value="Due">Due</MenuItem>
                            </Select>
                        </FormControl>
                    </ReportFilterToolbar>

                    <StatCardGrid items={[
                            ['Purchases', summary.purchase_count || 0],
                            ['Total', `$${money(summary.total_amount)}`],
                            ['Paid', `$${money(summary.paid_amount)}`],
                            ['Due', `$${money(summary.due_amount)}`],
                            ['Received Qty', Number(summary.quantity || 0) + Number(summary.foc_quantity || 0)],
                            ['Payments', `$${money(summary.payment_total)}`],
                        ].map(([label, value]) => ({ label, value }))} sx={{ mb: 0 }} />
                </Paper>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.35fr 1fr' }, gap: 1.25, mb: 1.5 }}>
                    <CompactLineChart title="Purchase Trend" data={trendData} xKey="period" series={[
                        { key: 'total', label: 'Total', color: '#0E684E' },
                        { key: 'due', label: 'Due', color: '#b77700' },
                    ]} valueFormatter={(value) => `$${money(value)}`} />
                    <CompactDonutChart title="Payment Status Mix" data={statusData} valueKey="total" colors={statusColors} valueFormatter={(value) => `$${money(value)}`} />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 1.25, mb: 1.5 }}>
                    <CompactBarChart title="Category Summary" data={categoryData} xKey="name" series={[{ key: 'total', label: 'Total', color: '#0E684E' }]} valueFormatter={(value) => `$${money(value)}`} />

                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Top Products</Typography>
                        <TableContainer sx={{ maxHeight: 250 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Product</TableCell>
                                        <TableCell align="right">Qty</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(product_summary || []).map((row) => (
                                        <TableRow key={row.product_id || row.product_name}>
                                            <TableCell>{row.product_name}</TableCell>
                                            <TableCell align="right">{row.received_quantity}</TableCell>
                                            <TableCell align="right">${money(row.total_amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1.3fr' }, gap: 2 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Recent Payments</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Method</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(payments || []).map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>
                                                <Typography variant="body2">{formatDate(payment.payment_date)}</Typography>
                                                <Typography variant="caption" color="text.secondary">{payment.invoice_number}</Typography>
                                            </TableCell>
                                            <TableCell>{payment.payment_method}</TableCell>
                                            <TableCell align="right">${money(payment.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {payments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                                <Typography variant="body2" color="text.secondary">No payments found.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PurchaseIcon fontSize="small" color="primary" />
                                PURCHASES
                            </Typography>
                            <Chip size="small" variant="outlined" label={`${purchases.total || 0} purchases`} />
                        </Stack>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Invoice</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                        <TableCell align="right">Due</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {currentPurchases.map((purchase) => (
                                        <ClickableTableRow key={purchase.id} href={route('purchases.show', { purchase: purchase.id })} label={`View purchase ${purchase.invoice_number}`}>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 800 }}>{purchase.invoice_number}</Typography>
                                                <Typography variant="caption" color="text.secondary">{purchase.branch_name}</Typography>
                                            </TableCell>
                                            <TableCell>{formatDate(purchase.purchase_date)}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={purchase.payment_status} variant="outlined" />
                                            </TableCell>
                                            <TableCell align="right">${money(purchase.total_amount)}</TableCell>
                                            <TableCell align="right">${money(purchase.due_amount)}</TableCell>
                                        </ClickableTableRow>
                                    ))}
                                    {currentPurchases.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                <Typography variant="body2" color="text.secondary">No purchases found for this supplier.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <DataTableFooter paginator={purchases} onPageChange={(page) => applyFilters(page)} />
                    </Paper>
                </Box>
            </Box>
        </MainLayout>
    );
}
