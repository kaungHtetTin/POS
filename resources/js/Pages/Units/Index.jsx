import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, useForm } from '@/spa';
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
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Straighten as UnitIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

export default function UnitIndex({ auth, units }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        short_name: '',
    });

    const handleOpen = (unit = null) => {
        if (unit) {
            setEditMode(true);
            setEditingUnit(unit);
            setData({
                name: unit.name,
                short_name: unit.short_name,
            });
        } else {
            setEditMode(false);
            setEditingUnit(null);
            reset();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingUnit(null);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            patch(route('units.update', editingUnit.id), {
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('units.store'), {
                onSuccess: () => handleClose(),
            });
        }
    };

    const handleDelete = (unit) => {
        if (confirm(`Are you sure you want to remove the unit "${unit.name}"?`)) {
            destroy(route('units.destroy', unit.id));
        }
    };

    return (
        <MainLayout
            auth={auth}
            header="Unit Management"
        >
            <Head title="Units" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            MEASUREMENT UNITS
                        </Typography>
                        <Stack direction="row" spacing={1}>
                        <CsvExportButton source={units} filename="units.csv" />
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                            sx={{ height: 40, px: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Add New Unit
                        </Button>
                        </Stack>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Unit Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Short Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Products</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {units.map((unit) => (
                                    <TableRow key={unit.id} hover>
                                        <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <UnitIcon fontSize="small" color="primary" />
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{unit.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Chip 
                                                label={unit.short_name} 
                                                size="small" 
                                                sx={{ 
                                                    fontFamily: 'monospace', 
                                                    fontWeight: 'bold',
                                                    fontSize: '11px',
                                                    height: '22px'
                                                }} 
                                            />
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Chip 
                                                label={unit.product_units_count} 
                                                size="small" 
                                                color={unit.product_units_count > 0 ? "info" : "default"} 
                                                variant="outlined" 
                                                sx={{ fontSize: '11px', height: '22px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
                                            <IconButton 
                                                size="small" 
                                                color="primary" 
                                                onClick={() => handleOpen(unit)}
                                            >
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                color="error" 
                                                onClick={() => handleDelete(unit)}
                                                disabled={unit.product_units_count > 0}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {units.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No units found. Click "Add New Unit" to get started.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            {/* Add/Edit Unit Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editMode ? 'Edit Unit' : 'Add New Unit'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            <TextField
                                label="Unit Name (e.g., Tablet, Bottle)"
                                fullWidth
                                size="small"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                            <TextField
                                label="Short Name (e.g., Tab, Btl)"
                                fullWidth
                                size="small"
                                value={data.short_name}
                                onChange={e => setData('short_name', e.target.value)}
                                error={!!errors.short_name}
                                helperText={errors.short_name}
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
                            {editMode ? 'Update Unit' : 'Create Unit'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
