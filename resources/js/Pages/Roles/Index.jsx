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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    OutlinedInput,
    Checkbox,
    ListItemText,
    FormHelperText,
    Grid
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Security as SecurityIcon,
    Close as CloseIcon
} from '@mui/icons-material';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

export default function RolesIndex({ auth, roles, permissions }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        permissions: [],
    });

    const handleOpen = (role = null) => {
        if (role) {
            setEditMode(true);
            setEditingRole(role);
            setData({
                name: role.name,
                permissions: role.permissions.map(p => p.id),
            });
        } else {
            setEditMode(false);
            setEditingRole(null);
            reset();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingRole(null);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            patch(route('roles.update', editingRole.id), {
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('roles.store'), {
                onSuccess: () => handleClose(),
            });
        }
    };

    const handleDelete = (role) => {
        if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
            destroy(route('roles.destroy', role.id));
        }
    };

    return (
        <MainLayout
            auth={auth}
            header="Role Management"
        >
            <Head title="Roles" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            AVAILABLE SYSTEM ROLES
                        </Typography>
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                        >
                            Add New Role
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Role Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Accessible Permissions</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Users</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {roles.map((role) => (
                                    <TableRow key={role.id} hover>
                                        <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <SecurityIcon fontSize="small" color="primary" />
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{role.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {role.permissions.map((permission) => (
                                                    <Chip 
                                                        key={permission.id} 
                                                        label={permission.name} 
                                                        size="small" 
                                                        variant="outlined"
                                                        sx={{ 
                                                            fontSize: '10px', 
                                                            height: '20px',
                                                            bgcolor: (theme) => theme.palette.mode === 'light' ? 'primary.50' : 'rgba(0, 150, 136, 0.1)',
                                                            borderColor: 'primary.light',
                                                            color: 'primary.main'
                                                        }} 
                                                    />
                                                ))}
                                                {role.permissions.length === 0 && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                        No permissions assigned
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Chip label={role.users_count} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
                                            <IconButton 
                                                size="small" 
                                                color="primary" 
                                                onClick={() => handleOpen(role)}
                                                disabled={role.name === 'Root'}
                                            >
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                color="error" 
                                                onClick={() => handleDelete(role)}
                                                disabled={role.name === 'Root' || role.users_count > 0}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            {/* Add/Edit Role Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editMode ? 'Edit Role' : 'Add New Role'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                label="Role Name"
                                fullWidth
                                size="small"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />

                            <FormControl fullWidth size="small" error={!!errors.permissions}>
                                <InputLabel id="permissions-label">Permissions</InputLabel>
                                <Select
                                    labelId="permissions-label"
                                    multiple
                                    value={data.permissions}
                                    onChange={e => setData('permissions', e.target.value)}
                                    input={<OutlinedInput label="Permissions" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => {
                                                const permission = permissions.find(p => p.id === value);
                                                return (
                                                    <Chip 
                                                        key={value} 
                                                        label={permission?.name} 
                                                        size="small" 
                                                        sx={{ height: 20, fontSize: '10px' }}
                                                    />
                                                );
                                            })}
                                        </Box>
                                    )}
                                    MenuProps={MenuProps}
                                >
                                    {permissions.map((permission) => (
                                        <MenuItem key={permission.id} value={permission.id}>
                                            <Checkbox checked={data.permissions.indexOf(permission.id) > -1} size="small" />
                                            <ListItemText 
                                                primary={permission.name} 
                                                secondary={permission.slug}
                                                primaryTypographyProps={{ variant: 'body2' }}
                                                secondaryTypographyProps={{ variant: 'caption' }}
                                            />
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.permissions && <FormHelperText>{errors.permissions}</FormHelperText>}
                            </FormControl>
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
                            {editMode ? 'Update Role' : 'Create Role'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
