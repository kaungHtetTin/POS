import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Payments as ExpenseIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

export default function ExpenseIndex({ auth, expenses, branches, categories, filters }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const [search, setSearch] = useState(filters?.search || '');
    const [branchFilter, setBranchFilter] = useState(filters?.branch_id || '');
    const [categoryFilter, setCategoryFilter] = useState(filters?.expense_category_id || '');
    const [fromDate, setFromDate] = useState(filters?.from_date || '');
    const [toDate, setToDate] = useState(filters?.to_date || '');

    const defaultBranchId = auth.user?.current_branch_id || auth.user?.branch_id || branches?.[0]?.id || '';
    const defaultCategoryId = categories?.[0]?.id || '';

    const { data, setData, post, patch, delete: destroy, reset, errors, processing } = useForm({
        branch_id: defaultBranchId,
        expense_category_id: defaultCategoryId,
        title: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const totalAmount = useMemo(() => {
        return (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    }, [expenses]);

    const applyFilters = () => {
        router.get(
            route('expenses.index'),
            {
                search: search || undefined,
                branch_id: branchFilter || undefined,
                expense_category_id: categoryFilter || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const clearFilters = () => {
        setSearch('');
        setBranchFilter('');
        setCategoryFilter('');
        setFromDate('');
        setToDate('');
        router.get(route('expenses.index'));
    };

    const handleOpen = (expense = null) => {
        if (expense) {
            setEditMode(true);
            setEditingExpense(expense);
            setData({
                branch_id: expense.branch_id,
                expense_category_id: expense.expense_category_id || '',
                title: expense.title,
                amount: expense.amount,
                expense_date: expense.expense_date,
                notes: expense.notes || '',
            });
        } else {
            setEditMode(false);
            setEditingExpense(null);
            reset();
            setData({
                branch_id: defaultBranchId,
                expense_category_id: defaultCategoryId,
                title: '',
                amount: '',
                expense_date: new Date().toISOString().split('T')[0],
                notes: '',
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingExpense(null);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            patch(route('expenses.update', editingExpense.id), {
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('expenses.store'), {
                onSuccess: () => handleClose(),
            });
        }
    };

    const handleDelete = (expense) => {
        if (confirm(`Are you sure you want to delete "${expense.title}"?`)) {
            destroy(route('expenses.destroy', expense.id));
        }
    };

    const formatDate = (dateString) => {
        try {
            return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
                new Date(dateString)
            );
        } catch {
            return dateString;
        }
    };

    return (
        <MainLayout auth={auth} header="Financials">
            <Head title="Expenses" />

            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ExpenseIcon fontSize="small" color="primary" />
                            EXPENSE TRACKING
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                            sx={{ height: 40, px: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Add Expense
                        </Button>
                    </Stack>

                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        <TextField
                            size="small"
                            placeholder="Search title..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />,
                            }}
                            sx={{ flex: '1 1 280px', minWidth: { xs: '100%', sm: 280 } }}
                        />

                        <FormControl size="small" sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: 200 } }}>
                            <InputLabel>Branch</InputLabel>
                            <Select value={branchFilter} label="Branch" onChange={(e) => setBranchFilter(e.target.value)}>
                                <MenuItem value="">Current Branch</MenuItem>
                                {branches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>
                                        {b.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flex: '1 1 240px', minWidth: { xs: '100%', sm: 240 } }}>
                            <InputLabel>Category</InputLabel>
                            <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
                                <MenuItem value="">All Categories</MenuItem>
                                {(categories || []).map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            type="date"
                            label="From"
                            InputLabelProps={{ shrink: true }}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            sx={{ flex: '1 1 160px', minWidth: { xs: '100%', sm: 160 } }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="To"
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            sx={{ flex: '1 1 160px', minWidth: { xs: '100%', sm: 160 } }}
                        />

                        <Button
                            variant="contained"
                            size="small"
                            onClick={applyFilters}
                            sx={{ minWidth: 110, width: { xs: '100%', sm: 'auto' } }}
                        >
                            Filter
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={clearFilters}
                            sx={{ minWidth: 110, width: { xs: '100%', sm: 'auto' } }}
                        >
                            Clear
                        </Button>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <Chip
                            size="small"
                            label={`Entries: ${(expenses || []).length}`}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={`Total: ${Number(totalAmount || 0).toFixed(2)}`}
                            color="primary"
                            variant="outlined"
                        />
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">
                                        Amount
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(expenses || []).map((e) => (
                                    <TableRow key={e.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {e.title}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {e.category?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {e.branch?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{formatDate(e.expense_date)}</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                                            {Number(e.amount || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary" noWrap title={e.notes || ''} sx={{ maxWidth: 260 }}>
                                                {e.notes || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" color="primary" onClick={() => handleOpen(e)}>
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDelete(e)}>
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {(expenses || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No expenses found.
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
                        {editMode ? 'Edit Expense' : 'Add Expense'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <FormControl fullWidth size="small" error={!!errors.branch_id} required>
                                <InputLabel>Branch</InputLabel>
                                <Select value={data.branch_id} label="Branch" onChange={(e) => setData('branch_id', e.target.value)}>
                                    {branches.map((b) => (
                                        <MenuItem key={b.id} value={b.id}>
                                            {b.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small" error={!!errors.expense_category_id} required>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={data.expense_category_id}
                                    label="Category"
                                    onChange={(e) => setData('expense_category_id', e.target.value)}
                                >
                                    {(categories || []).map((c) => (
                                        <MenuItem key={c.id} value={c.id}>
                                            {c.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                label="Title"
                                fullWidth
                                size="small"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                error={!!errors.title}
                                helperText={errors.title}
                                required
                            />

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Amount"
                                    fullWidth
                                    size="small"
                                    type="number"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    error={!!errors.amount}
                                    helperText={errors.amount}
                                    inputProps={{ min: 0, step: '0.01' }}
                                    required
                                />
                                <TextField
                                    label="Expense Date"
                                    fullWidth
                                    size="small"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={data.expense_date}
                                    onChange={(e) => setData('expense_date', e.target.value)}
                                    error={!!errors.expense_date}
                                    helperText={errors.expense_date}
                                    required
                                />
                            </Stack>

                            <TextField
                                label="Notes"
                                fullWidth
                                size="small"
                                multiline
                                rows={3}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                error={!!errors.notes}
                                helperText={errors.notes}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} size="small">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" size="small" disabled={processing}>
                            {editMode ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
