import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm } from '@inertiajs/react';
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
    Switch,
    FormControlLabel,
    InputAdornment,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Percent as TaxIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

export default function TaxIndex({ auth, taxes }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingTax, setEditingTax] = useState(null);

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        rate: '',
        status: true,
    });

    const handleOpen = (tax = null) => {
        if (tax) {
            setEditMode(true);
            setEditingTax(tax);
            setData({
                name: tax.name,
                rate: tax.rate,
                status: Boolean(tax.status),
            });
        } else {
            setEditMode(false);
            setEditingTax(null);
            reset();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingTax(null);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            patch(route('taxes.update', editingTax.id), {
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('taxes.store'), {
                onSuccess: () => handleClose(),
            });
        }
    };

    const handleDelete = (tax) => {
        if (confirm(`Are you sure you want to remove the tax configuration "${tax.name}"?`)) {
            destroy(route('taxes.destroy', tax.id));
        }
    };

    return (
        <MainLayout
            auth={auth}
            header="Tax Configuration"
        >
            <Head title="Taxes" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            SYSTEM TAX TYPES
                        </Typography>
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                            sx={{ height: 40, px: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Add New Tax
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Tax Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Rate (%)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Products</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {taxes.map((tax) => (
                                    <TableRow key={tax.id} hover>
                                        <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <TaxIcon fontSize="small" color="primary" />
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{tax.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                {tax.rate}%
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Chip 
                                                label={tax.status ? "Active" : "Inactive"} 
                                                size="small" 
                                                color={tax.status ? "success" : "error"} 
                                                variant="outlined" 
                                                sx={{ fontSize: '10px', height: '20px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Chip 
                                                label={tax.products_count} 
                                                size="small" 
                                                color={tax.products_count > 0 ? "info" : "default"} 
                                                variant="outlined" 
                                                sx={{ fontSize: '11px', height: '22px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
                                            <IconButton 
                                                size="small" 
                                                color="primary" 
                                                onClick={() => handleOpen(tax)}
                                            >
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                color="error" 
                                                onClick={() => handleDelete(tax)}
                                                disabled={tax.products_count > 0}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {taxes.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No tax types found. Click "Add New Tax" to get started.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            {/* Add/Edit Tax Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editMode ? 'Edit Tax Type' : 'Add New Tax Type'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            <TextField
                                label="Tax Name (e.g., VAT, Sales Tax)"
                                fullWidth
                                size="small"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                            <TextField
                                label="Tax Rate"
                                fullWidth
                                size="small"
                                type="number"
                                value={data.rate}
                                onChange={e => setData('rate', e.target.value)}
                                error={!!errors.rate}
                                helperText={errors.rate}
                                required
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                }}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={data.status}
                                        onChange={e => setData('status', e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Active Status"
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
                            {editMode ? 'Update Tax' : 'Create Tax'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
