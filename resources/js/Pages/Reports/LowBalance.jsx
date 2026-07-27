import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    Box,
    Button,
    Chip,
    FormControl,
    IconButton,
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
    Tooltip,
    Typography,
} from '@mui/material';
import {
    FilterAlt as FilterIcon,
    Inventory as StockIcon,
    RestartAlt as ResetIcon,
    Search as SearchIcon,
    WarningAmber as WarnIcon,
} from '@mui/icons-material';

export default function LowBalanceReport({ auth, branches = [], categories = [], items = [], summary = {}, filters = {} }) {
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [search, setSearch] = useState(filters.search ?? '');
    const [categoryId, setCategoryId] = useState(filters.category_id ?? '');
    const [productStatus, setProductStatus] = useState(filters.product_status ?? 'Active');
    const [stockStatus, setStockStatus] = useState(filters.stock_status ?? 'attention');

    const applyFilters = () => {
        router.get(
            route('reports.low-balance'),
            {
                branch_id: branchId || undefined,
                search: search || undefined,
                category_id: categoryId || undefined,
                product_status: productStatus || undefined,
                stock_status: stockStatus || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const resetFilters = () => {
        setBranchId(auth.user?.current_branch_id || '');
        setSearch('');
        setCategoryId('');
        setProductStatus('Active');
        setStockStatus('attention');
        router.get(route('reports.low-balance'));
    };

    const handleSearchKey = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyFilters();
        }
    };

    const statusChip = (status) => {
        if (status === 'Out of Stock') {
            return <Chip size="small" color="error" label={status} />;
        }

        if (status === 'Low Balance') {
            return <Chip size="small" color="warning" label={status} />;
        }

        return <Chip size="small" color="success" variant="outlined" label={status} />;
    };

    return (
        <MainLayout auth={auth} header="Low Balance Report">
            <Head title="Low Balance Report" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WarnIcon fontSize="small" color="warning" />
                            LOW BALANCE REPORT
                        </Typography>
                    </Stack>

                    <Box
                        sx={{
                            mb: 2,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            alignItems: 'center',
                            minWidth: 0,
                        }}
                    >
                        <FormControl
                            size="small"
                            sx={{
                                flex: { xs: '1 1 100%', sm: '1 1 210px', lg: '1 1 200px' },
                                minWidth: 0,
                                maxWidth: { lg: 280 },
                            }}
                        >
                            <InputLabel>Branch</InputLabel>
                            <Select value={branchId} label="Branch" onChange={(e) => setBranchId(e.target.value)}>
                                <MenuItem value="">Current Branch</MenuItem>
                                <MenuItem value="all">All Accessible</MenuItem>
                                {branches.map((branch) => (
                                    <MenuItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            label="Search Product"
                            placeholder="Name, generic, or barcode"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKey}
                            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
                            sx={{
                                flex: { xs: '1 1 100%', sm: '2 1 320px', lg: '2 1 300px' },
                                minWidth: 0,
                            }}
                        />

                        <FormControl
                            size="small"
                            sx={{
                                flex: { xs: '1 1 100%', sm: '1 1 180px', lg: '1 1 170px' },
                                minWidth: 0,
                                maxWidth: { lg: 240 },
                            }}
                        >
                            <InputLabel>Category</InputLabel>
                            <Select value={categoryId} label="Category" onChange={(e) => setCategoryId(e.target.value)}>
                                <MenuItem value="">All Categories</MenuItem>
                                {categories.map((category) => (
                                    <MenuItem key={category.id} value={category.id}>
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl
                            size="small"
                            sx={{
                                flex: { xs: '1 1 100%', sm: '1 1 165px', lg: '0 1 165px' },
                                minWidth: 0,
                            }}
                        >
                            <InputLabel>Product Status</InputLabel>
                            <Select value={productStatus} label="Product Status" onChange={(e) => setProductStatus(e.target.value)}>
                                <MenuItem value="Active">Active</MenuItem>
                                <MenuItem value="Inactive">Inactive</MenuItem>
                                <MenuItem value="all">All</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl
                            size="small"
                            sx={{
                                flex: { xs: '1 1 100%', sm: '1 1 175px', lg: '0 1 175px' },
                                minWidth: 0,
                            }}
                        >
                            <InputLabel>Stock Status</InputLabel>
                            <Select value={stockStatus} label="Stock Status" onChange={(e) => setStockStatus(e.target.value)}>
                                <MenuItem value="attention">Need Attention</MenuItem>
                                <MenuItem value="out">Out of Stock</MenuItem>
                                <MenuItem value="low">Low Balance</MenuItem>
                                <MenuItem value="all">All Stock</MenuItem>
                            </Select>
                        </FormControl>

                        <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                            sx={{
                                flex: { xs: '1 1 100%', sm: '0 0 auto' },
                                justifyContent: { xs: 'stretch', sm: 'flex-end' },
                                '& .MuiButton-root': {
                                    height: 40,
                                    px: 2,
                                    minWidth: { xs: 0, sm: 104 },
                                    flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 auto' },
                                },
                            }}
                        >
                            <Button variant="contained" size="small" startIcon={<FilterIcon />} onClick={applyFilters}>
                                Apply
                            </Button>
                            <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>
                                Reset
                            </Button>
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                        <Chip size="small" variant="outlined" label={`Items: ${summary.total || 0}`} />
                        <Chip size="small" color="error" variant="outlined" label={`Out: ${summary.out || 0}`} />
                        <Chip size="small" color="warning" variant="outlined" label={`Low: ${summary.low || 0}`} />
                        <Chip size="small" color="primary" variant="outlined" label={`Shortage: ${summary.shortage || 0}`} />
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Product / SKU</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Current</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Minimum</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Shortage</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                {item.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {[item.generic_name, item.barcode].filter(Boolean).join(' / ') || 'No barcode'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{item.category_name}</TableCell>
                                        <TableCell>{item.branch_name}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                                            {item.current_quantity}
                                        </TableCell>
                                        <TableCell align="right">{item.min_stock_level}</TableCell>
                                        <TableCell align="right" sx={{ color: item.shortage > 0 ? 'warning.main' : 'success.main', fontWeight: 800 }}>
                                            {item.shortage}
                                        </TableCell>
                                        <TableCell align="center">{statusChip(item.stock_status)}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="View stock">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    aria-label={`View stock for ${item.name}`}
                                                    onClick={() => router.visit(route('inventory.show', item.id))}
                                                >
                                                    <StockIcon fontSize="inherit" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                No low-balance items found for selected filters.
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
