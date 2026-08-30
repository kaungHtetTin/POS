import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, Link, router } from '@/spa';
import {
    Alert,
    Box,
    Button,
    Chip,
    InputAdornment,
    MenuItem,
    Paper,
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
    ArrowBack as BackIcon,
    Category as CategoryIcon,
    Inventory as StockIcon,
    QrCode as BarcodeIcon,
    Store as BranchIcon,
    WarningAmber as WarningIcon,
} from '@mui/icons-material';

export default function InventoryShow({ auth, product, branches, branchGroups, summary, filters }) {
    const selectedBranchId = filters?.branch_id || '';
    const hasQuantityMismatch = Number(summary?.quantity_difference || 0) !== 0;

    const handleBranchChange = (branchId) => {
        router.get(
            route('inventory.show', product.id),
            branchId ? { branch_id: branchId } : {},
            { preserveState: true, replace: true }
        );
    };

    const stockColor = (status) => {
        if (status === 'Out of Stock') return 'error';
        if (status === 'Low Stock') return 'warning';
        return 'success';
    };

    const formatDate = (value) => value || '-';
    const formatMoney = (value) => Number(value || 0).toFixed(2);

    return (
        <MainLayout auth={auth} header="Inventory Detail">
            <Head title={`${product.name} Inventory`} />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
                    <Button
                        component={Link}
                        href={route('inventory.index', selectedBranchId ? { branch_id: selectedBranchId } : {})}
                        startIcon={<BackIcon />}
                        variant="outlined"
                        sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                    >
                        Back
                    </Button>

                    <TextField
                        select
                        size="small"
                        label="Branch"
                        value={selectedBranchId}
                        onChange={(event) => handleBranchChange(event.target.value)}
                        sx={{ minWidth: { xs: '100%', sm: 260 } }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <BranchIcon fontSize="small" color="action" />
                                </InputAdornment>
                            ),
                        }}
                    >
                        <MenuItem value="">All Branches</MenuItem>
                        {branches.map((branch) => (
                            <MenuItem key={branch.id} value={branch.id}>
                                {branch.name}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                        <Box>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <StockIcon color="primary" />
                                {product.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {product.generic_name || '-'}
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip icon={<CategoryIcon />} label={product.category} size="small" variant="outlined" />
                            <Chip icon={<BarcodeIcon />} label={product.barcode || '-'} size="small" variant="outlined" />
                            <Chip label={product.status} size="small" color={product.status === 'Active' ? 'success' : 'default'} />
                            <Chip label={summary.stock_status} size="small" color={stockColor(summary.stock_status)} variant="outlined" />
                        </Stack>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Aggregate Stock</Typography>
                            <Typography variant="h6">{summary.aggregate_quantity}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Batch Stock</Typography>
                            <Typography variant="h6">{summary.batch_quantity}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Minimum Level</Typography>
                            <Typography variant="h6">{product.min_stock_level}</Typography>
                        </Box>
                    </Stack>
                </Paper>

                {hasQuantityMismatch && (
                    <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                        Aggregate stock and batch stock differ by {summary.quantity_difference}.
                    </Alert>
                )}

                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
                        <CsvExportButton source={branchGroups.flatMap((group) => (group.batches || []).map((batch) => ({ ...batch, branch: group.branch?.name })))} filename="inventory-batches.csv" />
                    </Stack>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Batch Number</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Expiry Date</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Quantity</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Purchase Price</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Selling Price</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {branchGroups.map((group) => (
                                    <React.Fragment key={group.branch?.id || 'unassigned'}>
                                        <TableRow>
                                            <TableCell colSpan={5} sx={{ bgcolor: 'action.hover', fontWeight: 700 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                        {group.branch?.name || 'Unassigned Branch'}
                                                    </Typography>
                                                    <Chip size="small" label={`Total: ${group.total_quantity}`} variant="outlined" />
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                        {group.batches.map((batch) => (
                                            <TableRow key={batch.id} hover>
                                                <TableCell>{batch.batch_number || '-'}</TableCell>
                                                <TableCell>{formatDate(batch.expiry_date)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {batch.quantity}
                                                </TableCell>
                                                <TableCell align="right">{formatMoney(batch.purchase_price)}</TableCell>
                                                <TableCell align="right">{formatMoney(batch.selling_price)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                ))}

                                {branchGroups.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                No active batches found for this product.
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
