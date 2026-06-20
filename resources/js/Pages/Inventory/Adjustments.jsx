import React, { useState, useEffect } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
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
    Alert,
} from '@mui/material';
import {
    Add as AddIcon,
    Close as CloseIcon,
    History as HistoryIcon,
    Search as SearchIcon,
    SwapHoriz as AdjustmentIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';

export default function InventoryAdjustments({ auth, adjustments, products, branches, filters }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(filters?.search || '');
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        branch_id: auth.user?.current_branch_id || auth.user?.branch_id || branches[0]?.id || '',
        product_id: '',
        inventory_batch_id: '',
        adjustment_type: 'Damage',
        quantity: '',
        reason: '',
        adjustment_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (data.product_id && data.branch_id) {
            setLoadingBatches(true);
            fetch(route('inventory.batches.get', { product: data.product_id, branch: data.branch_id }))
                .then(res => res.json())
                .then(data => {
                    setBatches(data);
                    setLoadingBatches(false);
                })
                .catch(() => setLoadingBatches(false));
        } else {
            setBatches([]);
        }
    }, [data.product_id, data.branch_id]);

    const handleOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        reset();
    };

    const handleSearch = () => {
        router.get(route('inventory.adjustments.index'), { search }, { preserveState: true, replace: true });
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('inventory.adjustments.store'), {
            onSuccess: () => handleClose(),
        });
    };

    const formatDate = (dateString) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(new Date(dateString));
    };

    return (
        <MainLayout auth={auth} header="Inventory Control">
            <Head title="Inventory Adjustments" />

            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AdjustmentIcon color="primary" />
                            Stock Adjustments (Damage/Returns)
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                size="small"
                                placeholder="Search product..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpen}
                                sx={{ height: 40, px: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                New Adjustment
                            </Button>
                        </Stack>
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Batch</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Qty</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Adjusted By</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {adjustments.map((adj) => (
                                    <TableRow key={adj.id} hover>
                                        <TableCell>{formatDate(adj.adjustment_date)}</TableCell>
                                        <TableCell>{adj.product?.name}</TableCell>
                                        <TableCell>{adj.branch?.name}</TableCell>
                                        <TableCell>{adj.batch?.batch_number || '-'}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                size="small" 
                                                label={adj.adjustment_type} 
                                                color={adj.quantity > 0 ? 'success' : 'error'} 
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: adj.quantity > 0 ? 'success.main' : 'error.main' }}>
                                            {adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                                        </TableCell>
                                        <TableCell>{adj.reason || '-'}</TableCell>
                                        <TableCell>{adj.user?.name}</TableCell>
                                    </TableRow>
                                ))}
                                {adjustments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                            No adjustment records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        New Stock Adjustment
                        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Alert severity="info" icon={<HistoryIcon fontSize="inherit" />}>
                                Adjustments directly affect stock levels. Positive quantities increase stock, negative quantities decrease stock.
                            </Alert>

                            <TextField
                                select
                                label="Branch"
                                fullWidth
                                size="small"
                                value={data.branch_id}
                                onChange={e => setData('branch_id', e.target.value)}
                                error={!!errors.branch_id}
                                helperText={errors.branch_id}
                                required
                            >
                                {branches.map(branch => (
                                    <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Product"
                                fullWidth
                                size="small"
                                value={data.product_id}
                                onChange={e => setData('product_id', e.target.value)}
                                error={!!errors.product_id}
                                helperText={errors.product_id}
                                required
                            >
                                {products.map(product => (
                                    <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Batch (Optional)"
                                fullWidth
                                size="small"
                                value={data.inventory_batch_id}
                                onChange={e => setData('inventory_batch_id', e.target.value)}
                                disabled={!data.product_id || loadingBatches}
                                helperText={loadingBatches ? 'Loading batches...' : 'Specific batch to adjust'}
                            >
                                <MenuItem value="">None (Global Adjustment)</MenuItem>
                                {batches.map(batch => (
                                    <MenuItem key={batch.id} value={batch.id}>
                                        {batch.batch_number} (Exp: {formatDate(batch.expiry_date)}) - Current Qty: {batch.quantity}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <Stack direction="row" spacing={2}>
                                <TextField
                                    select
                                    label="Adjustment Type"
                                    fullWidth
                                    size="small"
                                    value={data.adjustment_type}
                                    onChange={e => setData('adjustment_type', e.target.value)}
                                    required
                                >
                                    <MenuItem value="Damage">Damage (Deduction)</MenuItem>
                                    <MenuItem value="Return">Customer Return (Addition)</MenuItem>
                                    <MenuItem value="Correction">Correction</MenuItem>
                                    <MenuItem value="Expiry">Expiry (Deduction)</MenuItem>
                                    <MenuItem value="Theft">Theft/Loss (Deduction)</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </TextField>

                                <TextField
                                    label="Quantity"
                                    type="number"
                                    fullWidth
                                    size="small"
                                    value={data.quantity}
                                    onChange={e => setData('quantity', e.target.value)}
                                    error={!!errors.quantity}
                                    helperText={errors.quantity || "Use negative values for deductions"}
                                    required
                                />
                            </Stack>

                            <TextField
                                label="Adjustment Date"
                                type="date"
                                fullWidth
                                size="small"
                                value={data.adjustment_date}
                                onChange={e => setData('adjustment_date', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                required
                            />

                            <TextField
                                label="Reason / Notes"
                                multiline
                                rows={2}
                                fullWidth
                                size="small"
                                value={data.reason}
                                onChange={e => setData('reason', e.target.value)}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={processing}>
                            Process Adjustment
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
