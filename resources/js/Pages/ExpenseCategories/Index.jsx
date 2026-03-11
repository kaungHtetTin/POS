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
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Label as LabelIcon,
    Close as CloseIcon,
    Description as DescriptionIcon,
} from '@mui/icons-material';

export default function ExpenseCategoryIndex({ auth, categories }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        description: '',
    });

    const handleOpen = (category = null) => {
        if (category) {
            setEditMode(true);
            setEditingCategory(category);
            setData({
                name: category.name,
                description: category.description || '',
            });
        } else {
            setEditMode(false);
            setEditingCategory(null);
            reset();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingCategory(null);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            patch(route('expense-categories.update', editingCategory.id), {
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('expense-categories.store'), {
                onSuccess: () => handleClose(),
            });
        }
    };

    const handleDelete = (category) => {
        if (confirm(`Are you sure you want to remove the category "${category.name}"?`)) {
            destroy(route('expense-categories.destroy', category.id));
        }
    };

    return (
        <MainLayout auth={auth} header="Expense Categories">
            <Head title="Expense Categories" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            EXPENSE CATEGORIES
                        </Typography>
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => handleOpen()}>
                            Add New Category
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">
                                        Expenses
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {categories.map((category) => (
                                    <TableRow key={category.id} hover>
                                        <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <LabelIcon fontSize="small" color="primary" />
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {category.name}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {category.description || 'No description provided'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                            <Chip
                                                label={category.expenses_count}
                                                size="small"
                                                color={category.expenses_count > 0 ? 'info' : 'default'}
                                                variant="outlined"
                                                sx={{ fontSize: '11px', height: '22px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', pt: 1 }}>
                                            <IconButton size="small" color="primary" onClick={() => handleOpen(category)}>
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(category)}
                                                disabled={category.expenses_count > 0}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {categories.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No categories found. Click "Add New Category" to get started.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editMode ? 'Edit Category' : 'Add New Category'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            <TextField
                                label="Category Name"
                                fullWidth
                                size="small"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                            <TextField
                                label="Description"
                                fullWidth
                                size="small"
                                multiline
                                rows={3}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                error={!!errors.description}
                                helperText={errors.description}
                                InputProps={{
                                    startAdornment: <DescriptionIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />,
                                }}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} size="small">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" size="small" disabled={processing}>
                            {editMode ? 'Update Category' : 'Create Category'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}

