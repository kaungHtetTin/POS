import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
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
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    InputAdornment,
    Pagination,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    Close as CloseIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Search as SearchIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';

export default function CustomerIndex({ auth, customers, filters }) {
    const { translations = {} } = usePage().props;
    const __ = (key) => translations[key] || key;
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [search, setSearch] = useState(filters?.search || '');
    const customerRows = customers?.data || customers || [];

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        phone: '',
        email: '',
        address: '',
    });

    const handleOpen = (customer = null) => {
        if (customer) {
            setEditMode(true);
            setEditingCustomer(customer);
            setData({
                name: customer.name,
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
            });
        } else {
            setEditMode(false);
            setEditingCustomer(null);
            reset();
            setData({
                name: '',
                phone: '',
                email: '',
                address: '',
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingCustomer(null);
    };

    const handleSearch = (page = undefined) => {
        router.get(route('customers.index'), { search: search || undefined, page }, {
            preserveState: true,
            replace: true,
        });
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            patch(route('customers.update', editingCustomer.id), {
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('customers.store'), {
                onSuccess: () => handleClose(),
            });
        }
    };

    const handleDelete = (customer) => {
        if (confirm(`Are you sure you want to remove the customer "${customer.name}"?`)) {
            destroy(route('customers.destroy', customer.id));
        }
    };

    return (
        <MainLayout
            auth={auth}
            header={__('Customer Management')}
        >
            <Head title={__('Customers')} />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {__('CUSTOMER DIRECTORY')}
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                size="small"
                                placeholder={__('Search name, phone, or email...')}
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
                            <Button variant="outlined" size="small" onClick={handleSearch}>{__('Search')}</Button>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpen()}
                                sx={{ height: 40, px: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                {__('Add Customer')}
                            </Button>
                        </Stack>
                    </Stack>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{__('Customer')}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{__('Contact')}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">{__('Actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {customerRows.map((customer) => (
                                    <TableRow key={customer.id} hover>
                                        <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <PersonIcon fontSize="small" color="primary" />
                                                <Stack spacing={0.2}>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{customer.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{customer.address || __('No address provided')}</Typography>
                                                </Stack>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Stack spacing={0.6}>
                                                <Stack direction="row" spacing={0.8} alignItems="center">
                                                    <PhoneIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                                    <Typography variant="caption" color="text.secondary">{customer.phone || __('No phone')}</Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={0.8} alignItems="center">
                                                    <EmailIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                                    <Typography variant="caption" color="text.secondary">{customer.email || __('No email')}</Typography>
                                                </Stack>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
                                            <IconButton
                                                component={Link}
                                                href={route('customers.show', customer.id)}
                                                size="small"
                                                color="primary"
                                                aria-label={`View ${customer.name}`}
                                            >
                                                <ViewIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpen(customer)}
                                            >
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(customer)}
                                                disabled={(customer.sales_count ?? customer.purchase_history_count ?? 0) > 0}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {customerRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                                {__('No customers found. Click "Add Customer" to create your first customer.')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {Number(customers?.last_page || 1) > 1 && (
                        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Pagination
                                size="small"
                                count={customers.last_page}
                                page={customers.current_page}
                                onChange={(event, page) => handleSearch(page)}
                                color="primary"
                            />
                        </Stack>
                    )}
                </Paper>
            </Box>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editMode ? __('Edit Customer') : __('Add Customer')}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            <TextField
                                label={__('Customer Name')}
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
                                    label={__('Phone')}
                                    fullWidth
                                    size="small"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    error={!!errors.phone}
                                    helperText={errors.phone}
                                />
                                <TextField
                                    label={__('Email')}
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
                                label={__('Address')}
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                error={!!errors.address}
                                helperText={errors.address}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} size="small">{__('Cancel')}</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            size="small"
                            disabled={processing}
                        >
                            {editMode ? __('Update Customer') : __('Create Customer')}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
