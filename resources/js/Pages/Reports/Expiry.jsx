import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
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
    RestartAlt as ResetIcon,
    WarningAmber as WarnIcon,
} from '@mui/icons-material';

export default function ExpiryReport({ auth, branches = [], products = [], batches = [], filters = {} }) {
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [productId, setProductId] = useState(filters.product_id ?? '');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');

    const applyFilters = () => {
        router.get(
            route('reports.expiry'),
            {
                branch_id: branchId || undefined,
                product_id: productId || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const resetFilters = () => {
        setBranchId(auth.user?.current_branch_id || '');
        setProductId('');
        setFromDate('');
        setToDate('');
        router.get(route('reports.expiry'));
    };

    const summary = useMemo(() => {
        const total = batches.length;
        const expired = batches.filter((b) => b.days_left < 0).length;
        const near30 = batches.filter((b) => b.days_left >= 0 && b.days_left <= 30).length;
        return { total, expired, near30 };
    }, [batches]);

    return (
        <MainLayout auth={auth} header="Expiry Report">
            <Head title="Expiry Report" />

            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WarnIcon fontSize="small" color="warning" />
                            EXPIRY REPORT
                        </Typography>
                    </Stack>

                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 220, flex: '1 1 220px' }}>
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

                        <FormControl size="small" sx={{ minWidth: 260, flex: '1 1 260px' }}>
                            <InputLabel>Product</InputLabel>
                            <Select value={productId} label="Product" onChange={(e) => setProductId(e.target.value)}>
                                <MenuItem value="">All Products</MenuItem>
                                {products.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            type="date"
                            label="From Expiry Date"
                            InputLabelProps={{ shrink: true }}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            sx={{ minWidth: 185 }}
                        />

                        <TextField
                            size="small"
                            type="date"
                            label="To Expiry Date"
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            sx={{ minWidth: 185 }}
                        />

                        <Button variant="contained" size="small" startIcon={<FilterIcon />} onClick={applyFilters}>
                            Apply
                        </Button>
                        <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>
                            Reset
                        </Button>
                    </Box>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                        <Chip size="small" variant="outlined" label={`Total Batches: ${summary.total}`} />
                        <Chip size="small" color="error" variant="outlined" label={`Expired: ${summary.expired}`} />
                        <Chip size="small" color="warning" variant="outlined" label={`<=30 days: ${summary.near30}`} />
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Batch #</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Qty</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Expiry Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {batches.map((b) => (
                                    <TableRow key={b.id} hover>
                                        <TableCell>{b.batch_number}</TableCell>
                                        <TableCell>{b.product_name}</TableCell>
                                        <TableCell>{b.branch_name}</TableCell>
                                        <TableCell align="right">{b.quantity}</TableCell>
                                        <TableCell>{b.expiry_date}</TableCell>
                                        <TableCell align="center">
                                            {b.days_left < 0 ? (
                                                <Chip size="small" color="error" label="Expired" />
                                            ) : b.days_left <= 30 ? (
                                                <Chip size="small" color="warning" label={`${b.days_left} days left`} />
                                            ) : (
                                                <Chip size="small" variant="outlined" label={`${b.days_left} days left`} />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {batches.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                No batches found for selected filters.
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
