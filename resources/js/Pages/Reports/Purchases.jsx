import React, { useMemo, useState } from 'react';
import DataTableFooter from '@/Components/DataTableFooter';
import ClickableTableRow from '@/Components/ClickableTableRow';
import MainLayout from '@/Layouts/MainLayout';
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
    InputAdornment,
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
    Assessment as ReportIcon,
    FilterAlt as FilterIcon,
    LocalShipping as SupplierIcon,
    RestartAlt as ResetIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

export default function PurchaseReport({
    auth,
    branches = [],
    filters = {},
    summary = {},
    status_breakdown = [],
    purchase_trend = [],
    top_suppliers = [],
    suppliers = {},
}) {
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status ?? 'all');
    const [search, setSearch] = useState(filters.search ?? '');

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
        search: search || undefined,
        page,
    });

    const applyFilters = (page = undefined) => {
        router.get(route('reports.purchases'), filterPayload(page), { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setBranchId(auth.user?.current_branch_id || '');
        setFromDate('');
        setToDate('');
        setPaymentStatus('all');
        setSearch('');
        router.get(route('reports.purchases'));
    };

    const handleSearchKey = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyFilters();
        }
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

    const supplierChartData = useMemo(() => (top_suppliers || []).map((row) => ({
        name: row.name,
        total: Number(row.total_amount || 0),
        due: Number(row.due_amount || 0),
    })), [top_suppliers]);

    const currentRows = suppliers?.data || [];
    const statusColors = ['#0E684E', '#2874bc', '#b77700', '#ce4444'];

    return (
        <MainLayout auth={auth} header="Purchases Report">
            <Head title="Purchases Report" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <ReportIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Purchase analysis</Typography>
                    </Stack>

                    <ReportFilterToolbar appBar
                        ariaLabel="Purchase report filters"
                        fieldKinds={['wide', 'date', 'date', 'select', 'search']}
                        onSubmit={() => applyFilters()}
                        actions={(
                            <>
                                <Button variant="contained" size="small" startIcon={<FilterIcon />} type="submit">Apply</Button>
                                <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>Reset</Button>
                                <CsvExportButton source={suppliers} dataKey="suppliers" filename="purchase-report.csv" />
                            </>
                        )}
                    >
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '1 1 210px' }, minWidth: 0 }}>
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
                        <TextField
                            size="small"
                            label="Supplier"
                            placeholder="Search supplier..."
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
                            sx={{ flex: { xs: '1 1 100%', md: '2 1 260px' }, minWidth: 0 }}
                        />
                    </ReportFilterToolbar>

                    <StatCardGrid items={[
                            ['Purchases', summary.purchase_count || 0],
                            ['Suppliers', summary.supplier_count || 0],
                            ['Total', `$${money(summary.total_amount)}`],
                            ['Paid', `$${money(summary.paid_amount)}`],
                            ['Due', `$${money(summary.due_amount)}`],
                            ['Avg Purchase', `$${money(summary.average_purchase)}`],
                        ].map(([label, value]) => ({ label, value }))} sx={{ mb: 0 }} />
                </Paper>

                <Box sx={{ display: 'grid !important', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr)) !important' }, alignItems: 'stretch', gap: 1, mb: 1.25 }}>
                    <CompactLineChart title="Purchase Trend" data={trendData} xKey="period" series={[
                        { key: 'total', label: 'Total', color: '#0E684E' },
                        { key: 'due', label: 'Due', color: '#b77700' },
                    ]} valueFormatter={(value) => `$${money(value)}`} height={148} />
                    <CompactDonutChart title="Payment Status Mix" data={statusData} valueKey="total" colors={statusColors} valueFormatter={(value) => `$${money(value)}`} height={148} />
                    <CompactBarChart title="Top Suppliers" data={supplierChartData} xKey="name" series={[
                        { key: 'total', label: 'Total', color: '#0E684E' },
                        { key: 'due', label: 'Due', color: '#b77700' },
                    ]} valueFormatter={(value) => `$${money(value)}`} height={148} />
                </Box>

                <Paper sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SupplierIcon fontSize="small" color="primary" />
                            SUPPLIER PURCHASE SUMMARY
                        </Typography>
                        <Chip size="small" variant="outlined" label={`${suppliers.total || 0} suppliers`} />
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Supplier</TableCell>
                                    <TableCell align="right">Purchases</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell align="right">Paid</TableCell>
                                    <TableCell align="right">Due</TableCell>
                                    <TableCell>Last Purchase</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {currentRows.map((supplier) => (
                                    <ClickableTableRow
                                        key={supplier.id}
                                        href={route('reports.purchases.supplier', {
                                            supplier: supplier.id,
                                            branch_id: branchId || undefined,
                                            from_date: fromDate || undefined,
                                            to_date: toDate || undefined,
                                            payment_status: paymentStatus || undefined,
                                        })}
                                        label={`View purchase report for ${supplier.name}`}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{supplier.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {supplier.phone || supplier.email || 'No contact'} | Balance ${money(supplier.balance)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">{supplier.purchase_count}</TableCell>
                                        <TableCell align="right">${money(supplier.total_amount)}</TableCell>
                                        <TableCell align="right">${money(supplier.paid_amount)}</TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                size="small"
                                                color={Number(supplier.due_amount || 0) > 0 ? 'warning' : 'success'}
                                                variant={Number(supplier.due_amount || 0) > 0 ? 'filled' : 'outlined'}
                                                label={`$${money(supplier.due_amount)}`}
                                            />
                                        </TableCell>
                                        <TableCell>{formatDate(supplier.last_purchase_date)}</TableCell>
                                    </ClickableTableRow>
                                ))}
                                {currentRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">No supplier purchase activity found.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <DataTableFooter paginator={suppliers} onPageChange={(page) => applyFilters(page)} />
                </Paper>
            </Box>
        </MainLayout>
    );
}
