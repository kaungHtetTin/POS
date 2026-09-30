import React, { useEffect, useState } from 'react';
import DataTableFooter from '@/Components/DataTableFooter';
import ClickableTableRow from '@/Components/ClickableTableRow';
import TableRowActions, { TableActionCell, TableActionHead } from '@/Components/TableRowActions';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import StatCardGrid from '@/Components/StatCardGrid';
import { Head, Link, useForm, router } from '@/spa';
import {
    Box,
    Paper,
    Typography,
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
    UploadFile as UploadFileIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    LocalShipping as SupplierIcon,
    Close as CloseIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    AccountBalanceWallet as BalanceIcon,
    Search as SearchIcon,
    GroupsOutlined as SupplierCountIcon,
    CreditScoreOutlined as CreditIcon,
    AccountBalanceOutlined as AccountIcon,
} from '@mui/icons-material';

export default function SupplierIndex({ auth, suppliers, filters, summary = {} }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [search, setSearch] = useState(filters?.search || '');
    const supplierRows = suppliers?.data || suppliers || [];

    useEffect(() => {
        const normalizedSearch = search.trim();
        if (normalizedSearch === (filters?.search || '')) return;

        const timer = window.setTimeout(() => {
            router.get(route('suppliers.index'), { search: normalizedSearch || undefined }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search, filters?.search]);

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        payment_terms: '',
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

    const handlePageChange = (page) => {
        router.get(route('suppliers.index'), { search: search.trim() || undefined, page }, {
            preserveState: true,
            preserveScroll: true,
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
                    <StatCardGrid items={[
                        { label: 'Total Suppliers', value: Number(summary.total_suppliers || 0).toLocaleString(), icon: <SupplierCountIcon /> },
                        { label: 'Supplier Payable', value: `$${Number(summary.supplier_payable || 0).toFixed(2)}`, icon: <BalanceIcon />, tone: 'warning' },
                        { label: 'Supplier Credit', value: `$${Number(summary.supplier_credit || 0).toFixed(2)}`, icon: <CreditIcon />, tone: 'success' },
                        { label: 'Open Accounts', value: Number(summary.open_accounts || 0).toLocaleString(), icon: <AccountIcon />, tone: 'info' },
                    ]} />
                    <ReportFilterToolbar appBar
                        ariaLabel="Supplier filters"
                        fieldKinds={['search']}
                        actions={<><CsvExportButton source={suppliers} dataKey="suppliers" filename="suppliers.csv" /><Button component={Link} href={route('suppliers.import')} variant="outlined" size="small" startIcon={<UploadFileIcon />}>Import CSV</Button><Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Supplier</Button></>}
                    >
                        <TextField
                            size="small"
                            placeholder="Search name, phone, or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
                        />
                    </ReportFilterToolbar>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Supplier</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Contact & Terms</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Outstanding Balance</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Purchases</TableCell>
                                    <TableActionHead>Actions</TableActionHead>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {supplierRows.map((supplier) => (
                                    <ClickableTableRow key={supplier.id} href={route('suppliers.show', { supplier: supplier.id })} label={`View ${supplier.name}`}>
                                        <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <SupplierIcon fontSize="small" color="primary" />
                                                <Stack spacing={0.2}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                        {supplier.name}
                                                    </Typography>
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
                                        <TableActionCell sx={{ verticalAlign: 'top', pt: 1 }}>
                                            <TableRowActions label={supplier.name}>
                                                <IconButton
                                                title="Edit supplier"
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpen(supplier)}
                                            >
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                                <IconButton
                                                title="Delete supplier"
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(supplier)}
                                                disabled={supplier.purchases_count > 0}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                                </IconButton>
                                            </TableRowActions>
                                        </TableActionCell>
                                    </ClickableTableRow>
                                ))}
                                {supplierRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No suppliers found. Click "Add Supplier" to create your first supplier.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <DataTableFooter paginator={suppliers} onPageChange={(page) => handlePageChange(page)} />
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
