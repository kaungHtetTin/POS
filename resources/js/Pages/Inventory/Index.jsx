import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import MergedTablePanel from '@/Components/MergedTablePanel';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, Link, router } from '@/spa';
import {
    Box,
    Stack,
    Typography,
    TextField,
    InputAdornment,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    IconButton,
    Pagination,
    Tooltip,
} from '@mui/material';
import {
    Search as SearchIcon,
    Inventory as StockIcon,
    FilterList as FilterIcon,
    Store as BranchIcon,
    Category as CategoryIcon,
    InfoOutlined as StatusIcon,
    Refresh as ResetIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';

export default function InventoryIndex({ auth, inventory, branches, categories, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [branchId, setBranchId] = useState(filters?.branch_id || '');
    const [categoryId, setCategoryId] = useState(filters?.category_id || '');
    const [productStatus, setProductStatus] = useState(filters?.product_status || '');
    const [stockStatus, setStockStatus] = useState(filters?.stock_status || '');
    const inventoryRows = inventory?.data || inventory || [];

    const applyFilters = (newFilters = {}) => {
        const query = {
            search,
            branch_id: branchId,
            category_id: categoryId,
            product_status: productStatus,
            stock_status: stockStatus,
            ...newFilters,
        };
        router.get(route('inventory.index'), query, { preserveState: true, replace: true });
    };

    const handleSearch = () => applyFilters();

    const handleReset = () => {
        setSearch('');
        setBranchId('');
        setCategoryId('');
        setProductStatus('');
        setStockStatus('');
        router.get(route('inventory.index'), {}, { replace: true });
    };

    const detailUrl = (productId) => route('inventory.show', {
        product: productId,
        ...(branchId ? { branch_id: branchId } : {}),
    });

    return (
        <MainLayout auth={auth} header="Inventory Stock Reports">
            <Head title="Inventory" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <MergedTablePanel
                    eyebrow="Stock Control"
                    title="Stock Level Reports"
                    icon={<StockIcon color="primary" fontSize="small" />}
                    meta={
        <Typography variant="body2" color="text.secondary">
                            {inventory?.total ?? inventoryRows.length} records
                        </Typography>
                    }
                    filters={
                        <ReportFilterToolbar
                            ariaLabel="Inventory filters"
                            fieldKinds={['search', 'wide', 'wide', 'select', 'select']}
                            onSubmit={handleSearch}
                            sx={{ mb: 0 }}
                            actions={(
                                <>
                                    <Button variant="contained" type="submit" startIcon={<FilterIcon />}>Apply</Button>
                                    <Button variant="outlined" onClick={handleReset} startIcon={<ResetIcon />}>Reset</Button>
                                    <CsvExportButton source={inventory} dataKey="inventory" filename="inventory.csv" />
                                </>
                            )}
                        >
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search medicine name, generic, or barcode..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                select
                                size="small"
                                label="Branch"
                                value={branchId}
                                onChange={(e) => setBranchId(e.target.value)}
                                sx={{ minWidth: 180, flex: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <BranchIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            >
                                <MenuItem value="">All Branches (Global)</MenuItem>
                                {branches.map(branch => (
                                    <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                size="small"
                                label="Category"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                sx={{ minWidth: 180, flex: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <CategoryIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            >
                                <MenuItem value="">All Categories</MenuItem>
                                {categories.map(cat => (
                                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                size="small"
                                label="Product Status"
                                value={productStatus}
                                onChange={(e) => setProductStatus(e.target.value)}
                                sx={{ minWidth: 160, flex: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <StatusIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            >
                                <MenuItem value="">All Statuses</MenuItem>
                                <MenuItem value="Active">Active Products</MenuItem>
                                <MenuItem value="Inactive">Inactive Products</MenuItem>
                            </TextField>

                            <TextField
                                select
                                size="small"
                                label="Stock Level"
                                value={stockStatus}
                                onChange={(e) => setStockStatus(e.target.value)}
                                sx={{ minWidth: 160, flex: 1 }}
                            >
                                <MenuItem value="">Any Stock Level</MenuItem>
                                <MenuItem value="In Stock">In Stock</MenuItem>
                                <MenuItem value="Low Stock">Low Stock</MenuItem>
                                <MenuItem value="Out of Stock">Out of Stock</MenuItem>
                            </TextField>
                        </ReportFilterToolbar>
                    }
                >
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Medicine Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Barcode</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Min Level</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Current Stock</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Stock Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Product Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {inventoryRows.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{item.generic_name || '-'}</Typography>
                                        </TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell variant="caption">{item.barcode || '-'}</TableCell>
                                        <TableCell align="right">{item.min_stock_level}</TableCell>
                                        <TableCell 
                                            align="right" 
                                            sx={{ 
                                                fontWeight: 'bold', 
                                                color: item.current_stock <= 0 ? 'error.main' : (item.current_stock < item.min_stock_level ? 'warning.main' : 'success.main')
                                            }}
                                        >
                                            {item.current_stock}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                size="small" 
                                                label={item.stock_status} 
                                                color={item.current_stock <= 0 ? 'error' : (item.current_stock < item.min_stock_level ? 'warning' : 'success')}
                                                variant="outlined"
                                                sx={{ minWidth: 90 }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                size="small" 
                                                label={item.product_status} 
                                                color={item.product_status === 'Active' ? 'success' : 'default'}
                                                sx={{ height: 20, fontSize: '11px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="View batch details">
                                                <IconButton size="small" component={Link} href={detailUrl(item.id)}>
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {inventoryRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No inventory records found for the selected filters.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {Number(inventory?.last_page || 1) > 1 && (
                        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Pagination
                                size="small"
                                count={inventory.last_page}
                                page={inventory.current_page}
                                onChange={(event, page) => applyFilters({ page })}
                                color="primary"
                            />
                        </Stack>
                    )}
                </MergedTablePanel>
            </Box>
        </MainLayout>
    );
}
