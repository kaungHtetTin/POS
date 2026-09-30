import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import CsvExportButton from '@/Components/CsvExportButton';
import TableRowActions, { TableActionCell, TableActionHead } from '@/Components/TableRowActions';
import { AppBarActions } from '@/Components/AppBarPortal';
import { Head, useForm } from '@/spa';
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
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Label as LabelIcon,
    Close as CloseIcon,
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
                    <AppBarActions>
                        <CsvExportButton source={categories} filename="expense-categories.csv" />
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Add New Category
                        </Button>
                        </AppBarActions>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">
                                        Expenses
                                    </TableCell>
                                    <TableActionHead>Actions</TableActionHead>
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
                                        <TableActionCell sx={{ verticalAlign: 'top', pt: 1 }}>
                                            <TableRowActions label={category.name}>
                                            <IconButton title="Edit category" size="small" color="primary" onClick={() => handleOpen(category)}>
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton
                                                title="Delete category"
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(category)}
                                                disabled={category.expenses_count > 0}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                            </TableRowActions>
                                        </TableActionCell>
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

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { maxWidth: 520, borderRadius: 2 } }}
            >
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, fontSize: 18, fontWeight: 800 }}>
                        <Box>
                            {editMode ? 'Edit Category' : 'Add New Category'}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontWeight: 400 }}>
                                Categories organize expenses in reports and filters.
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={handleClose} aria-label="Close category form">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers sx={{ px: 2, py: 1.75 }}>
                        <Stack spacing={1.5}>
                            <TextField
                                label="Category Name"
                                placeholder="For example: Utilities"
                                fullWidth
                                size="small"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                                autoFocus
                            />
                            <TextField
                                label="Description"
                                placeholder="Optional note about expenses in this category"
                                fullWidth
                                size="small"
                                multiline
                                minRows={2}
                                maxRows={5}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                error={!!errors.description}
                                helperText={errors.description}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 2, py: 1.25, gap: 0.75 }}>
                        <Button onClick={handleClose} size="small" color="inherit">
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
