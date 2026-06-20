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
    Avatar,
    Checkbox,
    ListItemText,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    Close as CloseIcon,
    Store as StoreIcon,
    Badge as BadgeIcon,
    PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';

export default function StaffIndex({ auth, staff, roles, branches }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        email: '',
        phone: '',
        branch_id: '',
        branch_ids: [],
        role_id: '',
        password: '',
        password_confirmation: '',
        image: null,
    });

    const ensurePrimaryBranchIncluded = (primaryBranchId, selectedBranchIds) => {
        const ids = Array.isArray(selectedBranchIds) ? selectedBranchIds : [];
        if (!primaryBranchId) return ids;
        if (ids.includes(primaryBranchId)) return ids;
        return [...ids, primaryBranchId];
    };

    const handleOpen = (member = null) => {
        if (member) {
            setEditMode(true);
            setEditingStaff(member);
            const selectedBranchIds = (member.branches || []).map((b) => b.id);
            setData({
                name: member.name,
                email: member.email,
                phone: member.phone || '',
                branch_id: member.branch_id,
                branch_ids: ensurePrimaryBranchIncluded(member.branch_id, selectedBranchIds),
                role_id: member.roles[0]?.id || '',
                password: '',
                password_confirmation: '',
                image: null,
            });
        } else {
            setEditMode(false);
            setEditingStaff(null);
            reset();
            setData({
                name: '',
                email: '',
                phone: '',
                branch_id: '',
                branch_ids: [],
                role_id: '',
                password: '',
                password_confirmation: '',
                image: null,
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingStaff(null);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            // Inertia patch doesn't support multipart/form-data directly with files easily in some versions, 
            // but we can use post with _method: 'PATCH'
            post(route('staff.update', editingStaff.id), {
                forceFormData: true,
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('staff.store'), {
                onSuccess: () => handleClose(),
            });
        }
    };

    const handleDelete = (member) => {
        if (confirm(`Are you sure you want to remove ${member.name}?`)) {
            destroy(route('staff.destroy', member.id));
        }
    };

    return (
        <MainLayout
            auth={auth}
            header="Staff Management"
        >
            <Head title="Staff" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            SYSTEM STAFF DIRECTORY
                        </Typography>
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                            sx={{ height: 40, px: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Add New Staff
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Staff Member</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {staff.map((member) => (
                                    <TableRow key={member.id} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar 
                                                    src={member.image_path ? `/storage/${member.image_path}` : null}
                                                    sx={{ width: 32, height: 32 }}
                                                >
                                                    <PersonIcon fontSize="small" />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{member.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{member.email}</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            {member.roles.map(role => (
                                                <Chip 
                                                    key={role.id} 
                                                    label={role.name} 
                                                    size="small" 
                                                    color="primary" 
                                                    variant="outlined"
                                                    sx={{ fontSize: '10px', height: '20px' }}
                                                />
                                            ))}
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <StoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                <Typography variant="body2">{member.branch?.name}</Typography>
                                                {(member.branches || []).length > 1 && (
                                                    <Chip
                                                        size="small"
                                                        label={`+${(member.branches || []).length - 1}`}
                                                        variant="outlined"
                                                        sx={{ height: 18, fontSize: 10 }}
                                                    />
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{member.phone || 'N/A'}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton 
                                                size="small" 
                                                color="primary" 
                                                onClick={() => handleOpen(member)}
                                            >
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                color="error" 
                                                onClick={() => handleDelete(member)}
                                                disabled={member.id === auth.user.id}
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

            {/* Add/Edit Staff Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editMode ? 'Edit Staff Member' : 'Add New Staff Member'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                                <Avatar
                                    src={data.image ? URL.createObjectURL(data.image) : (editingStaff?.image_path ? `/storage/${editingStaff.image_path}` : null)}
                                    sx={{ width: 80, height: 80, mb: 1 }}
                                >
                                    <PersonIcon sx={{ fontSize: 40 }} />
                                </Avatar>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    size="small"
                                    startIcon={<PhotoCameraIcon />}
                                >
                                    {editMode ? 'Change Photo' : 'Upload Photo'}
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={(e) => setData('image', e.target.files[0])}
                                    />
                                </Button>
                                {errors.image && (
                                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                        {errors.image}
                                    </Typography>
                                )}
                            </Box>

                            <TextField
                                label="Full Name"
                                fullWidth
                                size="small"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                            <TextField
                                label="Email Address"
                                fullWidth
                                size="small"
                                type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                error={!!errors.email}
                                helperText={errors.email}
                                required
                            />
                            <TextField
                                label="Phone Number"
                                fullWidth
                                size="small"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                error={!!errors.phone}
                                helperText={errors.phone}
                            />

                            <Stack direction="row" spacing={2}>
                                <FormControl fullWidth size="small" error={!!errors.branch_id} required>
                                    <InputLabel>Primary Branch</InputLabel>
                                    <Select
                                        value={data.branch_id}
                                        label="Primary Branch"
                                        onChange={(e) => {
                                            const newPrimaryId = e.target.value;
                                            const oldPrimaryId = data.branch_id;
                                            
                                            setData((prev) => {
                                                let newBranchIds = Array.isArray(prev.branch_ids) ? [...prev.branch_ids] : [];
                                                
                                                // 1. If the old primary was the ONLY branch in the access list,
                                                //    replace it entirely with the new primary.
                                                if (newBranchIds.length === 1 && newBranchIds.includes(oldPrimaryId)) {
                                                    newBranchIds = [newPrimaryId];
                                                } else {
                                                    // 2. Otherwise, ensure the new primary is included, 
                                                    //    but keep other existing access branches.
                                                    if (!newBranchIds.includes(newPrimaryId)) {
                                                        newBranchIds.push(newPrimaryId);
                                                    }
                                                }
                                                
                                                return {
                                                    ...prev,
                                                    branch_id: newPrimaryId,
                                                    branch_ids: newBranchIds,
                                                };
                                            });
                                        }}
                                    >
                                        {branches.map(branch => (
                                            <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small" error={!!errors.role_id} required>
                                    <InputLabel>Role</InputLabel>
                                    <Select
                                        value={data.role_id}
                                        label="Role"
                                        onChange={e => setData('role_id', e.target.value)}
                                    >
                                        {roles.map(role => (
                                            <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>

                            <FormControl fullWidth size="small" error={!!errors.branch_ids}>
                                <InputLabel>Branch Access</InputLabel>
                                <Select
                                    multiple
                                    value={data.branch_ids}
                                    label="Branch Access"
                                    onChange={(e) => {
                                        const selected = e.target.value;
                                        setData((prev) => ({
                                            ...prev,
                                            branch_ids: ensurePrimaryBranchIncluded(prev.branch_id, selected),
                                        }));
                                    }}
                                    renderValue={(selected) => {
                                        const selectedIds = Array.isArray(selected) ? selected : [];
                                        const names = branches
                                            .filter((b) => selectedIds.includes(b.id))
                                            .map((b) => b.name);
                                        return names.join(', ');
                                    }}
                                >
                                    {branches.map((branch) => {
                                        const isPrimary = branch.id === data.branch_id;
                                        const checked = (data.branch_ids || []).includes(branch.id);
                                        return (
                                            <MenuItem key={branch.id} value={branch.id} disabled={isPrimary}>
                                                <Checkbox size="small" checked={checked} />
                                                <ListItemText primary={branch.name} />
                                                {isPrimary && (
                                                    <Chip size="small" label="Primary" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                                                )}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                                {errors.branch_ids && (
                                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                        {errors.branch_ids}
                                    </Typography>
                                )}
                            </FormControl>

                            <Divider sx={{ my: 1 }}>
                                <Chip label="Security" size="small" />
                            </Divider>

                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label={editMode ? "New Password (Optional)" : "Password"}
                                    fullWidth
                                    size="small"
                                    type="password"
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    error={!!errors.password}
                                    helperText={errors.password}
                                    autoComplete="new-password"
                                />
                                <TextField
                                    label="Confirm Password"
                                    fullWidth
                                    size="small"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={e => setData('password_confirmation', e.target.value)}
                                    autoComplete="new-password"
                                />
                            </Stack>
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
                            {editMode ? 'Update Staff' : 'Add Staff'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
