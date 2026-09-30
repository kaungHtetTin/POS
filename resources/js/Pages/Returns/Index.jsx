import React, { useMemo, useState } from 'react';
import DataTableFooter from '@/Components/DataTableFooter';
import TableRowActions, { TableActionCell, TableActionHead } from '@/Components/TableRowActions';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, useForm, router } from '@/spa';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
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

export default function ReturnsIndex({ auth, returns, branches, filters, settlementSummary }) {
    const [open, setOpen] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [reference, setReference] = useState(null);
    const [lineEdits, setLineEdits] = useState({});
    const [reviewing, setReviewing] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [settlementOpen, setSettlementOpen] = useState(false);
    const [settlementAmount, setSettlementAmount] = useState('');
    const [settlementMethod, setSettlementMethod] = useState('Cash');
    const [settlementReference, setSettlementReference] = useState('');
    const [actionError, setActionError] = useState('');
    const [actionProcessing, setActionProcessing] = useState(false);

    const userPermissions = auth?.user?.permissions || [];
    const canCreateReturns = userPermissions.includes('process_sale');
    const canApproveReturns = userPermissions.includes('approve_returns');
    const canManagePayments = userPermissions.includes('manage_payments');

    const [typeFilter, setTypeFilter] = useState(filters?.type || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || '');
    const [branchFilter, setBranchFilter] = useState(filters?.branch_id || '');
    const returnRows = returns?.data || returns || [];

    const defaultType = 'Customer';
    const defaultBranchId = auth.user?.current_branch_id || auth.user?.branch_id || branches?.[0]?.id || '';

    const { data, setData, post, reset, errors, processing } = useForm({
        type: defaultType,
        invoice_number: '',
        reason: '',
        reference_id: '',
        items: [],
        payment_method: 'Cash',
        payment_reference: '',
    });

    const selectedItems = useMemo(() => {
        const items = [];
        for (const [id, v] of Object.entries(lineEdits || {})) {
            const qty = Number(v.quantity || 0);
            const focQty = Number(v.foc_quantity || 0);
            if (qty > 0 || focQty > 0) {
                items.push({
                    reference_item_id: id,
                    quantity: qty,
                    foc_quantity: focQty,
                    restock: Boolean(v.restock),
                });
            }
        }
        return items;
    }, [lineEdits]);

    const computedRefundAmount = useMemo(() => {
        return selectedItems.reduce((sum, i) => {
            const source = reference?.items?.find((item) => item.id === i.reference_item_id);
            return sum + Number(i.quantity || 0) * Number(source?.unit_price || 0);
        }, 0);
    }, [selectedItems, reference]);

    const estimatedCreditAmount = useMemo(() => {
        if (!reference) return 0;

        if (data.type === 'Customer') {
            if (!reference.customer_id) return 0;
            const due = Math.max(
                Number(reference.grand_total || 0)
                    - Number(reference.amount_received || 0)
                    - Number(reference.return_credit_amount || 0),
                0
            );
            return Math.min(computedRefundAmount, due);
        }

        return Math.min(computedRefundAmount, Math.max(Number(reference.due_amount || 0), 0));
    }, [computedRefundAmount, data.type, reference]);

    const estimatedImmediateSettlement = Math.max(computedRefundAmount - estimatedCreditAmount, 0);
    const paymentReferenceRequired = estimatedImmediateSettlement > 0 && data.payment_method !== 'Cash';

    const selectionError = selectedItems.some((item) => {
        const edit = lineEdits[item.reference_item_id];
        return Number(item.quantity) < 0 || Number(item.foc_quantity) < 0
            || Number(item.quantity) > Number(edit?.max || 0)
            || Number(item.foc_quantity) > Number(edit?.foc_max || 0);
    });

    const applyFilters = (page = undefined) => {
        router.get(
            route('returns.index'),
            {
                type: typeFilter || undefined,
                status: statusFilter || undefined,
                branch_id: branchFilter || undefined,
                page,
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
        setReviewing(false);
        reset();
        setData({
            type: defaultType,
            invoice_number: '',
            reason: '',
            reference_id: '',
            items: [],
            payment_method: 'Cash',
            payment_reference: '',
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setLookupError('');
        setReference(null);
        setLineEdits({});
        setReviewing(false);
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
            setData((current) => ({
                ...current,
                reference_id: payload.id,
                payment_method: data.type === 'Customer' && ['Cash', 'Card', 'Mobile', 'Wallet'].includes(payload.payment_method)
                    ? payload.payment_method
                    : current.payment_method,
                payment_reference: '',
            }));

            const initial = {};
            (payload.items || []).forEach((it) => {
                initial[it.id] = {
                    quantity: '',
                    foc_quantity: '',
                    restock: false,
                    max: data.type === 'Supplier' ? (it.remaining_paid_quantity ?? 0) : (it.quantity ?? 0),
                    foc_max: data.type === 'Supplier' ? (it.remaining_foc_quantity ?? 0) : 0,
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
        if (!reviewing) {
            if (!reference || selectedItems.length === 0 || selectionError || !data.reason.trim()) return;
            setReviewing(true);
            return;
        }
        post(route('returns.store'), {
            data: {
                type: data.type,
                reference_id: data.reference_id,
                reason: data.reason.trim(),
                items: selectedItems,
                payment_method: data.payment_method,
                payment_reference: data.payment_reference.trim() || null,
            },
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    const updateStatus = (ret, status) => {
        setActionError('');
        setActionProcessing(true);
        router.post(
            route('returns.status', ret.id),
            { status },
            { preserveScroll: true, onSuccess: () => setSelectedReturn(null), onError: (errors) => setActionError(Object.values(errors || {})[0] || 'Unable to update this return.'), onFinish: () => setActionProcessing(false) }
        );
    };

    const openSettlement = (ret) => {
        setSelectedReturn(ret);
        setSettlementAmount((Number(ret.settlement_due || 0) - Number(ret.settlement_paid || 0)).toFixed(2));
        setSettlementMethod('Cash');
        setSettlementReference('');
        setActionError('');
        setSettlementOpen(true);
    };

    const recordSettlement = () => {
        setActionError('');
        setActionProcessing(true);
        router.post(route('returns.settle', selectedReturn.id), {
            amount: settlementAmount,
            payment_method: settlementMethod,
            reference_number: settlementReference || null,
        }, {
            preserveScroll: true,
            onSuccess: () => { setSettlementOpen(false); setSelectedReturn(null); },
            onError: (errors) => setActionError(Object.values(errors || {})[0] || 'Unable to record settlement.'),
            onFinish: () => setActionProcessing(false),
        });
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

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ReturnIcon fontSize="small" color="primary" />
                            RETURNS & REFUNDS
                        </Typography>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                        <Chip variant="outlined" color="warning" label={`Customer refunds to pay: ${Number(settlementSummary?.customer_refunds_due || 0).toFixed(2)}`} />
                        <Chip variant="outlined" color="info" label={`Supplier refunds to receive: ${Number(settlementSummary?.supplier_refunds_due || 0).toFixed(2)}`} />
                    </Stack>

                    <ReportFilterToolbar appBar
                        ariaLabel="Return filters"
                        fieldKinds={['select', 'select', 'wide']}
                        onSubmit={() => applyFilters()}
                        actions={(
                            <>
                                <Button variant="contained" size="small" type="submit">Filter</Button>
                                <Button variant="outlined" size="small" onClick={clearFilters}>Clear</Button>
                                <CsvExportButton source={returns} dataKey="returns" filename="returns.csv" />
                                {canCreateReturns && <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpen}>New Return</Button>}
                            </>
                        )}
                    >
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

                    </ReportFilterToolbar>

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
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Invoice credit</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">To settle</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                                    <TableActionHead>Actions</TableActionHead>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {returnRows.map((r) => (
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
                                        <TableCell align="right">{r.status === 'Approved' ? Number(r.credit_applied || 0).toFixed(2) : '—'}</TableCell>
                                        <TableCell align="right">{r.status === 'Approved' ? (Number(r.settlement_due || 0) - Number(r.settlement_paid || 0)).toFixed(2) : '—'}</TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDateTime(r.created_at)}
                                            </Typography>
                                        </TableCell>
                                        <TableActionCell>
                                            <TableRowActions label={r.reference_number || r.reference_id}>
                                                <Button title="View return details" size="small" onClick={() => { setActionError(''); setSelectedReturn(r); }}>Details</Button>
                                                {r.status === 'Approved' && canManagePayments && Number(r.settlement_due || 0) > Number(r.settlement_paid || 0) && (
                                                    <Button title={r.type === 'Customer' ? 'Pay refund' : 'Receive refund'} size="small" variant="outlined" onClick={() => openSettlement(r)}>{r.type === 'Customer' ? 'Pay refund' : 'Receive refund'}</Button>
                                                )}
                                            </TableRowActions>
                                        </TableActionCell>
                                    </TableRow>
                                ))}

                                {returnRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No returns found.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <DataTableFooter paginator={returns} onPageChange={(page) => applyFilters(page)} />
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
                            {selectionError && <Alert severity="error">A return quantity exceeds the amount available on the invoice.</Alert>}
                            {Object.keys(errors).length > 0 && <Alert severity="error">{Object.values(errors).map((error, index) => <div key={index}>{error}</div>)}</Alert>}
                            {reviewing ? (
                                <>
                                    <Alert severity="warning">Submitting will immediately approve this return, update stock and invoice balances, and complete the remaining refund.</Alert>
                                    <Typography variant="subtitle2">{data.type === 'Customer' ? 'Sale return' : 'Purchase return'} · {reference?.invoice_number}</Typography>
                                    <Typography variant="body2">{reference?.party_name} · {reference?.branch_name}</Typography>
                                    <Typography variant="body2">Reason: {data.reason}</Typography>
                                    {selectedItems.map((item) => {
                                        const source = reference?.items?.find((row) => row.id === item.reference_item_id);
                                        return <Typography variant="body2" key={item.reference_item_id}>{source?.product_name}: {item.quantity} paid{data.type === 'Supplier' ? `, ${item.foc_quantity} free` : item.restock ? ' · restock' : ' · do not restock'} · {(Number(item.quantity) * Number(source?.unit_price || 0)).toFixed(2)}</Typography>;
                                    })}
                                    <Typography variant="subtitle2">Estimated return value: {computedRefundAmount.toFixed(2)}</Typography>
                                    <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Applied to invoice balance</Typography><Typography variant="body2">{estimatedCreditAmount.toFixed(2)}</Typography></Stack>
                                    <Stack direction="row" justifyContent="space-between"><Typography variant="body2" fontWeight={700}>{data.type === 'Customer' ? 'Refund to customer now' : 'Refund received now'}</Typography><Typography variant="body2" fontWeight={700}>{estimatedImmediateSettlement.toFixed(2)}</Typography></Stack>
                                    {estimatedImmediateSettlement > 0 && <>
                                        <FormControl fullWidth size="small" error={!!errors.payment_method}>
                                            <InputLabel>Refund method</InputLabel>
                                            <Select value={data.payment_method} label="Refund method" onChange={(e) => setData('payment_method', e.target.value)}>
                                                {['Cash', 'Card', 'Mobile', 'Wallet'].map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                        {data.payment_method !== 'Cash' && <TextField size="small" label="Payment reference" value={data.payment_reference} onChange={(e) => setData('payment_reference', e.target.value)} error={!!errors.payment_reference} helperText={errors.payment_reference} required fullWidth />}
                                        {data.payment_method === 'Cash' && <Alert severity="info">A cash refund requires your open cash shift at this branch.</Alert>}
                                    </>}
                                </>
                            ) : <>

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
                                            setData((current) => ({
                                                ...current,
                                                type: e.target.value,
                                                invoice_number: '',
                                                reference_id: '',
                                                payment_method: 'Cash',
                                                payment_reference: '',
                                            }));
                                        }}
                                    >
                                        <MenuItem value="Customer">Sale return</MenuItem>
                                        <MenuItem value="Supplier">Purchase return</MenuItem>
                                    </Select>
                                </FormControl>

                                <Box sx={{ display: 'flex', flex: 1, minWidth: 0, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                                    <TextField
                                        size="small"
                                        label={data.type === 'Supplier' ? 'Purchase Invoice Number' : 'Sale Invoice Number'}
                                        value={data.invoice_number}
                                        onChange={(e) => setData('invoice_number', e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } }}
                                        sx={{ flex: 1, minWidth: 0 }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<LookupIcon fontSize="small" />}
                                        onClick={lookup}
                                        disabled={lookupLoading}
                                        sx={{ flexShrink: 0 }}
                                    >
                                        Lookup
                                    </Button>
                                </Box>
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
                                            {reference.party_name} · {reference.branch_name}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">{data.type === 'Customer' ? `Original total ${Number(reference.grand_total || 0).toFixed(2)} · Received ${Number(reference.amount_received || 0).toFixed(2)} · Prior invoice credit ${Number(reference.return_credit_amount || 0).toFixed(2)}` : `Original total ${Number(reference.total_amount || 0).toFixed(2)} · Paid ${Number(reference.paid_amount || 0).toFixed(2)} · Due ${Number(reference.due_amount || 0).toFixed(2)}`}</Typography>
                                    {data.type === 'Customer' && <Alert severity="info" sx={{ mt: 1 }}>Select Restock only for sellable medicine. Damaged or expired items stay out of inventory.</Alert>}

                                    <Divider sx={{ my: 1.5 }} />

                                    <TableContainer sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 720 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }} align="right">Available</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }} align="right">Return qty</TableCell>
                                                {data.type === 'Supplier' && <TableCell sx={{ fontWeight: 700 }} align="right">Free qty</TableCell>}
                                                {data.type === 'Customer' && <TableCell sx={{ fontWeight: 700 }}>Inventory</TableCell>}
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
                                                const v = lineEdits[it.id] || { quantity: '', foc_quantity: '', max: it.quantity || 0, foc_max: 0 };
                                                const qty = Number(v.quantity || 0);
                                                const price = Number(it.unit_price || 0);
                                                const max = Number(v.max ?? it.quantity ?? 0);
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
                                                            {Number(it.previously_returned_quantity || 0) > 0 && <Typography variant="caption" color="text.secondary" display="block">Previously returned: {it.previously_returned_quantity}</Typography>}
                                                            {data.type === 'Supplier' && Number(it.foc_quantity || 0) > 0 && (
                                                                <Typography variant="caption" color="text.secondary" display="block">
                                                                    Free available: {it.remaining_foc_quantity}
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
                                                                value={v.quantity ?? ''}
                                                                placeholder="0"
                                                                onChange={(e) =>
                                                                    setLineEdits((prev) => ({
                                                                        ...prev,
                                                                        [it.id]: { ...v, quantity: e.target.value },
                                                                    }))
                                                                }
                                                                inputProps={{ min: 0, max, step: data.type === 'Supplier' ? 1 : '0.01', 'aria-label': `Return quantity for ${it.product_name}` }}
                                                                sx={{ width: 90 }}
                                                            />
                                                        </TableCell>
                                                        {data.type === 'Supplier' && <TableCell align="right"><TextField size="small" type="number" value={v.foc_quantity ?? ''} placeholder="0" onChange={(e) => setLineEdits((prev) => ({ ...prev, [it.id]: { ...v, foc_quantity: e.target.value } }))} inputProps={{ min: 0, max: v.foc_max, step: 1, 'aria-label': `Return free quantity for ${it.product_name}` }} sx={{ width: 90 }} /></TableCell>}
                                                        {data.type === 'Customer' && <TableCell><FormControlLabel label={it.expiry_date && it.expiry_date < new Date().toISOString().slice(0, 10) ? 'Expired' : 'Restock'} control={<Checkbox size="small" disabled={Boolean(it.expiry_date && it.expiry_date < new Date().toISOString().slice(0, 10))} checked={Boolean(v.restock)} onChange={(e) => setLineEdits((prev) => ({ ...prev, [it.id]: { ...v, restock: e.target.checked } }))} />} /></TableCell>}
                                                        <TableCell align="right">
                                                            {price.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                            {lineTotal.toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table></TableContainer>

                                    <Divider sx={{ my: 1.5 }} />

                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                            Estimated refund amount
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                            {computedRefundAmount.toFixed(2)}
                                        </Typography>
                                    </Stack>
                                </Paper>
                            )}
                            </>}
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={reviewing ? () => setReviewing(false) : handleClose} size="small">
                            {reviewing ? 'Back' : 'Cancel'}
                        </Button>
                        <Button
                            type="submit"
                            size="small"
                            variant="contained"
                            disabled={processing || !reference || selectedItems.length === 0 || selectionError || !data.reason.trim() || (paymentReferenceRequired && !data.payment_reference.trim())}
                        >
                            {reviewing ? 'Approve & complete refund' : 'Review return'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
            <Dialog open={Boolean(selectedReturn) && !settlementOpen} onClose={() => setSelectedReturn(null)} maxWidth="sm" fullWidth>
                <DialogTitle>{selectedReturn?.type === 'Customer' ? 'Sale return' : 'Purchase return'} · {selectedReturn?.reference_number}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.5}>
                        {actionError && <Alert severity="error">{actionError}</Alert>}
                        <Typography variant="body2">Status: <strong>{selectedReturn?.status}</strong> · Branch: {selectedReturn?.branch?.name}</Typography>
                        <Typography variant="body2">Reason: {selectedReturn?.reason}</Typography>
                        <Divider />
                        {(selectedReturn?.items || []).map((item) => <Stack key={item.id} direction="row" justifyContent="space-between"><Typography variant="body2">{item.product?.name} · {item.quantity} {item.unit?.short_name || item.unit?.name}{selectedReturn.type === 'Customer' ? item.restock ? ' · Restock' : ' · Do not restock' : ''}</Typography><Typography variant="body2">{Number(item.refund_amount || 0).toFixed(2)}</Typography></Stack>)}
                        <Divider />
                        <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Return value</Typography><Typography variant="body2" fontWeight={700}>{Number(selectedReturn?.refund_amount || 0).toFixed(2)}</Typography></Stack>
                        {selectedReturn?.status === 'Approved' && <>
                            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Applied to invoice balance</Typography><Typography variant="body2">{Number(selectedReturn.credit_applied || 0).toFixed(2)}</Typography></Stack>
                            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">{selectedReturn.type === 'Customer' ? 'Refund paid' : 'Refund received'}</Typography><Typography variant="body2">{Number(selectedReturn.settlement_paid || 0).toFixed(2)}</Typography></Stack>
                            <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Still to settle</Typography><Typography variant="body2" fontWeight={700}>{(Number(selectedReturn.settlement_due || 0) - Number(selectedReturn.settlement_paid || 0)).toFixed(2)}</Typography></Stack>
                            {(selectedReturn.settlements || []).map((payment) => <Typography key={payment.id} variant="caption" color="text.secondary">{formatDateTime(payment.settled_at)} · {payment.payment_method} · {Number(payment.amount).toFixed(2)}{payment.reference_number ? ` · ${payment.reference_number}` : ''}</Typography>)}
                        </>}
                        {selectedReturn?.status === 'Pending' && <Alert severity="info">Approval adjusts the original invoice balance and the stock shown above. Any remaining refund must be recorded when money actually changes hands.</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedReturn(null)}>Close</Button>
                    {selectedReturn?.status === 'Pending' && canApproveReturns && <>
                        <Button color="error" disabled={actionProcessing} onClick={() => updateStatus(selectedReturn, 'Rejected')}>Reject</Button>
                        <Button variant="contained" disabled={actionProcessing} onClick={() => updateStatus(selectedReturn, 'Approved')}>Approve return</Button>
                    </>}
                    {selectedReturn?.status === 'Approved' && canManagePayments && Number(selectedReturn.settlement_due || 0) > Number(selectedReturn.settlement_paid || 0) && <Button variant="contained" onClick={() => openSettlement(selectedReturn)}>{selectedReturn.type === 'Customer' ? 'Pay refund' : 'Receive refund'}</Button>}
                </DialogActions>
            </Dialog>
            <Dialog open={settlementOpen} onClose={() => setSettlementOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{selectedReturn?.type === 'Customer' ? 'Record customer refund paid' : 'Record supplier refund received'}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {actionError && <Alert severity="error">{actionError}</Alert>}
                        <Alert severity="info">Record this only after the payment has actually occurred. Cash payments require an open shift at this branch.</Alert>
                        <Typography variant="body2">Remaining: {(Number(selectedReturn?.settlement_due || 0) - Number(selectedReturn?.settlement_paid || 0)).toFixed(2)}</Typography>
                        <TextField label="Amount" type="number" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} inputProps={{ min: 0.01, max: Number(selectedReturn?.settlement_due || 0) - Number(selectedReturn?.settlement_paid || 0), step: 0.01 }} fullWidth required />
                        <FormControl fullWidth><InputLabel>Payment method</InputLabel><Select value={settlementMethod} label="Payment method" onChange={(e) => setSettlementMethod(e.target.value)}>{['Cash', 'Card', 'Mobile', 'Wallet'].map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}</Select></FormControl>
                        <TextField label="Payment reference" value={settlementReference} onChange={(e) => setSettlementReference(e.target.value)} required={settlementMethod !== 'Cash'} fullWidth />
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setSettlementOpen(false)}>Cancel</Button><Button variant="contained" disabled={actionProcessing || (settlementMethod !== 'Cash' && !settlementReference.trim()) || Number(settlementAmount) <= 0 || Number(settlementAmount) > Number(selectedReturn?.settlement_due || 0) - Number(selectedReturn?.settlement_paid || 0)} onClick={recordSettlement}>Record payment</Button></DialogActions>
            </Dialog>
        </MainLayout>
    );
}
