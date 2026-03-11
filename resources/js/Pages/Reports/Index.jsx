import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router } from '@inertiajs/react';
import {
    Box,
    Button,
    Chip,
    Divider,
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
    Assessment as ReportsIcon,
    CalendarMonth as CalendarIcon,
    FilterAlt as FilterIcon,
} from '@mui/icons-material';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export default function ReportsIndex({
    auth,
    branches,
    filters,
    summary,
    sales_trend,
    profit_trend,
    expenses_by_category,
    branch_performance,
    expiring_batches,
}) {
    const [branchId, setBranchId] = useState(filters?.branch_id || auth.user?.current_branch_id || '');
    const [fromDate, setFromDate] = useState(filters?.from_date || new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(filters?.to_date || new Date().toISOString().split('T')[0]);
    const [groupBy, setGroupBy] = useState(filters?.group_by || 'daily');
    const [expiryDays, setExpiryDays] = useState(filters?.expiry_days || 30);

    const applyFilters = () => {
        router.get(
            route('reports.index'),
            {
                branch_id: branchId || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                group_by: groupBy || undefined,
                expiry_days: expiryDays || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const clearFilters = () => {
        const today = new Date().toISOString().split('T')[0];
        setFromDate(today);
        setToDate(today);
        setGroupBy('daily');
        setExpiryDays(30);
        router.get(route('reports.index'));
    };

    const money = (n) => Number(n || 0).toFixed(2);

    const netSales = useMemo(() => {
        return Number(summary?.grand_total || 0) - Number(summary?.tax || 0);
    }, [summary]);

    const salesTrendData = useMemo(() => {
        return (sales_trend || []).map((row) => {
            const grandTotal = Number(row.grand_total || 0);
            const tax = Number(row.tax || 0);
            return {
                period: row.period,
                grand_total: grandTotal,
                tax,
                net_sales: grandTotal - tax,
                discount: Number(row.discount || 0),
                total_amount: Number(row.total_amount || 0),
            };
        });
    }, [sales_trend]);

    const expensesCategoryChartData = useMemo(() => {
        return (expenses_by_category || []).slice(0, 12).map((row) => ({
            name: row.category_name,
            total: Number(row.total || 0),
        }));
    }, [expenses_by_category]);

    const expensesCategoryTotal = useMemo(() => {
        return expensesCategoryChartData.reduce((sum, row) => sum + Number(row.total || 0), 0);
    }, [expensesCategoryChartData]);

    const branchPerformanceChartData = useMemo(() => {
        return (branch_performance || []).slice(0, 12).map((row) => ({
            name: row.branch_name,
            grand_total: Number(row.grand_total || 0),
            tax: Number(row.tax || 0),
            total_amount: Number(row.total_amount || 0),
        }));
    }, [branch_performance]);

    const profitTrendData = useMemo(() => {
        return (profit_trend || []).map((row) => ({
            period: row.period,
            net_sales: Number(row.net_sales || 0),
            customer_returns: Number(row.customer_returns || 0),
            cogs: Number(row.cogs || 0),
            expenses_total: Number(row.expenses_total || 0),
            gross_profit: Number(row.gross_profit || 0),
            net_profit: Number(row.net_profit || 0),
        }));
    }, [profit_trend]);

    const formatMoney = (value) => money(value);
    const pieColors = ['#1976d2', '#6a1b9a', '#2e7d32', '#f57c00', '#0288d1', '#7b1fa2', '#388e3c', '#ef6c00', '#455a64', '#c2185b', '#5d4037', '#00796b'];

    return (
        <MainLayout auth={auth} header="Reports">
            <Head title="Reports" />

            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ReportsIcon fontSize="small" color="primary" />
                            REPORTING ENGINE
                        </Typography>
                    </Stack>

                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ flex: '1 1 240px', minWidth: { xs: '100%', sm: 240 } }}>
                            <InputLabel>Branch</InputLabel>
                            <Select value={branchId} label="Branch" onChange={(e) => setBranchId(e.target.value)}>
                                <MenuItem value="">Current Branch</MenuItem>
                                <MenuItem value="all">All Accessible</MenuItem>
                                {branches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>
                                        {b.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            type="date"
                            label="From"
                            InputLabelProps={{ shrink: true }}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            sx={{ flex: '1 1 170px', minWidth: { xs: '100%', sm: 170 } }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="To"
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            sx={{ flex: '1 1 170px', minWidth: { xs: '100%', sm: 170 } }}
                        />

                        <FormControl size="small" sx={{ flex: '1 1 170px', minWidth: { xs: '100%', sm: 170 } }}>
                            <InputLabel>Group By</InputLabel>
                            <Select value={groupBy} label="Group By" onChange={(e) => setGroupBy(e.target.value)}>
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            type="number"
                            label="Expiry Days"
                            value={expiryDays}
                            onChange={(e) => setExpiryDays(e.target.value)}
                            inputProps={{ min: 1, max: 365, step: 1 }}
                            sx={{ flex: '1 1 160px', minWidth: { xs: '100%', sm: 160 } }}
                        />

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<FilterIcon fontSize="small" />}
                            onClick={applyFilters}
                            sx={{ minWidth: 120, width: { xs: '100%', sm: 'auto' } }}
                        >
                            Apply
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={clearFilters}
                            sx={{ minWidth: 120, width: { xs: '100%', sm: 'auto' } }}
                        >
                            Reset
                        </Button>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                        <Chip size="small" variant="outlined" label={`Sales: ${summary?.sales_count || 0}`} />
                        <Chip size="small" variant="outlined" label={`Gross Total: ${money(summary?.grand_total)}`} color="primary" />
                        <Chip size="small" variant="outlined" label={`Tax: ${money(summary?.tax)}`} />
                        <Chip size="small" variant="outlined" label={`Discount: ${money(summary?.discount)}`} />
                        <Chip size="small" variant="outlined" label={`Net Sales (ex tax): ${money(netSales)}`} />
                        <Chip size="small" variant="outlined" label={`Customer Returns: ${money(summary?.customer_returns)}`} />
                        <Chip size="small" variant="outlined" label={`COGS: ${money(summary?.cogs)}`} />
                        <Chip size="small" variant="outlined" label={`Expenses: ${money(summary?.expenses_total)}`} />
                        <Chip size="small" variant="outlined" label={`Gross Profit: ${money(summary?.gross_profit)}`} color="success" />
                        <Chip size="small" variant="outlined" label={`Net Profit: ${money(summary?.net_profit)}`} color="success" />
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
                        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                Sales Trend ({groupBy})
                            </Typography>
                            <Box sx={{ height: 280, mb: 1.5 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={salesTrendData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="period" />
                                        <YAxis tickFormatter={formatMoney} />
                                        <Tooltip formatter={(v) => formatMoney(v)} />
                                        <Legend />
                                        <Line type="monotone" dataKey="grand_total" name="Gross Total" stroke="#1976d2" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="tax" name="Tax" stroke="#f57c00" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="net_sales" name="Net Sales" stroke="#2e7d32" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                            <TableContainer sx={{ maxHeight: 260 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <CalendarIcon fontSize="small" />
                                                    <span>Period</span>
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Total
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Tax
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Discount
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Grand
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(sales_trend || []).map((row) => (
                                            <TableRow key={row.period} hover>
                                                <TableCell>
                                                    <Typography variant="caption">{row.period}</Typography>
                                                </TableCell>
                                                <TableCell align="right">{money(row.total_amount)}</TableCell>
                                                <TableCell align="right">{money(row.tax)}</TableCell>
                                                <TableCell align="right">{money(row.discount)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {money(row.grand_total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(sales_trend || []).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="text.secondary italic">
                                                        No sales data for selected range.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                Profit Trend ({groupBy})
                            </Typography>
                            <Box sx={{ height: 280, mb: 1.5 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={profitTrendData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="period" />
                                        <YAxis tickFormatter={formatMoney} />
                                        <Tooltip formatter={(v) => formatMoney(v)} />
                                        <Legend />
                                        <Line type="monotone" dataKey="gross_profit" name="Gross Profit" stroke="#2e7d32" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="net_profit" name="Net Profit" stroke="#6a1b9a" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                            <TableContainer sx={{ maxHeight: 260 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Net Sales
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Gross
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Net
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(profit_trend || []).map((row) => (
                                            <TableRow key={row.period} hover>
                                                <TableCell>
                                                    <Typography variant="caption">{row.period}</Typography>
                                                </TableCell>
                                                <TableCell align="right">{money(row.net_sales)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {money(row.gross_profit)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {money(row.net_profit)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(profit_trend || []).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="text.secondary italic">
                                                        No profit data for selected range.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                Expenses By Category
                            </Typography>
                            <Box sx={{ height: 280, mb: 1.5 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                        <Tooltip
                                            formatter={(v, _name, props) => {
                                                const value = Number(v || 0);
                                                const pct = expensesCategoryTotal > 0 ? (value / expensesCategoryTotal) * 100 : 0;
                                                return [`${money(value)} (${pct.toFixed(1)}%)`, props?.payload?.name || 'Total'];
                                            }}
                                        />
                                        <Legend />
                                        <Pie
                                            data={expensesCategoryChartData}
                                            dataKey="total"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={100}
                                            paddingAngle={2}
                                        >
                                            {expensesCategoryChartData.map((entry, index) => (
                                                <Cell key={`${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                            <TableContainer sx={{ maxHeight: 260 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Total
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(expenses_by_category || []).map((row) => (
                                            <TableRow key={row.category_name} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {row.category_name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {money(row.total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(expenses_by_category || []).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={2} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="text.secondary italic">
                                                        No expenses data for selected range.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                Branch Performance
                            </Typography>
                            <Box sx={{ height: 280, mb: 1.5 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={branchPerformanceChartData}
                                        layout="vertical"
                                        margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={formatMoney} />
                                        <YAxis type="category" dataKey="name" width={140} />
                                        <Tooltip formatter={(v) => formatMoney(v)} />
                                        <Legend />
                                        <Bar dataKey="grand_total" name="Gross Total" fill="#1976d2" />
                                        <Bar dataKey="tax" name="Tax" fill="#f57c00" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                            <TableContainer sx={{ maxHeight: 260 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Sales
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Tax
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Discount
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Grand
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(branch_performance || []).map((row) => (
                                            <TableRow key={row.branch_id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                        {row.branch_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Sales: {row.sales_count}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">{money(row.total_amount)}</TableCell>
                                                <TableCell align="right">{money(row.tax)}</TableCell>
                                                <TableCell align="right">{money(row.discount)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {money(row.grand_total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(branch_performance || []).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="text.secondary italic">
                                                        No branch data for selected range.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, gridColumn: { xs: 'auto', lg: '1 / -1' } }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                                Inventory Valuation & Expiry Forecast
                            </Typography>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                                <Chip size="small" variant="outlined" label={`Purchase Value: ${money(summary?.inventory_purchase_value)}`} />
                                <Chip size="small" variant="outlined" label={`Selling Value: ${money(summary?.inventory_selling_value)}`} />
                                <Chip size="small" variant="outlined" label={`Expiring <= ${expiryDays} days`} />
                            </Stack>

                            <TableContainer sx={{ maxHeight: 360 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Expiry</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Qty
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(expiring_batches || []).map((b) => (
                                            <TableRow key={b.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {b.product?.name || '-'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {b.branch?.name || ''}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption">{b.batch_number}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption">{b.expiry_date}</Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {b.quantity}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(expiring_batches || []).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body2" color="text.secondary italic">
                                                        No expiring batches found for selected settings.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Box>

                    <Divider sx={{ mt: 2, mb: 2 }} />

                    <Typography variant="caption" color="text.secondary">
                        Net sales is calculated as (Grand Total - Tax). Net profit is (Net sales - Customer Returns - COGS - Expenses).
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Supplier returns are shown as refund totals and do not alter sales revenue metrics.
                    </Typography>
                </Paper>
            </Box>
        </MainLayout>
    );
}
