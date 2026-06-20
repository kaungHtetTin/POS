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
    Alert,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Store as StoreIcon,
    Close as CloseIcon,
    LocationOn as LocationIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
} from '@mui/icons-material';

export default function BranchIndex({ auth, branches }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        address: '',
        phone: '',
        email: '',
    });

    const handleOpen = (branch = null) => {
        if (branch) {
            setEditMode(true);
            setEditingBranch(branch);
            setData({
                name: branch.name,
                address: branch.address,
                phone: branch.phone || '',
                email: branch.email || '',
            });
        } else {
            setEditMode(false);
            setEditingBranch(null);
            reset();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingBranch(null);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            patch(route('branches.update', editingBranch.id), {
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('branches.store'), {
                onSuccess: () => handleClose(),
            });
        }
    };

    const handleDelete = (branch) => {
        if (confirm(`Are you sure you want to remove the branch "${branch.name}"?`)) {
            destroy(route('branches.destroy', branch.id));
        }
    };

    return (
        <MainLayout
            auth={auth}
            header="Branch Management"
        >
            <Head title="Branches" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            PHARMACY BRANCH DIRECTORY
                        </Typography>
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                            sx={{ height: 40, px: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Add New Branch
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Branch Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Location & Contact</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Staff Count</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {branches.map((branch) => (
                                    <TableRow key={branch.id} hover>
                                        <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <StoreIcon fontSize="small" color="primary" />
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{branch.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Stack spacing={0.5}>
                                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                                    <LocationIcon sx={{ fontSize: 14, color: 'text.secondary', mt: 0.3 }} />
                                                    <Typography variant="caption" color="text.secondary">{branch.address}</Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={2}>
                                                    {branch.phone && (
                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                            <PhoneIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                                            <Typography variant="caption" color="text.secondary">{branch.phone}</Typography>
                                                        </Stack>
                                                    )}
                                                    {branch.email && (
                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                            <EmailIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                                            <Typography variant="caption" color="text.secondary">{branch.email}</Typography>
                                                        </Stack>
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Chip 
                                                label={branch.users_count} 
                                                size="small" 
                                                color={branch.users_count > 0 ? "info" : "default"} 
                                                variant="outlined" 
                                                sx={{ fontSize: '11px', height: '22px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
                                            <IconButton 
                                                size="small" 
                                                color="primary" 
                                                onClick={() => handleOpen(branch)}
                                            >
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                color="error" 
                                                onClick={() => handleDelete(branch)}
                                                disabled={branch.users_count > 0}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {branches.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No branches found. Click "Add New Branch" to get started.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            {/* Add/Edit Branch Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editMode ? 'Edit Branch' : 'Add New Branch'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            <TextField
                                label="Branch Name"
                                fullWidth
                                size="small"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                            <TextField
                                label="Physical Address"
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                                value={data.address}
                                onChange={e => setData('address', e.target.value)}
                                error={!!errors.address}
                                helperText={errors.address}
                                required
                            />
                            <TextField
                                label="Contact Phone"
                                fullWidth
                                size="small"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                error={!!errors.phone}
                                helperText={errors.phone}
                            />
                            <TextField
                                label="Branch Email"
                                fullWidth
                                size="small"
                                type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                error={!!errors.email}
                                helperText={errors.email}
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
                            {editMode ? 'Update Branch' : 'Create Branch'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
