import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from '@/spa';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
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
    Check as CheckIcon,
    Close as CloseIcon,
    DeleteOutline as DeleteIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

const steps = [
    { label: 'Basic information', shortLabel: 'Basic' },
    { label: 'Select products', shortLabel: 'Products' },
    { label: 'Batch and quantity', shortLabel: 'Quantities' },
    { label: 'Review transfer', shortLabel: 'Review' },
];

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

export default function TransferFormDialog({ open, onClose, branches = [], products = [], categories = [], auth }) {
    const defaultSource = auth?.user?.current_branch_id || auth?.user?.branch_id || branches[0]?.id || '';
    const defaultDestination = branches.find((branch) => String(branch.id) !== String(defaultSource))?.id || '';
    const [activeStep, setActiveStep] = useState(0);
    const [stepErrors, setStepErrors] = useState([]);
    const [productQuery, setProductQuery] = useState('');
    const [categoryId, setCategoryId] = useState('all');
    const [sourceBatches, setSourceBatches] = useState({});

    const { data, setData, post, processing, errors, clearErrors, reset } = useForm({
        from_branch_id: defaultSource,
        to_branch_id: defaultDestination,
        transfer_date: today(),
        notes: '',
        items: [],
    });

    const productById = (id) => products.find((product) => String(product.id) === String(id)) || null;
    const branchName = (id) => branches.find((branch) => String(branch.id) === String(id))?.name || '-';
    const batchById = (productId, batchId) => (sourceBatches[productId] || []).find((batch) => String(batch.id) === String(batchId)) || null;
    const getProductStock = (product) => (product?.inventories || [])
        .filter((inventory) => String(inventory.branch_id) === String(data.from_branch_id))
        .reduce((total, inventory) => total + Number(inventory.quantity || 0), 0);

    const selectedProductIds = useMemo(
        () => new Set(data.items.map((item) => String(item.product_id))),
        [data.items]
    );
    const filteredProducts = useMemo(() => {
        const query = productQuery.trim().toLowerCase();
        return products.filter((product) => {
            const matchesCategory = categoryId === 'all' || String(product.category_id) === String(categoryId);
            const searchText = [product.name, product.generic_name, product.brand_name, product.barcode, product.category?.name]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return matchesCategory && (!query || searchText.includes(query));
        });
    }, [products, productQuery, categoryId]);

    const allFilteredSelected = filteredProducts.length > 0
        && filteredProducts.every((product) => selectedProductIds.has(String(product.id)));
    const someFilteredSelected = filteredProducts.some((product) => selectedProductIds.has(String(product.id)));

    const fetchBatches = async (productId, branchId = data.from_branch_id) => {
        if (!productId || !branchId) return;
        try {
            const response = await fetch(route('inventory.batches.get', { product: productId, branch: branchId }));
            const batches = await response.json();
            setSourceBatches((current) => ({
                ...current,
                [productId]: [...batches].sort((left, right) => new Date(left.expiry_date) - new Date(right.expiry_date)),
            }));
        } catch (error) {
            setSourceBatches((current) => ({ ...current, [productId]: [] }));
        }
    };

    useEffect(() => {
        if (!open) return;
        data.items.forEach((item) => fetchBatches(item.product_id, data.from_branch_id));
    }, [data.from_branch_id, open]);

    const updateBasic = (field, value) => {
        setStepErrors([]);
        if (field === 'from_branch_id') {
            setSourceBatches({});
            setData({
                ...data,
                from_branch_id: value,
                items: data.items.map((item) => ({ ...item, inventory_batch_id: '' })),
            });
            return;
        }
        setData(field, value);
    };

    const addProduct = (product) => {
        if (!product?.id || selectedProductIds.has(String(product.id))) return;
        setData('items', [...data.items, { product_id: product.id, inventory_batch_id: '', quantity: 1 }]);
        fetchBatches(product.id);
        setStepErrors([]);
    };

    const removeProduct = (productId) => {
        setData('items', data.items.filter((item) => String(item.product_id) !== String(productId)));
    };

    const toggleFilteredProducts = (selected) => {
        if (!selected) {
            const filteredIds = new Set(filteredProducts.map((product) => String(product.id)));
            setData('items', data.items.filter((item) => !filteredIds.has(String(item.product_id))));
            return;
        }
        const additions = filteredProducts
            .filter((product) => !selectedProductIds.has(String(product.id)))
            .map((product) => ({ product_id: product.id, inventory_batch_id: '', quantity: 1 }));
        additions.forEach((item) => fetchBatches(item.product_id));
        setData('items', [...data.items, ...additions]);
        setStepErrors([]);
    };

    const updateItem = (index, field, value) => {
        const items = [...data.items];
        items[index] = { ...items[index], [field]: value };
        setData('items', items);
        setStepErrors([]);
    };

    const getStepErrors = (step) => {
        const messages = [];
        if (step === 0) {
            if (!data.from_branch_id) messages.push('Source branch is required.');
            if (!data.to_branch_id) messages.push('Destination branch is required.');
            if (String(data.from_branch_id) === String(data.to_branch_id)) messages.push('Destination must be different from source.');
            if (!data.transfer_date) messages.push('Transfer date is required.');
        }
        if (step === 1 && data.items.length === 0) messages.push('Select at least one product.');
        if (step === 2) {
            if (data.items.length === 0) messages.push('Select at least one product.');
            data.items.forEach((item) => {
                const name = productById(item.product_id)?.name || 'Product';
                const batch = batchById(item.product_id, item.inventory_batch_id);
                if (!item.inventory_batch_id) messages.push(`${name}: batch is required.`);
                if (Number(item.quantity || 0) < 1) messages.push(`${name}: quantity must be at least 1.`);
                if (batch && Number(item.quantity) > Number(batch.quantity)) messages.push(`${name}: quantity exceeds available stock.`);
            });
        }
        if (step === 3) messages.push(...getStepErrors(0), ...getStepErrors(1), ...getStepErrors(2));
        return [...new Set(messages)];
    };

    const goNext = () => {
        clearErrors();
        const messages = getStepErrors(activeStep);
        if (messages.length) {
            setStepErrors(messages);
            return;
        }
        setStepErrors([]);
        setActiveStep((step) => Math.min(step + 1, steps.length - 1));
    };

    const resetAndClose = () => {
        setActiveStep(0);
        setStepErrors([]);
        setProductQuery('');
        setCategoryId('all');
        setSourceBatches({});
        clearErrors();
        reset();
        onClose?.();
    };

    const handleClose = () => {
        if (processing) return;
        resetAndClose();
    };

    const submit = (event) => {
        event.preventDefault();
        const messages = getStepErrors(3);
        if (messages.length) {
            setStepErrors(messages);
            setActiveStep(messages.some((message) => message.includes('branch') || message.includes('date')) ? 0 : 2);
            return;
        }
        post(route('inventory.transfers.store'), {
            preserveScroll: true,
            onSuccess: resetAndClose,
            onError: (formErrors) => {
                const keys = Object.keys(formErrors || {});
                setActiveStep(keys.some((key) => key === 'items' || key.startsWith('items.')) ? 2 : 0);
                setStepErrors(['validation']);
            },
        });
    };

    const invalidCell = (invalid) => ({
        p: 0,
        ...(invalid ? { boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.error.main}` } : {}),
    });
    const compactInput = {
        '& .MuiInputBase-root': { minHeight: 32, borderRadius: 0, fontSize: 12 },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
        '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
        '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1, borderColor: 'primary.main' },
        '& input[type=number]': { MozAppearance: 'textfield' },
        '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', m: 0 },
    };

    return (
        <Dialog
            open={open}
            onClose={processing ? undefined : handleClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: {
                    width: 'min(1440px, calc(100vw - 32px))',
                    height: 'min(900px, calc(100vh - 32px))',
                    maxHeight: 'calc(100vh - 32px)',
                    m: 2,
                    overflow: 'hidden',
                },
            }}
        >
            <Box component="form" onSubmit={submit} sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <DialogTitle sx={{ width: '100%', boxSizing: 'border-box', px: { xs: 1.5, md: 2 }, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" sx={{ width: '100%', minHeight: 42 }}>
                        <Box sx={{ minWidth: { xs: 120, md: 210 }, flexShrink: 0 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>New Transfer</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: 'none', lg: 'block' } }}>
                                Move stock between branches by batch
                            </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" sx={{ flex: '0 1 760px', minWidth: 0, maxWidth: 760, ml: 'auto', gap: 1 }}>
                            <Box role="tablist" aria-label="Stock transfer form steps" sx={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'flex-start', px: 0.5 }}>
                                {steps.map((step, index) => {
                                    const completed = index < activeStep;
                                    const active = index === activeStep;
                                    return (
                                        <Box
                                            key={step.label}
                                            component="button"
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            aria-current={active ? 'step' : undefined}
                                            title={step.label}
                                            onClick={() => {
                                                if (index <= activeStep) {
                                                    setStepErrors([]);
                                                    clearErrors();
                                                    setActiveStep(index);
                                                }
                                            }}
                                            disabled={index > activeStep || processing}
                                            sx={{
                                                position: 'relative', flex: 1, minWidth: 0, p: 0, m: 0, border: 0,
                                                color: 'inherit', bgcolor: 'transparent', font: 'inherit',
                                                cursor: index <= activeStep && !processing ? 'pointer' : 'default',
                                                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2, borderRadius: 1 },
                                            }}
                                        >
                                            {index < steps.length - 1 && (
                                                <Box aria-hidden="true" sx={{ position: 'absolute', zIndex: 0, top: 13, left: '50%', width: '100%', height: 2, bgcolor: completed ? 'success.light' : 'divider' }} />
                                            )}
                                            <Stack alignItems="center" spacing={0.25} sx={{ position: 'relative', zIndex: 1 }}>
                                                <Box sx={{
                                                    width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', border: '2px solid',
                                                    borderColor: completed || active ? 'success.light' : 'divider',
                                                    bgcolor: completed ? 'success.light' : 'background.paper',
                                                    color: completed ? 'common.white' : active ? 'success.dark' : 'text.secondary',
                                                    boxShadow: active ? (theme) => `0 0 0 5px ${theme.palette.success.main}18` : 'none',
                                                    fontSize: '0.75rem', fontWeight: 800,
                                                }}>
                                                    {completed ? <CheckIcon sx={{ fontSize: 18 }} /> : index + 1}
                                                </Box>
                                                <Typography component="span" sx={{
                                                    display: { xs: 'none', md: 'block' }, position: 'relative', pb: active ? 0.5 : 0,
                                                    color: completed || active ? 'success.dark' : 'text.secondary', fontSize: '0.7rem', fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap',
                                                    '&::after': active ? { content: '""', position: 'absolute', left: '50%', bottom: 0, width: 28, height: 3, borderRadius: 2, bgcolor: 'success.dark', transform: 'translateX(-50%)' } : undefined,
                                                }}>
                                                    {step.shortLabel}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Box>
                            <IconButton size="small" onClick={handleClose} disabled={processing} aria-label="Cancel transfer" sx={{ flexShrink: 0 }}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ p: activeStep <= 2 ? { xs: 1.25, md: 1.5 } : { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: activeStep <= 2 ? 'hidden' : 'auto', bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'background.default' }}>
                    <Stack spacing={1.25} sx={{ flex: activeStep <= 2 ? 1 : 'initial', minHeight: 0 }}>
                        {stepErrors.length > 0 && activeStep !== 2 && (
                            <Paper variant="outlined" sx={{ px: 1.25, py: 0.75, borderColor: 'error.main', bgcolor: 'error.lighter' }}>
                                <Typography variant="body2" color="error">Complete the required fields before continuing.</Typography>
                            </Paper>
                        )}

                        {activeStep === 0 && (
                            <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Transfer information</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                                    <TextField select label="Source Branch" size="small" value={data.from_branch_id} onChange={(event) => updateBasic('from_branch_id', event.target.value)} error={!!errors.from_branch_id} helperText={errors.from_branch_id} required>
                                        {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}
                                    </TextField>
                                    <TextField select label="Destination Branch" size="small" value={data.to_branch_id} onChange={(event) => updateBasic('to_branch_id', event.target.value)} error={!!errors.to_branch_id || String(data.from_branch_id) === String(data.to_branch_id)} helperText={errors.to_branch_id || (String(data.from_branch_id) === String(data.to_branch_id) ? 'Choose a different branch' : '')} required>
                                        {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}
                                    </TextField>
                                    <TextField label="Transfer Date" type="date" size="small" value={data.transfer_date} onChange={(event) => updateBasic('transfer_date', event.target.value)} error={!!errors.transfer_date} helperText={errors.transfer_date} InputLabelProps={{ shrink: true }} inputProps={{ max: today() }} required />
                                    <TextField label="Notes" multiline minRows={2} maxRows={6} size="small" value={data.notes} onChange={(event) => updateBasic('notes', event.target.value)} error={!!errors.notes} helperText={errors.notes} sx={{ gridColumn: { md: '1 / -1' } }} />
                                </Box>
                            </Paper>
                        )}

                        {activeStep === 1 && (
                            <Paper variant="outlined" sx={{ p: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(360px, 1fr) 320px' }, gap: 1, alignItems: 'center', mb: 1 }}>
                                    <TextField size="small" placeholder="Search name, generic, barcode, or category" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
                                    <TextField select size="small" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} inputProps={{ 'aria-label': 'Product category' }}>
                                        <MenuItem value="all">All categories</MenuItem>
                                        {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                                    </TextField>
                                </Box>
                                <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead><TableRow>
                                            <TableCell padding="checkbox" sx={{ width: 52 }}><Checkbox size="small" checked={allFilteredSelected} indeterminate={!allFilteredSelected && someFilteredSelected} disabled={!filteredProducts.length} onChange={(event) => toggleFilteredProducts(event.target.checked)} /></TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Source stock</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                                        </TableRow></TableHead>
                                        <TableBody>
                                            {filteredProducts.map((product) => {
                                                const selected = selectedProductIds.has(String(product.id));
                                                return (
                                                    <TableRow hover key={product.id} selected={selected} onClick={() => selected ? removeProduct(product.id) : addProduct(product)} sx={{ cursor: 'pointer', '&.Mui-selected, &.Mui-selected:hover': { bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(8, 145, 111, 0.08)' : 'rgba(52, 211, 153, 0.12)' } }}>
                                                        <TableCell padding="checkbox"><Checkbox size="small" checked={selected} onClick={(event) => event.stopPropagation()} onChange={() => selected ? removeProduct(product.id) : addProduct(product)} /></TableCell>
                                                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{product.name}</Typography><Typography variant="caption" color="text.secondary">{product.generic_name || '-'}</Typography></TableCell>
                                                        <TableCell>{product.category?.name || 'Uncategorized'}</TableCell>
                                                        <TableCell>{Number(getProductStock(product)).toLocaleString()}</TableCell>
                                                        <TableCell>{product.barcode || '-'}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {!filteredProducts.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><Typography color="text.secondary">No products match this search.</Typography></TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}

                        {activeStep === 2 && (
                            <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                    <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', minWidth: 900, '& .MuiTableCell-root': { px: 0.5, py: 0.35, borderRight: 1, borderColor: 'divider' }, '& .MuiTableCell-head': { py: 0.75, fontSize: '0.7rem', fontWeight: 800 } }}>
                                        <TableHead><TableRow>
                                            <TableCell sx={{ width: '25%' }}>Product</TableCell>
                                            <TableCell sx={{ width: '34%' }}>Source batch</TableCell>
                                            <TableCell sx={{ width: '14%' }}>Expiry</TableCell>
                                            <TableCell sx={{ width: '10%' }} align="right">Available</TableCell>
                                            <TableCell sx={{ width: '11%' }}>Quantity</TableCell>
                                            <TableCell sx={{ width: 52 }} />
                                        </TableRow></TableHead>
                                        <TableBody>
                                            {data.items.map((item, index) => {
                                                const product = productById(item.product_id);
                                                const batches = sourceBatches[item.product_id] || [];
                                                const selectedBatch = batchById(item.product_id, item.inventory_batch_id);
                                                const batchInvalid = (stepErrors.length > 0 && !item.inventory_batch_id) || !!errors[`items.${index}.inventory_batch_id`];
                                                const quantityInvalid = (stepErrors.length > 0 && (!item.quantity || Number(item.quantity) > Number(selectedBatch?.quantity || 0))) || !!errors[`items.${index}.quantity`];
                                                return (
                                                    <TableRow key={`${item.product_id}-${index}`}>
                                                        <TableCell><Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{product?.name || '-'}</Typography><Typography variant="caption" color="text.secondary" noWrap>{product?.barcode || '-'}</Typography></TableCell>
                                                        <TableCell sx={invalidCell(batchInvalid)}>
                                                            <TextField select fullWidth size="small" value={item.inventory_batch_id} onChange={(event) => updateItem(index, 'inventory_batch_id', event.target.value)} disabled={!batches.length} error={batchInvalid} inputProps={{ 'aria-label': `${product?.name || 'Product'} source batch` }} sx={compactInput}>
                                                                {batches.map((batch) => <MenuItem key={batch.id} value={batch.id}>{batch.batch_number} / {formatDate(batch.expiry_date)} / Qty {batch.quantity}</MenuItem>)}
                                                            </TextField>
                                                        </TableCell>
                                                        <TableCell>{formatDate(selectedBatch?.expiry_date)}</TableCell>
                                                        <TableCell align="right">{selectedBatch?.quantity ?? '-'}</TableCell>
                                                        <TableCell sx={invalidCell(quantityInvalid)}><TextField fullWidth size="small" type="number" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} error={quantityInvalid} inputProps={{ min: 1, max: selectedBatch?.quantity || undefined, 'aria-label': `${product?.name || 'Product'} quantity` }} sx={compactInput} /></TableCell>
                                                        <TableCell align="center"><IconButton size="small" color="error" onClick={() => removeProduct(item.product_id)} aria-label={`Remove ${product?.name || 'product'}`}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}

                        {activeStep === 3 && (
                            <Stack spacing={1.5}>
                                <Paper variant="outlined" sx={{ p: 1.5 }}>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                                        <Box><Typography variant="caption" color="text.secondary">From branch</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{branchName(data.from_branch_id)}</Typography></Box>
                                        <Box><Typography variant="caption" color="text.secondary">To branch</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{branchName(data.to_branch_id)}</Typography></Box>
                                        <Box><Typography variant="caption" color="text.secondary">Transfer date</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{formatDate(data.transfer_date)}</Typography></Box>
                                        <Box><Typography variant="caption" color="text.secondary">Items</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{data.items.length}</Typography></Box>
                                    </Box>
                                    {data.notes && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Notes: {data.notes}</Typography>}
                                </Paper>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small"><TableHead><TableRow><TableCell>Product</TableCell><TableCell>Batch</TableCell><TableCell>Expiry</TableCell><TableCell align="right">Quantity</TableCell></TableRow></TableHead>
                                        <TableBody>{data.items.map((item, index) => { const batch = batchById(item.product_id, item.inventory_batch_id); return <TableRow key={index}><TableCell>{productById(item.product_id)?.name || '-'}</TableCell><TableCell>{batch?.batch_number || '-'}</TableCell><TableCell>{formatDate(batch?.expiry_date)}</TableCell><TableCell align="right">{item.quantity}</TableCell></TableRow>; })}</TableBody>
                                    </Table>
                                </TableContainer>
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderTop: 1, borderColor: 'divider', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Step {activeStep + 1} of {steps.length}</Typography>
                    <Stack direction="row" spacing={1}>
                        {activeStep > 0 && <Button type="button" variant="outlined" onClick={() => { clearErrors(); setStepErrors([]); setActiveStep((step) => step - 1); }} disabled={processing}>Previous</Button>}
                        {activeStep < steps.length - 1
                            ? <Button type="button" variant="contained" onClick={goNext} disabled={processing}>Continue</Button>
                            : <Button type="submit" variant="contained" disabled={processing}>Confirm Transfer</Button>}
                    </Stack>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
