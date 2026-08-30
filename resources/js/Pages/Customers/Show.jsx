import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, Link, router, usePage } from '@/spa';
import {
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
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
    Typography,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    CalendarMonth as CalendarIcon,
    FilterAlt as FilterIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Home as HomeIcon,
    Receipt as ReceiptIcon,
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

export default function CustomerShow({
    auth,
    customer,
    branches = [],
    filters = {},
    summary = {},
    sales_trend = [],
    top_products = [],
    sales = [],
}) {
    const { translations = {} } = usePage().props;
    const __ = (key) => translations[key] || key;
    const [branchId, setBranchId] = useState(filters.branch_id || 'all');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const saleRows = sales?.data || sales || [];

    const money = (value) => Number(value || 0).toFixed(2);
    const percent = (value, total) => {
        const denominator = Number(total || 0);
        if (denominator <= 0) return '0.0%';

        return `${((Number(value || 0) / denominator) * 100).toFixed(1)}%`;
    };

    const formatDate = (value) => {
        if (!value) return '-';

        try {
            return new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }).format(new Date(value));
        } catch {
            return value;
        }
    };

    const formatDateTime = (value) => {
        if (!value) return '-';

        try {
            return new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(value));
        } catch {
            return value;
        }
    };

    const trendData = useMemo(() => (sales_trend || []).map((row) => ({
        period: row.period,
        sales: Number(row.sale_count || 0),
        total: Number(row.grand_total || 0),
        tax: Number(row.tax || 0),
    })), [sales_trend]);

    const topProductData = useMemo(() => (top_products || []).map((row) => ({
        name: row.product_name,
        amount: Number(row.sale_amount || 0),
        quantity: Number(row.quantity || 0),
        sales: Number(row.sale_count || 0),
    })), [top_products]);

    const applyFilters = (page = undefined) => {
        router.get(route('customers.show', customer.id), {
            branch_id: branchId || undefined,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
            page,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setBranchId('all');
        setFromDate('');
        setToDate('');
        router.get(route('customers.show', customer.id));
    };

    return (
        <MainLayout auth={auth} header={__('Customer Detail')}>
            <Head title={`${customer.name} - ${__('Customer Detail')}`} />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <Button
                            component={Link}
                            href={route('customers.index')}
                            variant="outlined"
                            size="small"
                            startIcon={<ArrowBackIcon />}
                            sx={{ flexShrink: 0 }}
                        >
                            {__('Back')}
                        </Button>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {__('Customer')}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 900 }} noWrap>
                                {customer.name}
                            </Typography>
                        </Box>
                    </Stack>
                    <Chip
                        icon={<CalendarIcon fontSize="small" />}
                        label={summary.last_sale_date ? `${__('Last sale')} ${formatDate(summary.last_sale_date)}` : __('No sales yet')}
                        variant="outlined"
                        sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                    />
                </Stack>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, gap: 2, mb: 2 }}>
                    <Paper sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <PersonIcon color="primary" fontSize="small" />
                                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{__('CUSTOMER PROFILE')}</Typography>
                            </Stack>
                            <Divider />
                            <Stack spacing={1.1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2">{customer.phone || __('No phone')}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2">{customer.email || __('No email')}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <HomeIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.2 }} />
                                    <Typography variant="body2">{customer.address || __('No address provided')}</Typography>
                                </Stack>
                            </Stack>
                            <Divider />
                            <Typography variant="caption" color="text.secondary">
                                {__('Created')} {formatDateTime(customer.created_at)}
                            </Typography>
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                            <ReceiptIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{__('CUSTOMER SALES REPORT')}</Typography>
                        </Stack>

                        <ReportFilterToolbar
                            ariaLabel={__('Customer sales filters')}
                            fieldKinds={['wide', 'date', 'date']}
                            onSubmit={applyFilters}
                            actions={(
                                <>
                                    <Button variant="contained" size="small" startIcon={<FilterIcon />} type="submit">{__('Apply')}</Button>
                                    <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>{__('Reset')}</Button>
                                    <CsvExportButton source={sales} dataKey="sales" filename="customer-sales.csv" />
                                </>
                            )}
                        >
                            <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '1 1 220px' }, minWidth: 0 }}>
                                <InputLabel>{__('Branch')}</InputLabel>
                                <Select value={branchId} label={__('Branch')} onChange={(event) => setBranchId(event.target.value)}>
                                    <MenuItem value="all">{__('All Accessible')}</MenuItem>
                                    {branches.map((branch) => (
                                        <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                size="small"
                                type="date"
                                label={__('From')}
                                value={fromDate}
                                onChange={(event) => setFromDate(event.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ flex: { xs: '1 1 100%', sm: '0 1 170px' } }}
                            />
                            <TextField
                                size="small"
                                type="date"
                                label={__('To')}
                                value={toDate}
                                onChange={(event) => setToDate(event.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ flex: { xs: '1 1 100%', sm: '0 1 170px' } }}
                            />
                        </ReportFilterToolbar>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1.2 }}>
                            {[
                                ['Sales', summary.sale_count || 0],
                                ['Gross Sales', `$${money(summary.grand_total)}`],
                                ['Returns', `$${money(summary.customer_returns)}`],
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
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.35fr 1fr' }, gap: 2, mb: 2 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>{__('Sales Trend')}</Typography>
                        <Box sx={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={formatDate} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `$${money(value)}`} />
                                    <ChartTooltip labelFormatter={formatDate} formatter={(value, name) => name === 'sales' ? value : `$${money(value)}`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" name={__('Sales Amount')} stroke="#087f74" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="tax" name={__('Tax')} stroke="#b77700" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>{__('Top Products')}</Typography>
                        <Box sx={{ height: 260, mb: 1 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProductData} layout="vertical" margin={{ top: 8, right: 20, left: 42, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(value) => `$${money(value)}`} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={128} />
                                    <ChartTooltip formatter={(value) => `$${money(value)}`} />
                                    <Legend />
                                    <Bar dataKey="amount" name={__('Sale Amount')} fill="#087f74" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                        <TableContainer sx={{ maxHeight: 210 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{__('Product')}</TableCell>
                                        <TableCell align="right">{__('Qty')}</TableCell>
                                        <TableCell align="right">{__('Amount')}</TableCell>
                                        <TableCell align="right">{__('Share')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(top_products || []).map((product) => (
                                        <TableRow key={product.product_id || product.product_name} hover>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 800 }}>{product.product_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{product.generic_name || __('No generic name')}</Typography>
                                            </TableCell>
                                            <TableCell align="right">{Number(product.quantity || 0).toFixed(2)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>${money(product.sale_amount)}</TableCell>
                                            <TableCell align="right">{percent(product.sale_amount, summary.grand_total)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {(top_products || []).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                                <Typography variant="body2" color="text.secondary">{__('No product sales found.')}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>

                <Paper sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{__('SALE HISTORY')}</Typography>
                        <Chip size="small" variant="outlined" label={`${__('Sales')}: ${sales.total ?? saleRows.length}`} />
                    </Stack>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{__('Invoice')}</TableCell>
                                    <TableCell>{__('Date')}</TableCell>
                                    <TableCell>{__('Branch')}</TableCell>
                                    <TableCell>{__('Sale Staff')}</TableCell>
                                    <TableCell>{__('Payment')}</TableCell>
                                    <TableCell align="right">{__('Total')}</TableCell>
                                    <TableCell align="right">{__('Tax')}</TableCell>
                                    <TableCell align="right">{__('Discount')}</TableCell>
                                    <TableCell align="right">{__('Grand')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {saleRows.map((sale) => (
                                    <TableRow key={sale.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{sale.invoice_number}</Typography>
                                            <Typography variant="caption" color="text.secondary">{sale.cashier_name}</Typography>
                                        </TableCell>
                                        <TableCell>{formatDateTime(sale.sale_date)}</TableCell>
                                        <TableCell>{sale.branch_name}</TableCell>
                                        <TableCell>{sale.sale_staff_name}</TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {__(sale.payment_method)} / {__(sale.payment_status)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">${money(sale.total_amount)}</TableCell>
                                        <TableCell align="right">${money(sale.tax)}</TableCell>
                                        <TableCell align="right">${money(sale.discount)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 900 }}>${money(sale.grand_total)}</TableCell>
                                    </TableRow>
                                ))}
                                {saleRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">{__('No sale history found for this customer.')}</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {Number(sales?.last_page || 1) > 1 && (
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
        </MainLayout>
    );
}
