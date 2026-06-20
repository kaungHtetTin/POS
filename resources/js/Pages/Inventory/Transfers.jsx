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
    Grid,
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
    CompareArrows as TransferIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Store as BranchIcon,
} from '@mui/icons-material';

const emptyItem = {
    product_id: '',
    inventory_batch_id: '',
    quantity: 1,
};

export default function StockTransfers({ auth, transfers, branches, products, filters }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(filters?.search || '');
    const [sourceBatches, setSourceBatches] = useState({});

    const { data, setData, post, processing, errors, reset } = useForm({
        from_branch_id: branches[0]?.id || '',
        to_branch_id: branches[1]?.id || '',
        transfer_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [{ ...emptyItem }],
    });

    const fetchBatches = async (index, productId, branchId) => {
        if (!productId || !branchId) return;
        
        try {
            const response = await fetch(route('inventory.batches.get', { product: productId, branch: branchId }));
            const batchData = await response.json();
            setSourceBatches(prev => ({ ...prev, [index]: batchData }));
        } catch (error) {
            console.error('Error fetching batches:', error);
        }
    };

    const handleOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        reset();
    };

    const handleSearch = () => {
        router.get(route('inventory.transfers.index'), { search }, { preserveState: true, replace: true });
    };

    const addItem = () => {
        setData('items', [...data.items, { ...emptyItem }]);
    };

    const removeItem = (index) => {
        if (data.items.length === 1) return;
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const updatedItems = [...data.items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        
        if (field === 'product_id') {
            updatedItems[index].inventory_batch_id = '';
            fetchBatches(index, value, data.from_branch_id);
        }
        
        setData('items', updatedItems);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('inventory.transfers.store'), {
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
        <MainLayout auth={auth} header="Stock Transfers">
            <Head title="Stock Transfers" />

            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TransferIcon color="primary" />
                            Branch-to-Branch Transfers
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                size="small"
                                placeholder="Search reference..."
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
                                New Transfer
                            </Button>
                        </Stack>
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Reference</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>From Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>To Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Items</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transfers.map((trf) => (
                                    <TableRow key={trf.id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{trf.reference_number}</TableCell>
                                        <TableCell>{trf.from_branch?.name}</TableCell>
                                        <TableCell>{trf.to_branch?.name}</TableCell>
                                        <TableCell>{formatDate(trf.transfer_date)}</TableCell>
                                        <TableCell align="center">{trf.items_count}</TableCell>
                                        <TableCell align="center">
                                            <Chip size="small" label={trf.status} color="success" variant="outlined" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {transfers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            No transfer records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Create Stock Transfer
                        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    select
                                    label="Source Branch"
                                    fullWidth
                                    size="small"
                                    value={data.from_branch_id}
                                    onChange={e => setData('from_branch_id', e.target.value)}
                                    error={!!errors.from_branch_id}
                                    helperText={errors.from_branch_id}
                                    required
                                >
                                    {branches.map(branch => (
                                        <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                    ))}
                                </TextField>

                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <TransferIcon color="action" />
                                </Box>

                                <TextField
                                    select
                                    label="Destination Branch"
                                    fullWidth
                                    size="small"
                                    value={data.to_branch_id}
                                    onChange={e => setData('to_branch_id', e.target.value)}
                                    error={!!errors.to_branch_id}
                                    helperText={errors.to_branch_id}
                                    required
                                >
                                    {branches.map(branch => (
                                        <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                    ))}
                                </TextField>
                            </Stack>

                            <TextField
                                label="Transfer Date"
                                type="date"
                                fullWidth
                                size="small"
                                value={data.transfer_date}
                                onChange={e => setData('transfer_date', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                required
                            />

                            <Divider>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                    TRANSFER ITEMS
                                </Typography>
                            </Divider>

                            <Stack spacing={2}>
                                {data.items.map((item, index) => (
                                    <Paper key={index} variant="outlined" sx={{ p: 2, position: 'relative' }}>
                                        {data.items.length > 1 && (
                                            <IconButton 
                                                size="small" 
                                                color="error" 
                                                sx={{ position: 'absolute', top: 5, right: 5 }}
                                                onClick={() => removeItem(index)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={5}>
                                                <TextField
                                                    select
                                                    label="Product"
                                                    fullWidth
                                                    size="small"
                                                    value={item.product_id}
                                                    onChange={e => updateItem(index, 'product_id', e.target.value)}
                                                    required
                                                    sx={{ minWidth: 200 }}
                                                >
                                                    {products.map(p => (
                                                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <TextField
                                                    select
                                                    label="Batch"
                                                    fullWidth
                                                    size="small"
                                                    value={item.inventory_batch_id}
                                                    onChange={e => updateItem(index, 'inventory_batch_id', e.target.value)}
                                                    disabled={!item.product_id}
                                                    required
                                                    sx={{ minWidth: 180 }}
                                                >
                                                    {(sourceBatches[index] || []).map(b => (
                                                        <MenuItem key={b.id} value={b.id}>
                                                            {b.batch_number} (Qty: {b.quantity})
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                                <TextField
                                                    label="Quantity"
                                                    type="number"
                                                    fullWidth
                                                    size="small"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                                                    required
                                                    inputProps={{ min: 1 }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                ))}
                                <Button startIcon={<AddIcon />} size="small" onClick={addItem}>
                                    Add Another Product
                                </Button>
                            </Stack>

                            <TextField
                                label="Notes"
                                multiline
                                rows={2}
                                fullWidth
                                size="small"
                                value={data.notes}
                                onChange={e => setData('notes', e.target.value)}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={processing}>
                            Complete Transfer
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
