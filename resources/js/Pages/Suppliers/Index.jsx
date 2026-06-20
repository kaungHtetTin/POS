import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Box,
    Paper,
    Typography,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    IconButton,
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    LocalShipping as SupplierIcon,
    Close as CloseIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    AccountBalanceWallet as BalanceIcon,
    CreditCard as CreditIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

export default function SupplierIndex({ auth, suppliers, filters }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [search, setSearch] = useState(filters?.search || '');

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        payment_terms: '',
        credit_limit: '0',
    });

    const handleOpen = (supplier = null) => {
        if (supplier) {
            setEditMode(true);
            setEditingSupplier(supplier);
            setData({
                name: supplier.name,
                phone: supplier.phone,
                email: supplier.email || '',
                address: supplier.address || '',
                payment_terms: supplier.payment_terms || '',
                credit_limit: supplier.credit_limit ?? '0',
            });
        } else {
            setEditMode(false);
            setEditingSupplier(null);
            reset();
            setData({
                name: '',
                phone: '',
                email: '',
                address: '',
                payment_terms: '',
                credit_limit: '0',
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingSupplier(null);
    };

    const handleSearch = () => {
        router.get(route('suppliers.index'), { search }, {
            preserveState: true,
            replace: true,
        });
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            patch(route('suppliers.update', editingSupplier.id), {
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('suppliers.store'), {
                onSuccess: () => handleClose(),
            });
        }
    };

    const handleDelete = (supplier) => {
        if (confirm(`Are you sure you want to remove the supplier "${supplier.name}"?`)) {
            destroy(route('suppliers.destroy', supplier.id));
        }
    };

    return (
        <MainLayout
            auth={auth}
            header="Supplier Management"
        >
            <Head title="Suppliers" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            SUPPLIER DIRECTORY
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                size="small"
                                placeholder="Search name, phone, or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ minWidth: { sm: 260 } }}
                            />
                            <Button variant="outlined" size="small" onClick={handleSearch}>Search</Button>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpen()}
                                sx={{ height: 40, px: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                Add Supplier
                            </Button>
                        </Stack>
                    </Stack>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Supplier</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Contact & Terms</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Credit Limit</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Outstanding Balance</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Purchases</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {suppliers.map((supplier) => (
                                    <TableRow key={supplier.id} hover>
                                        <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <SupplierIcon fontSize="small" color="primary" />
                                                <Stack spacing={0.2}>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{supplier.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{supplier.address || 'No address provided'}</Typography>
                                                </Stack>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Stack spacing={0.6}>
                                                <Stack direction="row" spacing={0.8} alignItems="center">
                                                    <PhoneIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                                    <Typography variant="caption" color="text.secondary">{supplier.phone}</Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={0.8} alignItems="center">
                                                    <EmailIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                                    <Typography variant="caption" color="text.secondary">{supplier.email || 'No email provided'}</Typography>
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary">
                                                    {supplier.payment_terms || 'No payment terms configured'}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Chip
                                                size="small"
                                                icon={<CreditIcon />}
                                                label={`$${Number(supplier.credit_limit || 0).toFixed(2)}`}
                                                variant="outlined"
                                                sx={{ fontSize: '11px', height: '22px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Chip
                                                size="small"
                                                icon={<BalanceIcon />}
                                                label={`$${Number(supplier.balance || 0).toFixed(2)}`}
                                                color={Number(supplier.balance || 0) > 0 ? 'warning' : 'success'}
                                                variant={Number(supplier.balance || 0) > 0 ? 'filled' : 'outlined'}
                                                sx={{ fontSize: '11px', height: '22px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Chip
                                                label={supplier.purchases_count}
                                                size="small"
                                                color={supplier.purchases_count > 0 ? 'info' : 'default'}
                                                variant="outlined"
                                                sx={{ fontSize: '11px', height: '22px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpen(supplier)}
                                            >
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(supplier)}
                                                disabled={supplier.purchases_count > 0}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {suppliers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No suppliers found. Click "Add Supplier" to create your first supplier.
                                            </Typography>
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
                        {editMode ? 'Edit Supplier' : 'Add Supplier'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            <TextField
                                label="Supplier Name"
                                fullWidth
                                size="small"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Phone"
                                    fullWidth
                                    size="small"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    error={!!errors.phone}
                                    helperText={errors.phone}
                                    required
                                />
                                <TextField
                                    label="Email"
                                    fullWidth
                                    size="small"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                />
                            </Stack>
                            <TextField
                                label="Address"
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                error={!!errors.address}
                                helperText={errors.address}
                            />
                            <TextField
                                label="Payment Terms"
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                                value={data.payment_terms}
                                onChange={(e) => setData('payment_terms', e.target.value)}
                                error={!!errors.payment_terms}
                                helperText={errors.payment_terms}
                            />
                            <TextField
                                label="Credit Limit"
                                type="number"
                                fullWidth
                                size="small"
                                value={data.credit_limit}
                                onChange={(e) => setData('credit_limit', e.target.value)}
                                error={!!errors.credit_limit}
                                helperText={errors.credit_limit}
                                inputProps={{ min: 0, step: '0.01' }}
                                required
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} size="small">Cancel</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            size="small"
                            disabled={processing}
                        >
                            {editMode ? 'Update Supplier' : 'Create Supplier'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
