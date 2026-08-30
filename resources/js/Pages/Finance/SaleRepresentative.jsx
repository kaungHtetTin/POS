import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, router, usePage } from '@/spa';
import {
    Avatar,
    Box,
    Button,
    Chip,
    FormControl,
    InputAdornment,
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
    Assessment as ReportIcon,
    FilterAlt as FilterIcon,
    Person as PersonIcon,
    RestartAlt as ResetIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export default function SaleRepresentative({
    auth,
    branches = [],
    filters = {},
    summary = {},
    sales_power_chart = [],
    representatives = {},
}) {
    const { translations = {} } = usePage().props;
    const __ = (key) => translations[key] || key;
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [duration, setDuration] = useState(filters.duration ?? 'month');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');
    const [search, setSearch] = useState(filters.search ?? '');

    const rows = representatives?.data || [];
    const money = (value) => Number(value || 0).toFixed(2);
    const formatMoney = (value) => money(value);

    const formatDate = (value) => {
        if (!value) return '-';
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(value));
    };

    const filterPayload = (page = undefined) => ({
        branch_id: branchId || undefined,
        duration: duration || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: search || undefined,
        page,
    });

    const applyFilters = (page = undefined) => {
        router.get(route('finance.sale-representative'), filterPayload(page), {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaultBranch = auth.user?.current_branch_id || '';
        setBranchId(defaultBranch);
        setDuration('month');
        setFromDate('');
        setToDate('');
        setSearch('');
        router.get(route('finance.sale-representative'));
    };

    const handleSearchKey = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyFilters();
        }
    };

    const summaryCards = useMemo(() => ([
        ['Representatives', summary.representative_count || 0],
        ['Active Representatives', summary.active_count || 0],
        ['Sales Count', summary.sales_count || 0],
        ['Sale Power', `$${money(summary.sale_power)}`],
        ['Average Sale', `$${money(summary.average_sale)}`],
    ]), [summary]);

    const salesPowerChartData = useMemo(() => {
        return (sales_power_chart || []).map((row) => ({
            name: row.name,
            sale_power: Number(row.sale_power || 0),
            sales_count: Number(row.sales_count || 0),
            average_sale: Number(row.average_sale || 0),
        }));
    }, [sales_power_chart]);

    const representativeNameTick = useMemo(() => {
        return (value) => {
            const text = String(value ?? '');
            if (text.length <= 14) return text;
            return `${text.slice(0, 13)}...`;
        };
    }, []);

    const representativeYAxisWidth = useMemo(() => {
        const maxLen = salesPowerChartData.reduce((max, row) => Math.max(max, String(row.name ?? '').length), 0);
        if (maxLen <= 10) return 72;
        if (maxLen <= 14) return 84;
        return 96;
    }, [salesPowerChartData]);

    const axisTick = { fontSize: 11 };
    const tooltipStyles = { fontSize: 12, padding: 8 };
    const legendStyles = { fontSize: 11, lineHeight: '12px' };
    const chartHeight = Math.max(220, Math.min(360, salesPowerChartData.length * 26 + 72));

    return (
        <MainLayout auth={auth} header={__('Sale Representative')}>
            <Head title={__('Sale Representative')} />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {__('Finance')}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>
                            {__('Sale Representative')}
                        </Typography>
                    </Box>
                    <Chip
                        icon={<ReportIcon />}
                        label={`${__('Sale Power')} ${money(summary.sale_power)}`}
                        color="primary"
                        variant="outlined"
                        sx={{ height: 36, alignSelf: { xs: 'flex-start', md: 'center' } }}
                    />
                </Stack>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <FilterIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('SALE REPRESENTATIVE FILTERS')}</Typography>
                    </Stack>

                    <ReportFilterToolbar
                        ariaLabel={__('Sale representative filters')}
                        fieldKinds={['wide', 'select', 'date', 'date', 'search']}
                        onSubmit={() => applyFilters()}
                        actions={(
                            <>
                                <Button variant="contained" size="small" startIcon={<FilterIcon />} type="submit">{__('Apply')}</Button>
                                <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>{__('Reset')}</Button>
                                <CsvExportButton source={representatives} dataKey="representatives" filename="sale-representatives.csv" />
                            </>
                        )}
                    >
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '1 1 220px' }, minWidth: 0 }}>
                            <InputLabel>{__('Branch')}</InputLabel>
                            <Select value={branchId} label={__('Branch')} onChange={(event) => setBranchId(event.target.value)}>
                                <MenuItem value="">{__('Current Branch')}</MenuItem>
                                <MenuItem value="all">{__('All Accessible')}</MenuItem>
                                {branches.map((branch) => (
                                    <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' }, minWidth: 0 }}>
                            <InputLabel>{__('Duration')}</InputLabel>
                            <Select value={duration} label={__('Duration')} onChange={(event) => setDuration(event.target.value)}>
                                <MenuItem value="week">{__('This week')}</MenuItem>
                                <MenuItem value="month">{__('This month')}</MenuItem>
                                <MenuItem value="year">{__('This year')}</MenuItem>
                                <MenuItem value="custom">{__('Custom')}</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            type="date"
                            label={__('From')}
                            value={fromDate}
                            onChange={(event) => {
                                setFromDate(event.target.value);
                                setDuration('custom');
                            }}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' } }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label={__('To')}
                            value={toDate}
                            onChange={(event) => {
                                setToDate(event.target.value);
                                setDuration('custom');
                            }}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: '1 1 100%', sm: '0 1 160px' } }}
                        />
                        <TextField
                            size="small"
                            label={__('Search')}
                            placeholder={__('Name, email, phone, branch')}
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
                            sx={{ flex: { xs: '1 1 100%', lg: '2 1 260px' }, minWidth: 0 }}
                        />
                    </ReportFilterToolbar>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(5, 1fr)' }, gap: 1.2 }}>
                        {summaryCards.map(([label, value]) => (
                            <Paper key={label} variant="outlined" sx={{ p: 1.25 }}>
                                <Typography variant="caption" color="text.secondary">{__(label)}</Typography>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{value}</Typography>
                            </Paper>
                        ))}
                    </Box>
                </Paper>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <ReportIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('STAFF SALES POWER')}</Typography>
                    </Stack>

                    {salesPowerChartData.length > 0 ? (
                        <Box sx={{ height: chartHeight }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={salesPowerChartData}
                                    layout="vertical"
                                    margin={{ top: 6, right: 16, bottom: 6, left: 0 }}
                                    barSize={12}
                                >
                                    <CartesianGrid strokeDasharray="2 2" />
                                    <XAxis type="number" tickFormatter={formatMoney} tick={axisTick} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={representativeYAxisWidth}
                                        tick={axisTick}
                                        tickFormatter={representativeNameTick}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip formatter={(value) => formatMoney(value)} contentStyle={tooltipStyles} />
                                    <Legend iconSize={8} wrapperStyle={legendStyles} />
                                    <Bar dataKey="sale_power" name={__('Sale Power')} fill="#2e7d32" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    ) : (
                        <Box sx={{ py: 5, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {__('No staff sales data for selected filters.')}
                            </Typography>
                        </Box>
                    )}
                </Paper>

                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <ReportIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{__('SALE REPRESENTATIVE LIST')}</Typography>
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Representative')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Role')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Branch')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Contact')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">{__('Sale Power')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">{__('Sales')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">{__('Average Sale')}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{__('Last Sale')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((representative) => (
                                    <TableRow key={representative.id} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.25} alignItems="center">
                                                <Avatar
                                                    src={representative.image_path ? `/storage/${representative.image_path}` : null}
                                                    sx={{ width: 32, height: 32 }}
                                                >
                                                    <PersonIcon fontSize="small" />
                                                </Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{representative.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{representative.email}</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                {(representative.roles || []).map((role) => (
                                                    <Chip
                                                        key={role.id}
                                                        label={role.name}
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                        sx={{ height: 20, fontSize: 10 }}
                                                    />
                                                ))}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{representative.branch?.name || '-'}</Typography>
                                            {(representative.branches || []).length > 1 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {(representative.branches || []).map((branch) => branch.name).join(', ')}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{representative.phone || 'N/A'}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                                ${money(representative.sale_power)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">{representative.sales_count || 0}</TableCell>
                                        <TableCell align="right">${money(representative.average_sale)}</TableCell>
                                        <TableCell>{formatDate(representative.last_sale_at)}</TableCell>
                                    </TableRow>
                                ))}
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">{__('No sale representatives found for selected filters.')}</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {Number(representatives.last_page || 1) > 1 && (
                        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Pagination
                                size="small"
                                count={representatives.last_page}
                                page={representatives.current_page}
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
