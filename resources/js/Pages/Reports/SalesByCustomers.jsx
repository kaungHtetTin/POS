import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, router, usePage } from '@/spa';
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
    Assessment as ReportIcon,
    CalendarMonth as CalendarIcon,
    FilterAlt as FilterIcon,
    RestartAlt as ResetIcon,
} from '@mui/icons-material';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from 'recharts';

const toInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const rangeForDuration = (duration) => {
    const today = new Date();
    const from = new Date(today);
    const to = new Date(today);

    if (duration === 'week') {
        const day = today.getDay() || 7;
        from.setDate(today.getDate() - day + 1);
        to.setDate(from.getDate() + 6);
    } else if (duration === 'year') {
        from.setMonth(0, 1);
        to.setMonth(11, 31);
    } else {
        from.setDate(1);
        to.setMonth(today.getMonth() + 1, 0);
    }

    return {
        from: toInputDate(from),
        to: toInputDate(to),
    };
};

export default function SalesByCustomersReport({
    auth,
    branches = [],
    filters = {},
    summary = {},
    sales_trend = [],
    top_customers = [],
    top_products = [],
}) {
    const { translations = {} } = usePage().props;
    const __ = (key) => translations[key] || key;
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [duration, setDuration] = useState(filters.duration ?? 'month');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');

    const money = (value) => Number(value || 0).toFixed(2);
    const percent = (value, total) => {
        const denominator = Number(total || 0);
        if (denominator <= 0) return '0.0%';

        return `${((Number(value || 0) / denominator) * 100).toFixed(1)}%`;
    };

    const formatDate = (value) => {
        if (!value) return '-';

        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(value));
    };

    const formatShortDate = (value) => {
        if (!value) return '';

        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
        }).format(new Date(value));
    };

    const handleDurationChange = (value) => {
        setDuration(value);

        if (value !== 'custom') {
            const nextRange = rangeForDuration(value);
            setFromDate(nextRange.from);
            setToDate(nextRange.to);
        }
    };

    const filterPayload = () => ({
        branch_id: branchId || undefined,
        duration: duration || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
    });

    const applyFilters = () => {
        router.get(route('reports.sales-by-customers'), filterPayload(), {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const nextRange = rangeForDuration('month');

        setBranchId(auth.user?.current_branch_id || '');
        setDuration('month');
        setFromDate(nextRange.from);
        setToDate(nextRange.to);
        router.get(route('reports.sales-by-customers'));
    };

    const handleManualDateChange = (setter) => (event) => {
        setter(event.target.value);
        setDuration('custom');
    };

    const trendData = useMemo(() => (sales_trend || []).map((row) => ({
        period: row.period,
        sales: Number(row.sale_count || 0),
        customers: Number(row.customer_count || 0),
        total: Number(row.grand_total || 0),
    })), [sales_trend]);

    const topCustomerData = useMemo(() => (top_customers || []).map((row) => ({
        name: row.name,
        total: Number(row.grand_total || 0),
        net: Number(row.net_amount || 0),
        sales: Number(row.sale_count || 0),
    })), [top_customers]);

    const topProductData = useMemo(() => (top_products || []).map((row) => ({
        name: row.product_name,
        total: Number(row.sale_amount || 0),
        quantity: Number(row.quantity || 0),
        baseQuantity: Number(row.base_quantity || 0),
        sales: Number(row.sale_count || 0),
        share: Number(summary?.grand_total || 0) > 0
            ? (Number(row.sale_amount || 0) / Number(summary.grand_total || 0)) * 100
            : 0,
    })), [top_products, summary]);

    return (
        <MainLayout auth={auth} header={__('Sale Report')}>
            <Head title={__('Sale Report')} />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {__('Sales')}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>
                            {__('Sale Report')}
                        </Typography>
                    </Box>
                    <Chip
                        icon={<CalendarIcon fontSize="small" />}
                        label={`${formatDate(filters.from_date)} ${__('to')} ${formatDate(filters.to_date)}`}
                        variant="outlined"
                        sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                    />
                </Stack>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <ReportIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('CUSTOMER SALES ANALYSIS')}</Typography>
                    </Stack>

                    <ReportFilterToolbar
                        ariaLabel={__('Customer sales report filters')}
                        fieldKinds={['wide', 'select', 'date', 'date']}
                        onSubmit={() => applyFilters()}
                        actions={(
                            <>
                                <Button variant="contained" size="small" startIcon={<FilterIcon />} type="submit">{__('Apply')}</Button>
                                <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>{__('Reset')}</Button>
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

                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 1 170px' }, minWidth: 0 }}>
                            <InputLabel>{__('Duration')}</InputLabel>
                            <Select value={duration} label={__('Duration')} onChange={(event) => handleDurationChange(event.target.value)}>
                                <MenuItem value="week">{__('This Week')}</MenuItem>
                                <MenuItem value="month">{__('This Month')}</MenuItem>
                                <MenuItem value="year">{__('This Year')}</MenuItem>
                                <MenuItem value="custom">{__('Custom')}</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            type="date"
                            label={__('From')}
                            value={fromDate}
                            onChange={handleManualDateChange(setFromDate)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 170px' } }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label={__('To')}
                            value={toDate}
                            onChange={handleManualDateChange(setToDate)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 170px' } }}
                        />

                    </ReportFilterToolbar>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                        <CsvExportButton source={sales_trend} filename="sales-trend.csv" label={__('Export Sales Trend')} />
                        <CsvExportButton source={top_customers} filename="top-customers.csv" label={__('Export Customers')} />
                        <CsvExportButton source={top_products} filename="top-products.csv" label={__('Export Products')} />
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 1.2 }}>
                        {[
                            ['Sales', summary.sale_count || 0],
                            ['Customers', summary.customer_count || 0],
                            ['Gross Sales', `$${money(summary.grand_total)}`],
                            ['Customer Returns', `$${money(summary.customer_returns)}`],
                            ['Net Amount', `$${money(summary.net_amount)}`],
                            ['Avg Sale', `$${money(summary.average_sale)}`],
                        ].map(([label, value]) => (
                            <Paper key={label} variant="outlined" sx={{ p: 1.25 }}>
                                <Typography variant="caption" color="text.secondary">{__(label)}</Typography>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{value}</Typography>
                            </Paper>
                        ))}
                    </Box>
                </Paper>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.4fr 1fr' }, gap: 2, mb: 2 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>{__('Sales Trend')}</Typography>
                        <Box sx={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={formatShortDate} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <ChartTooltip labelFormatter={formatDate} formatter={(value, name) => name === 'total' ? `$${money(value)}` : value} />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" name={__('Sales Amount')} stroke="#087f74" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="customers" name={__('Customers')} stroke="#2874bc" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('Top Product Sale Rate')}</Typography>
                            <Chip size="small" variant="outlined" label={`${topProductData.length} ${__('products')}`} />
                        </Stack>
                        <Box sx={{ height: 250, mb: 1 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProductData} layout="vertical" margin={{ top: 8, right: 20, left: 42, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(value) => `$${money(value)}`} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={126} />
                                    <ChartTooltip
                                        formatter={(value, name) => {
                                            if (name === 'Share') return [`${Number(value || 0).toFixed(1)}%`, __(name)];
                                            return [`$${money(value)}`, __(name)];
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="total" name={__('Sale Amount')} fill="#087f74" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                        <TableContainer sx={{ maxHeight: 190 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{__('Product')}</TableCell>
                                        <TableCell align="right">{__('Sales')}</TableCell>
                                        <TableCell align="right">{__('Qty')}</TableCell>
                                        <TableCell align="right">{__('Amount')}</TableCell>
                                        <TableCell align="right">{__('Rate')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(top_products || []).map((product) => (
                                        <TableRow key={product.product_id || product.product_name} hover>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 800 }}>{product.product_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {product.generic_name || __('No generic name')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">{product.sale_count}</TableCell>
                                            <TableCell align="right">{Number(product.quantity || 0).toFixed(2)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>${money(product.sale_amount)}</TableCell>
                                            <TableCell align="right">{percent(product.sale_amount, summary.grand_total)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {(top_products || []).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                <Typography variant="body2" color="text.secondary">{__('No product sales found for this duration.')}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1} sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('Top Customers by Sale Amount')}</Typography>
                        <Chip size="small" variant="outlined" label={`${__('Known customer sales')}: ${percent(summary.known_customer_grand_total, summary.grand_total)}`} />
                    </Stack>
                    <Box sx={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCustomerData} layout="vertical" margin={{ top: 8, right: 20, left: 48, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(value) => `$${money(value)}`} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                                <ChartTooltip formatter={(value) => `$${money(value)}`} />
                                <Legend />
                                <Bar dataKey="total" name={__('Sale Amount')} fill="#087f74" />
                                <Bar dataKey="net" name={__('Net After Returns')} fill="#2874bc" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>

            </Box>
        </MainLayout>
    );
}
