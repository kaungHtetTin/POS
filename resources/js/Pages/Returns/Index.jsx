import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Alert,
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
    InputAdornment,
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
    Refresh as LookupIcon,
    AssignmentReturn as ReturnIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

export default function ReturnsIndex({ auth, returns, branches, filters }) {
    const [open, setOpen] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [reference, setReference] = useState(null);
    const [lineEdits, setLineEdits] = useState({});

    const canApproveReturns = (auth?.user?.permissions || []).includes('approve_returns');

    const [typeFilter, setTypeFilter] = useState(filters?.type || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || '');
    const [branchFilter, setBranchFilter] = useState(filters?.branch_id || '');

    const defaultType = 'Customer';
    const defaultBranchId = auth.user?.current_branch_id || auth.user?.branch_id || branches?.[0]?.id || '';

    const { data, setData, post, reset, errors, processing } = useForm({
        type: defaultType,
        invoice_number: '',
        reason: '',
        reference_id: '',
        items: [],
    });

    const selectedItems = useMemo(() => {
        const items = [];
        for (const [id, v] of Object.entries(lineEdits || {})) {
            const qty = Number(v.quantity || 0);
            if (qty > 0) {
                items.push({
                    reference_item_id: id,
                    quantity: qty,
                    refund_price: Number(v.refund_price || 0),
                });
            }
        }
        return items;
    }, [lineEdits]);

    const computedRefundAmount = useMemo(() => {
        return selectedItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.refund_price || 0), 0);
    }, [selectedItems]);

    const applyFilters = () => {
        router.get(
            route('returns.index'),
            {
                type: typeFilter || undefined,
                status: statusFilter || undefined,
                branch_id: branchFilter || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const clearFilters = () => {
        setTypeFilter('');
        setStatusFilter('');
        setBranchFilter('');
        router.get(route('returns.index'));
    };

    const handleOpen = () => {
        setLookupError('');
        setReference(null);
        setLineEdits({});
        reset();
        setData({
            type: defaultType,
            invoice_number: '',
            reason: '',
            reference_id: '',
            items: [],
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setLookupError('');
        setReference(null);
        setLineEdits({});
        reset();
    };

    const lookup = async () => {
        const invoice = (data.invoice_number || '').trim();
        setLookupError('');
        setReference(null);
        setLineEdits({});

        if (!invoice) return;

        setLookupLoading(true);
        try {
            const endpoint = data.type === 'Supplier' ? 'returns.lookup.purchase' : 'returns.lookup.sale';
            const response = await fetch(route(endpoint, { invoice_number: invoice }));
            if (!response.ok) {
                setLookupError(`Not found: ${invoice}`);
                return;
            }
            const payload = await response.json();
            setReference(payload);
            setData('reference_id', payload.id);

            const initial = {};
            (payload.items || []).forEach((it) => {
                initial[it.id] = {
                    quantity: 0,
                    refund_price: it.unit_price ?? 0,
                    max: data.type === 'Supplier' ? (it.received_quantity ?? it.quantity ?? 0) : (it.quantity ?? 0),
                };
            });
            setLineEdits(initial);
        } catch {
            setLookupError(`Lookup failed: ${invoice}`);
        } finally {
            setLookupLoading(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        setData('items', selectedItems);
        post(route('returns.store'), {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    const updateStatus = (ret, status) => {
        router.post(
            route('returns.status', ret.id),
            { status },
            { preserveScroll: true }
        );
    };

    const formatDateTime = (value) => {
        try {
            return new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(value));
        } catch {
            return value;
        }
    };

    return (
        <MainLayout auth={auth} header="Returns & Refunds">
            <Head title="Returns" />

            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ReturnIcon fontSize="small" color="primary" />
                            RETURNS & REFUNDS
                        </Typography>
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpen}>
                            New Return
                        </Button>
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 170 }}>
                            <InputLabel>Type</InputLabel>
                            <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="Customer">Customer</MenuItem>
                                <MenuItem value="Supplier">Supplier</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 170 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="Pending">Pending</MenuItem>
                                <MenuItem value="Approved">Approved</MenuItem>
                                <MenuItem value="Rejected">Rejected</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 220 }}>
                            <InputLabel>Branch</InputLabel>
                            <Select value={branchFilter} label="Branch" onChange={(e) => setBranchFilter(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value={defaultBranchId}>Current</MenuItem>
                                {branches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>
                                        {b.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Button variant="contained" size="small" onClick={applyFilters} sx={{ minWidth: 110 }}>
                            Filter
                        </Button>
                        <Button variant="outlined" size="small" onClick={clearFilters} sx={{ minWidth: 110 }}>
                            Clear
                        </Button>
                    </Stack>

                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">
                                        Refund
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(returns || []).map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell>
                                            <Chip size="small" label={r.type} variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                {r.reference_number || r.reference_id}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {r.branch?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={r.status}
                                                color={r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'error' : 'warning'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                                            {Number(r.refund_amount || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDateTime(r.created_at)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {r.status === 'Pending' && canApproveReturns && (
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Button size="small" variant="outlined" color="success" onClick={() => updateStatus(r, 'Approved')}>
                                                        Approve
                                                    </Button>
                                                    <Button size="small" variant="outlined" color="error" onClick={() => updateStatus(r, 'Rejected')}>
                                                        Reject
                                                    </Button>
                                                </Stack>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {(returns || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No returns found.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Create Return
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            {lookupError && <Alert severity="error">{lookupError}</Alert>}

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <FormControl size="small" sx={{ minWidth: 180 }} error={!!errors.type} required>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        value={data.type}
                                        label="Type"
                                        onChange={(e) => {
                                            setReference(null);
                                            setLineEdits({});
                                            setLookupError('');
                                            setData('type', e.target.value);
                                            setData('reference_id', '');
                                        }}
                                    >
                                        <MenuItem value="Customer">Customer</MenuItem>
                                        <MenuItem value="Supplier">Supplier</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    size="small"
                                    label={data.type === 'Supplier' ? 'Purchase Invoice Number' : 'Sale Invoice Number'}
                                    value={data.invoice_number}
                                    onChange={(e) => setData('invoice_number', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && lookup()}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<LookupIcon fontSize="small" />}
                                                    onClick={lookup}
                                                    disabled={lookupLoading}
                                                >
                                                    Lookup
                                                </Button>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Stack>

                            <TextField
                                label="Reason"
                                fullWidth
                                size="small"
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                                error={!!errors.reason}
                                helperText={errors.reason}
                                multiline
                                rows={2}
                                required
                            />

                            {reference && (
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                            {reference.invoice_number}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {reference.branch_name}
                                        </Typography>
                                    </Stack>

                                    <Divider sx={{ my: 1.5 }} />

                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }} align="right">
                                                    Max
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700 }} align="right">
                                                    Qty
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700 }} align="right">
                                                    Price
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700 }} align="right">
                                                    Line
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(reference.items || []).map((it) => {
                                                const v = lineEdits[it.id] || { quantity: 0, refund_price: it.unit_price || 0, max: it.quantity || 0 };
                                                const qty = Number(v.quantity || 0);
                                                const price = Number(v.refund_price || 0);
                                                const max = Number(v.max || it.quantity || 0);
                                                const lineTotal = qty * price;

                                                return (
                                                    <TableRow key={it.id} hover>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                {it.product_name}
                                                            </Typography>
                                                            {it.batch_number && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Batch: {it.batch_number} {it.expiry_date ? `| Exp: ${it.expiry_date}` : ''}
                                                                </Typography>
                                                            )}
                                                            {data.type === 'Supplier' && Number(it.foc_quantity || 0) > 0 && (
                                                                <Typography variant="caption" color="text.secondary" display="block">
                                                                    Paid: {it.quantity} | FOC: {it.foc_quantity}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {it.unit_name || '-'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                            {max}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={qty}
                                                                onChange={(e) =>
                                                                    setLineEdits((prev) => ({
                                                                        ...prev,
                                                                        [it.id]: { ...v, quantity: e.target.value },
                                                                    }))
                                                                }
                                                                inputProps={{ min: 0, max, step: data.type === 'Supplier' ? 1 : '0.01' }}
                                                                sx={{ width: 90 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={price}
                                                                onChange={(e) =>
                                                                    setLineEdits((prev) => ({
                                                                        ...prev,
                                                                        [it.id]: { ...v, refund_price: e.target.value },
                                                                    }))
                                                                }
                                                                inputProps={{ min: 0, step: '0.01' }}
                                                                sx={{ width: 110 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                            {lineTotal.toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>

                                    <Divider sx={{ my: 1.5 }} />

                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                            Refund Amount
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                            {computedRefundAmount.toFixed(2)}
                                        </Typography>
                                    </Stack>
                                </Paper>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} size="small">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="small"
                            variant="contained"
                            disabled={processing || !reference || selectedItems.length === 0}
                        >
                            Create Return
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
