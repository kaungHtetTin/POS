import React, { useEffect, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import { Head, Link, useForm, usePage } from '@/spa';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    Grid,
    InputAdornment,
    MenuItem,
    Paper,
    Step,
    StepLabel,
    Stepper,
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
    ArrowBack as BackIcon,
    CheckCircle as ConfirmIcon,
    CompareArrows as TransferIcon,
    Delete as DeleteIcon,
    Inventory2 as ProductIcon,
    Search as SearchIcon,
    Store as BranchIcon,
} from '@mui/icons-material';

const emptyItem = {
    product_id: '',
    inventory_batch_id: '',
    quantity: 1,
};

export default function CreateStockTransfer({ auth, branches = [], products = [], categories = [] }) {
    const { ziggy = {} } = usePage().props;
    const [activeStep, setActiveStep] = useState(0);
    const [productQuery, setProductQuery] = useState('');
    const [appliedProductQuery, setAppliedProductQuery] = useState('');
    const [categoryId, setCategoryId] = useState('all');
    const [productPage, setProductPage] = useState(1);
    const [sourceBatches, setSourceBatches] = useState({});
    const productsPerPage = 8;

    const { data, setData, post, processing, errors } = useForm({
        from_branch_id: branches[0]?.id || '',
        to_branch_id: branches[1]?.id || '',
        transfer_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
    });

    const steps = ['Basic information', 'Select products', 'Batch and quantity', 'Review'];

    const branchName = (id) => branches.find((branch) => String(branch.id) === String(id))?.name || '-';
    const productById = (id) => products.find((product) => String(product.id) === String(id)) || null;
    const batchById = (productId, batchId) => (sourceBatches[productId] || []).find((batch) => String(batch.id) === String(batchId)) || null;
    const appBase = ziggy?.base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const storageUrl = (path) => withBase(`/storage/${String(path || '').replace(/^\/+/, '')}`);
    const getProductStock = (product) => (product?.inventories || [])
        .filter((inventory) => String(inventory.branch_id) === String(data.from_branch_id))
        .reduce((sum, inventory) => sum + Number(inventory.quantity || 0), 0);
    const productSearchText = (product) => [
        product?.name,
        product?.generic_name,
        product?.brand_name,
        product?.barcode,
        product?.category?.name,
    ].filter(Boolean).join(' ');
    const selectedProductIds = data.items.map((item) => String(item.product_id)).filter(Boolean);
    const selectedCatalogProducts = data.items
        .map((item) => productById(item.product_id))
        .filter(Boolean);
    const filteredAvailableProducts = products.filter((product) => {
        const query = appliedProductQuery.trim().toLowerCase();
        const matchesCategory = categoryId === 'all' || String(product.category_id) === String(categoryId);
        const matchesQuery = !query || productSearchText(product).toLowerCase().includes(query);

        return !selectedProductIds.includes(String(product.id)) && matchesCategory && matchesQuery;
    });
    const productPageCount = Math.max(1, Math.ceil(filteredAvailableProducts.length / productsPerPage));
    const safeProductPage = Math.min(productPage, productPageCount);
    const visibleCatalogProducts = [
        ...selectedCatalogProducts,
        ...filteredAvailableProducts.slice((safeProductPage - 1) * productsPerPage, safeProductPage * productsPerPage),
    ];

    const fetchBatches = async (productId, branchId) => {
        if (!productId || !branchId) return;

        try {
            const response = await fetch(route('inventory.batches.get', { product: productId, branch: branchId }));
            const batchData = await response.json();
            setSourceBatches((prev) => ({
                ...prev,
                [productId]: [...batchData].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)),
            }));
        } catch (error) {
            console.error('Error fetching batches:', error);
        }
    };

    useEffect(() => {
        data.items.forEach((item) => {
            if (item.product_id && data.from_branch_id) {
                fetchBatches(item.product_id, data.from_branch_id);
            }
        });
    }, [data.from_branch_id]);

    const updateBasic = (field, value) => {
        if (field === 'from_branch_id') {
            setSourceBatches({});
            setProductPage(1);
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
        if (!product?.id || selectedProductIds.includes(String(product.id))) {
            return;
        }

        setData('items', [
            ...data.items,
            {
                ...emptyItem,
                product_id: product.id,
            },
        ]);
        fetchBatches(product.id, data.from_branch_id);
    };

    const removeProduct = (productId) => {
        setData('items', data.items.filter((item) => String(item.product_id) !== String(productId)));
    };

    const updateItem = (index, field, value) => {
        const updatedItems = [...data.items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        if (field === 'product_id') {
            updatedItems[index].inventory_batch_id = '';
            fetchBatches(value, data.from_branch_id);
        }

        setData('items', updatedItems);
    };

    const stepReady = (step = activeStep) => {
        if (step === 0) {
            return data.from_branch_id && data.to_branch_id && data.transfer_date && String(data.from_branch_id) !== String(data.to_branch_id);
        }
        if (step === 1) {
            return data.items.length > 0 && data.items.every((item) => item.product_id);
        }
        if (step === 2) {
            return data.items.every((item) => item.product_id && item.inventory_batch_id && Number(item.quantity) > 0);
        }

        return stepReady(0) && stepReady(1) && stepReady(2);
    };

    const goNext = () => {
        if (!stepReady()) return;
        setActiveStep((step) => Math.min(step + 1, steps.length - 1));
    };

    const goBack = () => setActiveStep((step) => Math.max(step - 1, 0));

    const submit = (event) => {
        event.preventDefault();
        post(route('inventory.transfers.store'));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(dateString));
    };

    const renderStepContent = () => {
        if (activeStep === 0) {
            return (
                <Stack spacing={2}>
                    <Alert severity="info" icon={<BranchIcon fontSize="inherit" />}>
                        Select where the stock moves from and where it will be received.
                    </Alert>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            select
                            label="Source Branch"
                            fullWidth
                            size="small"
                            value={data.from_branch_id}
                            onChange={(event) => updateBasic('from_branch_id', event.target.value)}
                            error={!!errors.from_branch_id}
                            helperText={errors.from_branch_id}
                            required
                        >
                            {branches.map((branch) => (
                                <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                            ))}
                        </TextField>

                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                            <TransferIcon color="action" />
                        </Box>

                        <TextField
                            select
                            label="Destination Branch"
                            fullWidth
                            size="small"
                            value={data.to_branch_id}
                            onChange={(event) => updateBasic('to_branch_id', event.target.value)}
                            error={!!errors.to_branch_id || String(data.from_branch_id) === String(data.to_branch_id)}
                            helperText={errors.to_branch_id || (String(data.from_branch_id) === String(data.to_branch_id) ? 'Destination must be different from source.' : '')}
                            required
                        >
                            {branches.map((branch) => (
                                <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>

                    <TextField
                        label="Transfer Date"
                        type="date"
                        fullWidth
                        size="small"
                        value={data.transfer_date}
                        onChange={(event) => updateBasic('transfer_date', event.target.value)}
                        error={!!errors.transfer_date}
                        helperText={errors.transfer_date}
                        InputLabelProps={{ shrink: true }}
                        required
                    />

                    <TextField
                        label="Notes"
                        multiline
                        rows={2}
                        fullWidth
                        size="small"
                        value={data.notes}
                        onChange={(event) => updateBasic('notes', event.target.value)}
                        error={!!errors.notes}
                        helperText={errors.notes}
                    />
                </Stack>
            );
        }

        if (activeStep === 1) {
            return (
                <Stack spacing={2.5}>
                    <Alert severity="info" icon={<ProductIcon fontSize="inherit" />}>
                        Search and add every product to transfer. Batch and quantity are handled in the next step.
                    </Alert>

                    <ReportFilterToolbar
                        ariaLabel="Transfer product filters"
                        fieldKinds={['search', 'wide']}
                        actions={(
                            <Button type="button" variant="outlined" size="small" onClick={() => { setAppliedProductQuery(productQuery); setProductPage(1); }}>
                                Search
                            </Button>
                        )}
                    >
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search product, generic name, or barcode"
                            value={productQuery}
                            onChange={(event) => setProductQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    setAppliedProductQuery(productQuery);
                                    setProductPage(1);
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Category"
                            value={categoryId}
                            onChange={(event) => {
                                setCategoryId(event.target.value);
                                setProductPage(1);
                            }}
                            sx={{ minWidth: { md: 220 } }}
                        >
                            <MenuItem value="all">All categories</MenuItem>
                            {categories.map((category) => (
                                <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
                            ))}
                        </TextField>
                    </ReportFilterToolbar>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">Selected</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{data.items.length}</Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">Matching Products</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                {filteredAvailableProducts.length + selectedCatalogProducts.length}
                            </Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">Source Branch</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                                {branchName(data.from_branch_id)}
                            </Typography>
                        </Paper>
                    </Stack>

                    <Stack spacing={1.2}>
                        {visibleCatalogProducts.length === 0 ? (
                            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">No products match these filters.</Typography>
                            </Paper>
                        ) : visibleCatalogProducts.map((product) => {
                            const selected = selectedProductIds.includes(String(product.id));
                            const sourceStock = getProductStock(product);

                            return (
                                <Paper
                                    key={product.id}
                                    variant="outlined"
                                    sx={{
                                        p: 1.25,
                                        borderColor: selected ? 'primary.main' : 'divider',
                                        bgcolor: selected ? 'action.selected' : 'background.paper',
                                    }}
                                >
                                    <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={1.5}
                                        alignItems={{ xs: 'stretch', md: 'center' }}
                                        justifyContent="space-between"
                                    >
                                        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                            <Avatar
                                                src={product.image_path ? storageUrl(product.image_path) : null}
                                                variant="rounded"
                                                sx={{ width: 42, height: 42, flexShrink: 0, bgcolor: 'primary.light' }}
                                            >
                                                <ProductIcon fontSize="small" />
                                            </Avatar>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                                                    {product.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {product.generic_name || product.barcode || 'No barcode'}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 108px)' },
                                                gap: 1,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Category</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{product.category?.name || '-'}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Source Stock</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{sourceStock}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Barcode</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{product.barcode || '-'}</Typography>
                                            </Box>
                                        </Box>

                                        <Button
                                            type="button"
                                            variant={selected ? 'outlined' : 'contained'}
                                            color={selected ? 'error' : 'primary'}
                                            size="small"
                                            startIcon={selected ? <DeleteIcon /> : <AddIcon />}
                                            onClick={() => selected ? removeProduct(product.id) : addProduct(product)}
                                            sx={{ height: 36, minWidth: 112, whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', md: 'center' } }}
                                        >
                                            {selected ? 'Remove' : 'Add'}
                                        </Button>
                                    </Stack>
                                </Paper>
                            );
                        })}
                    </Stack>

                    {filteredAvailableProducts.length > productsPerPage && (
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
                            <Typography variant="caption" color="text.secondary">
                                Showing {Math.min(((safeProductPage - 1) * productsPerPage) + 1, filteredAvailableProducts.length)}-
                                {Math.min(safeProductPage * productsPerPage, filteredAvailableProducts.length)} of {filteredAvailableProducts.length}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Button
                                    type="button"
                                    size="small"
                                    variant="outlined"
                                    disabled={productPage <= 1}
                                    onClick={() => setProductPage((page) => Math.max(1, page - 1))}
                                >
                                    Prev
                                </Button>
                                <Button
                                    type="button"
                                    size="small"
                                    variant="outlined"
                                    disabled={productPage >= productPageCount}
                                    onClick={() => setProductPage((page) => Math.min(productPageCount, page + 1))}
                                >
                                    Next
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                </Stack>
            );
        }

        if (activeStep === 2) {
            return (
                <Stack spacing={2}>
                    <Alert severity="info">
                        Batches are ordered by earliest expiry date first. Choose the source batch and quantity for each product.
                    </Alert>
                    {data.items.map((item, index) => {
                        const product = productById(item.product_id);
                        const batches = sourceBatches[item.product_id] || [];
                        const selectedBatch = batchById(item.product_id, item.inventory_batch_id);

                        return (
                            <Paper key={`${item.product_id}-${index}`} variant="outlined" sx={{ p: 2 }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                                {product?.name || `Product ${index + 1}`}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {batches.length ? `${batches.length} available batch${batches.length === 1 ? '' : 'es'}` : 'No stock batches found at source branch'}
                                            </Typography>
                                        </Box>
                                        {selectedBatch && (
                                            <Chip size="small" label={`Expires ${formatDate(selectedBatch.expiry_date)}`} variant="outlined" />
                                        )}
                                    </Stack>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={8}>
                                            <TextField
                                                select
                                                label="Batch"
                                                fullWidth
                                                size="small"
                                                value={item.inventory_batch_id}
                                                onChange={(event) => updateItem(index, 'inventory_batch_id', event.target.value)}
                                                disabled={!item.product_id || batches.length === 0}
                                                error={!!errors[`items.${index}.inventory_batch_id`]}
                                                helperText={errors[`items.${index}.inventory_batch_id`] || 'Ordered by expiry date'}
                                                required
                                            >
                                                {batches.map((batch) => (
                                                    <MenuItem key={batch.id} value={batch.id}>
                                                        {batch.batch_number} - Exp {formatDate(batch.expiry_date)} - Qty {batch.quantity}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField
                                                label="Quantity"
                                                type="number"
                                                fullWidth
                                                size="small"
                                                value={item.quantity}
                                                onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                                                error={!!errors[`items.${index}.quantity`]}
                                                helperText={errors[`items.${index}.quantity`] || (selectedBatch ? `Available: ${selectedBatch.quantity}` : 'Select batch first')}
                                                required
                                                inputProps={{ min: 1, max: selectedBatch?.quantity || undefined }}
                                            />
                                        </Grid>
                                    </Grid>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            );
        }

        return (
            <Stack spacing={2}>
                <Alert severity="warning" icon={<ConfirmIcon fontSize="inherit" />}>
                    Review the transfer. Stock will move only after you click Confirm Transfer.
                </Alert>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <Typography variant="caption" color="text.secondary">From</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{branchName(data.from_branch_id)}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Typography variant="caption" color="text.secondary">To</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{branchName(data.to_branch_id)}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Typography variant="caption" color="text.secondary">Date</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatDate(data.transfer_date)}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Typography variant="caption" color="text.secondary">Items</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{data.items.length}</Typography>
                        </Grid>
                    </Grid>
                    {data.notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                            Notes: {data.notes}
                        </Typography>
                    )}
                </Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Product</TableCell>
                                <TableCell>Batch</TableCell>
                                <TableCell>Expiry Date</TableCell>
                                <TableCell align="right">Qty</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.items.map((item, index) => {
                                const batch = batchById(item.product_id, item.inventory_batch_id);

                                return (
                                    <TableRow key={index}>
                                        <TableCell>{productById(item.product_id)?.name || '-'}</TableCell>
                                        <TableCell>{batch?.batch_number || '-'}</TableCell>
                                        <TableCell>{formatDate(batch?.expiry_date)}</TableCell>
                                        <TableCell align="right">{item.quantity}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Stack>
        );
    };

    return (
        <MainLayout auth={auth} header="Stock Transfers">
            <Head title="Create Stock Transfer" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    spacing={1.5}
                    sx={{ mb: 2 }}
                >
                    <Box>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Stock transfer
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>
                            Create Transfer
                        </Typography>
                    </Box>
                    <Button component={Link} href={route('inventory.transfers.index')} variant="outlined" startIcon={<BackIcon />}>
                        Back to Transfers
                    </Button>
                </Stack>

                <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
                    <form onSubmit={submit}>
                        <Stack spacing={2.5}>
                            <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: 'none', md: 'flex' } }}>
                                {steps.map((label) => (
                                    <Step key={label}>
                                        <StepLabel>{label}</StepLabel>
                                    </Step>
                                ))}
                            </Stepper>
                            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                                <Typography variant="caption" color="text.secondary">
                                    Step {activeStep + 1} of {steps.length}
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                    {steps[activeStep]}
                                </Typography>
                            </Box>

                            <Divider />

                            {renderStepContent()}

                            <Divider />

                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                <Button component={Link} href={route('inventory.transfers.index')} variant="outlined">
                                    Cancel
                                </Button>
                                <Stack direction="row" spacing={1}>
                                    {activeStep > 0 && (
                                        <Button type="button" onClick={goBack} disabled={processing}>
                                            Back
                                        </Button>
                                    )}
                                    {activeStep < steps.length - 1 ? (
                                        <Button type="button" variant="contained" onClick={goNext} disabled={!stepReady()}>
                                            Next
                                        </Button>
                                    ) : (
                                        <Button type="submit" variant="contained" disabled={processing || !stepReady(3)}>
                                            Confirm Transfer
                                        </Button>
                                    )}
                                </Stack>
                            </Stack>
                        </Stack>
                    </form>
                </Paper>
            </Box>
        </MainLayout>
    );
}
