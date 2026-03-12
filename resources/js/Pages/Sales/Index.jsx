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
    Search as SearchIcon,
    Receipt as SalesIcon,
    FilterAlt as FilterIcon,
} from '@mui/icons-material';

export default function SalesIndex({ auth, sales, branches, filters }) {
    const [branchId, setBranchId] = useState(filters?.branch_id || auth.user?.current_branch_id || '');
    
    // Default to current month
    const defaultFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const defaultTo = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    const [fromDate, setFromDate] = useState(filters?.from_date || defaultFrom);
    const [toDate, setToDate] = useState(filters?.to_date || defaultTo);
    const [search, setSearch] = useState(filters?.search || '');
    const [quickRange, setQuickRangeState] = useState(filters?.from_date === defaultFrom && filters?.to_date === defaultTo ? 'month' : '');

    const setQuickRange = (range) => {
        setQuickRangeState(range);
        const today = new Date();
        let from = new Date();
        let to = new Date();

        switch (range) {
            case 'today':
                from = today;
                to = today;
                break;
            case 'month':
                from = new Date(today.getFullYear(), today.getMonth(), 1);
                to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'year':
                from = new Date(today.getFullYear(), 0, 1);
                to = new Date(today.getFullYear(), 11, 31);
                break;
            case 'all':
                from = new Date(2000, 0, 1); // Far past
                to = new Date(2100, 11, 31); // Far future
                break;
            default:
                return;
        }

        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0];
        
        setFromDate(fromStr);
        setToDate(toStr);

        // Auto-apply after selecting quick range
        router.get(
            route('sales.index'),
            {
                branch_id: branchId || undefined,
                from_date: fromStr,
                to_date: toStr,
                search: search || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const totalGrand = useMemo(() => {
        return (sales || []).reduce((sum, s) => sum + Number(s.grand_total || 0), 0);
    }, [sales]);

    const applyFilters = () => {
        router.get(
            route('sales.index'),
            {
                branch_id: branchId || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                search: search || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const clearFilters = () => {
        const today = new Date().toISOString().split('T')[0];
        setSearch('');
        setFromDate(today);
        setToDate(today);
        setBranchId(auth.user?.current_branch_id || '');
        router.get(route('sales.index'));
    };

    const money = (n) => Number(n || 0).toFixed(2);

    const formatDateTime = (value) => {
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

    return (
        <MainLayout auth={auth} header="Sales">
            <Head title="Sales" />

            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SalesIcon fontSize="small" color="primary" />
                            SALES LIST
                        </Typography>
                    </Stack>

                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        <TextField
                            size="small"
                            placeholder="Search invoice..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />,
                            }}
                            sx={{ flex: '1 1 280px', minWidth: { xs: '100%', sm: 280 } }}
                        />

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

                        <FormControl size="small" sx={{ flex: '1 1 150px', minWidth: { xs: '100%', sm: 150 } }}>
                            <InputLabel>Quick Range</InputLabel>
                            <Select 
                                value={quickRange} 
                                label="Quick Range" 
                                onChange={(e) => setQuickRange(e.target.value)}
                            >
                                <MenuItem value="today">Today</MenuItem>
                                <MenuItem value="month">Current Month</MenuItem>
                                <MenuItem value="year">Current Year</MenuItem>
                                <MenuItem value="all">All Time</MenuItem>
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
                        <Chip size="small" variant="outlined" label={`Entries: ${(sales || []).length}`} />
                        <Chip size="small" variant="outlined" label={`Total: ${money(totalGrand)}`} color="primary" />
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Invoice</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Cashier</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
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
                                    <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(sales || []).map((s) => (
                                    <TableRow key={s.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                                {s.invoice_number}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.branch?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.user?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.customer?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{formatDateTime(s.sale_date)}</Typography>
                                        </TableCell>
                                        <TableCell align="right">{money(s.total_amount)}</TableCell>
                                        <TableCell align="right">{money(s.tax)}</TableCell>
                                        <TableCell align="right">{money(s.discount)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                                            {money(s.grand_total)}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.payment_method} / {s.payment_status}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {(sales || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No sales found for selected filters.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>
        </MainLayout>
    );
}

