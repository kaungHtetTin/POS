import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import { Head, Link, router, useForm, usePage } from '@/spa';
import {
    Alert,
    Autocomplete,
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    Step,
    StepLabel,
    Stepper,
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
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon,
    Delete as DeleteIcon,
    Inventory as InventoryIcon,
    NavigateBefore as NavigateBeforeIcon,
    NavigateNext as NavigateNextIcon,
    ReceiptLong as PurchaseIcon,
    Search as SearchIcon,
    WarningAmber as WarningIcon,
} from '@mui/icons-material';

const steps = ['Basic Information', 'Select Product', 'Fill Quantity', 'Review & Confirm'];

const emptyItem = {
    product_id: '',
    unit_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: 1,
    foc_quantity: 0,
    unit_price: 0,
    selling_price: 0,
    wholesale_price: 0,
};

const dateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const todayInputValue = () => dateInputValue(new Date());

const addDaysToInputDate = (dateString, days) => {
    if (!dateString) {
        return '';
    }

    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);

    return dateInputValue(date);
};

export default function PurchaseCreate({ auth, suppliers, products, categories = [], branches }) {
    const { settings = {}, ziggy = {} } = usePage().props;
    const currencySymbol = settings.app?.currency_symbol || '$';
    const [activeStep, setActiveStep] = useState(0);
    const [productQuery, setProductQuery] = useState('');
    const [appliedProductQuery, setAppliedProductQuery] = useState('');
    const [categoryId, setCategoryId] = useState('all');
    const [productPage, setProductPage] = useState(1);
    const [stepErrors, setStepErrors] = useState([]);
    const productsPerPage = 8;
    const defaultPurchaseDate = todayInputValue();

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        supplier_id: '',
        branch_id: auth.user?.current_branch_id || auth.user?.branch_id || branches[0]?.id || '',
        invoice_number: '',
        purchase_date: defaultPurchaseDate,
        due_date: addDaysToInputDate(defaultPurchaseDate, 7),
        payment_status: 'Due',
        paid_amount: 0,
        items: [],
    });

    const money = (value) => `${currencySymbol}${Number(value || 0).toFixed(2)}`;
    const appBase = ziggy?.base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const storageUrl = (path) => withBase(`/storage/${String(path || '').replace(/^\/+/, '')}`);
    const getProductById = (productId) => products.find((product) => product.id === productId);
    const getUnitsForProduct = (productId) => getProductById(productId)?.product_units || [];
    const getPreferredUnit = (productId) => {
        const units = getUnitsForProduct(productId);
        return units.find((unit) => unit.is_base_unit) || units[0];
    };
    const getProductStock = (product) => (product?.inventories || [])
        .filter((inventory) => String(inventory.branch_id) === String(data.branch_id))
        .reduce((sum, inventory) => sum + Number(inventory.quantity || 0), 0);
    const selectedSupplier = useMemo(
        () => suppliers.find((supplier) => supplier.id === data.supplier_id),
        [suppliers, data.supplier_id]
    );

    const totalAmount = useMemo(
        () => data.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0),
        [data.items]
    );

    const paidAmount = useMemo(() => {
        if (data.payment_status === 'Paid') {
            return totalAmount;
        }
        if (data.payment_status === 'Due') {
            return 0;
        }
        return Number(data.paid_amount || 0);
    }, [data.payment_status, data.paid_amount, totalAmount]);

    const dueAmount = useMemo(() => Math.max(totalAmount - paidAmount, 0), [totalAmount, paidAmount]);

    const projectedBalance = useMemo(() => {
        if (!selectedSupplier) {
            return null;
        }

        return Number(selectedSupplier.balance || 0) + dueAmount;
    }, [selectedSupplier, dueAmount]);

    const exceedsCredit = selectedSupplier && projectedBalance > Number(selectedSupplier.credit_limit || 0);

    const serverErrorMessages = useMemo(
        () => Object.values(errors).flatMap((error) => Array.isArray(error) ? error : [error]).filter(Boolean),
        [errors]
    );

    const selectedProductIds = useMemo(
        () => data.items.map((item) => item.product_id),
        [data.items]
    );

    const selectedCatalogProducts = useMemo(
        () => data.items
            .map((item) => getProductById(item.product_id))
            .filter(Boolean),
        [data.items, products]
    );

    const filteredAvailableProducts = useMemo(() => {
        const normalizedQuery = appliedProductQuery.trim().toLowerCase();

        return products.filter((product) => {
            if (selectedProductIds.includes(product.id)) {
                return false;
            }

            const matchesCategory = categoryId === 'all' || String(product.category_id) === String(categoryId);
            const searchable = [
                product.name,
                product.generic_name,
                product.barcode,
                product.category?.name,
            ].filter(Boolean).join(' ').toLowerCase();
            const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

            return matchesCategory && matchesQuery;
        });
    }, [products, selectedProductIds, appliedProductQuery, categoryId]);

    const productPageCount = Math.max(1, Math.ceil(filteredAvailableProducts.length / productsPerPage));
    const visibleCatalogProducts = useMemo(() => {
        const safePage = Math.min(productPage, productPageCount);
        const pageStart = (safePage - 1) * productsPerPage;

        return [
            ...selectedCatalogProducts,
            ...filteredAvailableProducts.slice(pageStart, pageStart + productsPerPage),
        ];
    }, [selectedCatalogProducts, filteredAvailableProducts, productPage, productPageCount]);

    const updateItem = (index, field, value) => {
        const updatedItems = [...data.items];
        const currentItem = updatedItems[index];

        if (field === 'unit_id') {
            const selectedUnit = getUnitsForProduct(currentItem.product_id).find((unit) => unit.unit_id === value);

            updatedItems[index] = {
                ...currentItem,
                unit_id: value,
                selling_price: selectedUnit ? Number(selectedUnit.selling_price || 0) : currentItem.selling_price,
                wholesale_price: selectedUnit ? Number(selectedUnit.wholesale_price || selectedUnit.selling_price || 0) : currentItem.wholesale_price,
            };
        } else {
            updatedItems[index] = {
                ...currentItem,
                [field]: value,
            };
        }

        setData('items', updatedItems);
    };

    const addProduct = (product) => {
        if (!product?.id || data.items.some((item) => item.product_id === product.id)) {
            return;
        }

        const preferredUnit = getPreferredUnit(product.id);

        setData('items', [
            ...data.items,
            {
                ...emptyItem,
                product_id: product.id,
                unit_id: preferredUnit?.unit_id || '',
                selling_price: preferredUnit ? Number(preferredUnit.selling_price || 0) : 0,
                wholesale_price: preferredUnit ? Number(preferredUnit.wholesale_price || preferredUnit.selling_price || 0) : 0,
            },
        ]);
        setStepErrors([]);
    };

    const removeProduct = (productId) => {
        setData('items', data.items.filter((item) => item.product_id !== productId));
    };

    const removeItem = (index) => {
        setData('items', data.items.filter((_, itemIndex) => itemIndex !== index));
    };

    const getStepErrors = (step) => {
        const messages = [];

        if (step === 0) {
            if (!data.supplier_id) messages.push('Supplier is required.');
            if (!data.branch_id) messages.push('Branch is required.');
            if (!data.invoice_number) messages.push('Invoice number is required.');
            if (!data.purchase_date) messages.push('Purchase date is required.');
            if (!data.due_date) messages.push('Payment due date is required.');
            if (data.purchase_date && data.due_date && data.due_date < data.purchase_date) {
                messages.push('Payment due date cannot be before the purchase date.');
            }
            if (data.payment_status === 'Partial' && Number(data.paid_amount || 0) < 0) {
                messages.push('Paid amount cannot be negative.');
            }
        }

        if (step === 1) {
            if (data.items.length === 0) messages.push('Select at least one product.');
        }

        if (step === 2) {
            if (data.items.length === 0) messages.push('Select at least one product.');
            data.items.forEach((item, index) => {
                const label = getProductById(item.product_id)?.name || `Item ${index + 1}`;
                if (!item.unit_id) messages.push(`${label}: unit is required.`);
                if (!item.expiry_date) messages.push(`${label}: expiry date is required.`);
                if (Number(item.quantity || 0) < 1) messages.push(`${label}: quantity must be at least 1.`);
                if (Number(item.foc_quantity || 0) < 0) messages.push(`${label}: FOC quantity cannot be negative.`);
                if (Number(item.unit_price || 0) <= 0) messages.push(`${label}: unit cost is required.`);
                if (Number(item.selling_price || 0) <= 0) messages.push(`${label}: selling price is required.`);
                if (Number(item.wholesale_price || 0) <= 0) messages.push(`${label}: wholesale price is required.`);
            });
        }

        if (step === 3) {
            messages.push(...getStepErrors(0), ...getStepErrors(1), ...getStepErrors(2));
            if (data.payment_status === 'Partial' && Number(data.paid_amount || 0) > totalAmount) {
                messages.push('Paid amount cannot exceed total purchase amount.');
            }
            if (exceedsCredit) {
                messages.push('Projected supplier balance exceeds the credit limit.');
            }
        }

        return messages;
    };

    const goNext = () => {
        clearErrors();
        const messages = getStepErrors(activeStep);

        if (messages.length > 0) {
            setStepErrors(messages);
            return;
        }

        setStepErrors([]);
        setActiveStep((step) => Math.min(step + 1, steps.length - 1));
    };

    const goBack = () => {
        clearErrors();
        setStepErrors([]);
        setActiveStep((step) => Math.max(step - 1, 0));
    };

    const submit = () => {
        clearErrors();
        const messages = getStepErrors(3);

        if (messages.length > 0) {
            setStepErrors(messages);
            return;
        }

        post(route('purchases.store'), {
            preserveScroll: true,
            onSuccess: () => router.visit(route('purchases.index')),
            onError: () => setStepErrors([]),
        });
    };

    const renderStepErrors = () => (
        <>
            {stepErrors.length > 0 && (
                <Alert severity="error">
                    <Stack spacing={0.5}>
                        {stepErrors.map((message) => (
                            <Typography key={message} variant="body2">{message}</Typography>
                        ))}
                    </Stack>
                </Alert>
            )}
        </>
    );

    const renderBasicInformation = () => (
        <Stack spacing={2.5}>
            {renderStepErrors()}
            {errors.supplier_id && <Alert severity="error">{errors.supplier_id}</Alert>}
            {exceedsCredit && (
                <Alert severity="error" icon={<WarningIcon fontSize="inherit" />}>
                    Credit limit warning: projected balance ({money(projectedBalance)}) exceeds supplier credit limit ({money(selectedSupplier?.credit_limit)}).
                </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Autocomplete
                    options={suppliers}
                    value={selectedSupplier || null}
                    onChange={(_, supplier) => {
                        setData('supplier_id', supplier?.id || '');
                        setStepErrors([]);
                    }}
                    getOptionLabel={(supplier) => supplier?.name || ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={(props, supplier) => {
                        const { key, ...optionProps } = props;

                        return (
                            <Box component="li" {...optionProps} key={key}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {supplier.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Balance: {money(supplier.balance)} | Limit: {money(supplier.credit_limit)}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Supplier"
                            fullWidth
                            size="small"
                            error={!!errors.supplier_id}
                            helperText={errors.supplier_id || 'Search by supplier name'}
                            required
                        />
                    )}
                />
                <TextField
                    select
                    label="Branch"
                    fullWidth
                    size="small"
                    value={data.branch_id}
                    onChange={(event) => {
                        setData({ ...data, branch_id: event.target.value, items: [] });
                        setProductPage(1);
                    }}
                    error={!!errors.branch_id}
                    helperText={errors.branch_id}
                    required
                >
                    {branches.map((branch) => (
                        <MenuItem key={branch.id} value={branch.id}>
                            {branch.name}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label="Invoice Number"
                    fullWidth
                    size="small"
                    value={data.invoice_number}
                    onChange={(event) => {
                        setData('invoice_number', event.target.value);
                        setStepErrors([]);
                    }}
                    error={!!errors.invoice_number}
                    helperText={errors.invoice_number}
                    required
                />
                <TextField
                    label="Purchase Date"
                    type="date"
                    fullWidth
                    size="small"
                    value={data.purchase_date}
                    onChange={(event) => {
                        const purchaseDate = event.target.value;
                        setData({
                            ...data,
                            purchase_date: purchaseDate,
                            due_date: addDaysToInputDate(purchaseDate, 7),
                        });
                    }}
                    error={!!errors.purchase_date}
                    helperText={errors.purchase_date}
                    InputLabelProps={{ shrink: true }}
                    required
                />
                <TextField
                    label="Payment Due Date"
                    type="date"
                    fullWidth
                    size="small"
                    value={data.due_date}
                    onChange={(event) => setData('due_date', event.target.value)}
                    error={!!errors.due_date}
                    helperText={errors.due_date || 'Defaults to 7 days after purchase date'}
                    InputLabelProps={{ shrink: true }}
                    required
                />
                <TextField
                    select
                    label="Payment Status"
                    fullWidth
                    size="small"
                    value={data.payment_status}
                    onChange={(event) => setData('payment_status', event.target.value)}
                    error={!!errors.payment_status}
                    helperText={errors.payment_status}
                >
                    <MenuItem value="Paid">Paid</MenuItem>
                    <MenuItem value="Partial">Partial</MenuItem>
                    <MenuItem value="Due">Due</MenuItem>
                </TextField>
                <TextField
                    label="Paid Amount"
                    type="number"
                    fullWidth
                    size="small"
                    value={data.payment_status === 'Paid' ? totalAmount : data.payment_status === 'Due' ? 0 : data.paid_amount}
                    onChange={(event) => setData('paid_amount', event.target.value)}
                    disabled={data.payment_status !== 'Partial'}
                    error={!!errors.paid_amount}
                    helperText={errors.paid_amount}
                    inputProps={{ min: 0, step: '0.01' }}
                />
            </Box>

            {selectedSupplier && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">Current Balance</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{money(selectedSupplier.balance)}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">Credit Limit</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{money(selectedSupplier.credit_limit)}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">Projected Balance</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: exceedsCredit ? 'error.main' : 'success.main' }}>
                            {money(projectedBalance)}
                        </Typography>
                    </Paper>
                </Box>
            )}
        </Stack>
    );

    const renderProductSelection = () => (
        <Stack spacing={2.5}>
            {renderStepErrors()}
            <ReportFilterToolbar
                ariaLabel="Purchase product filters"
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
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{filteredAvailableProducts.length + selectedCatalogProducts.length}</Typography>
                </Paper>
            </Stack>

            <Stack spacing={1.2}>
                {visibleCatalogProducts.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">No products match these filters.</Typography>
                    </Paper>
                ) : visibleCatalogProducts.map((product) => {
                    const selected = selectedProductIds.includes(product.id);
                    const preferredUnit = getPreferredUnit(product.id);
                    const unitName = preferredUnit?.unit?.short_name || preferredUnit?.unit?.name || '-';
                    const branchStock = getProductStock(product);

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
                                        <InventoryIcon fontSize="small" />
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
                                        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 96px)' },
                                        gap: 1,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Category</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{product.category?.name || '-'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Stock</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{branchStock}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Unit</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{unitName}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Retail</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{money(preferredUnit?.selling_price)}</Typography>
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
                        Showing {Math.min(((Math.min(productPage, productPageCount) - 1) * productsPerPage) + 1, filteredAvailableProducts.length)}-
                        {Math.min(Math.min(productPage, productPageCount) * productsPerPage, filteredAvailableProducts.length)} of {filteredAvailableProducts.length}
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

    const renderQuantityEntry = () => (
        <Stack spacing={2}>
            {renderStepErrors()}
            {(errors.items || typeof errors.items === 'string') && <Alert severity="error">{errors.items}</Alert>}

            {data.items.map((item, index) => {
                const product = getProductById(item.product_id);
                const unitsForProduct = getUnitsForProduct(item.product_id);
                const selectedUnit = unitsForProduct.find((unit) => unit.unit_id === item.unit_id);
                const conversionFactor = Number(selectedUnit?.conversion_factor || 1);
                const paidQuantity = Number(item.quantity || 0);
                const focQuantity = Number(item.foc_quantity || 0);
                const receivedQuantity = paidQuantity + focQuantity;
                const baseQuantity = receivedQuantity * conversionFactor;
                const lineTotal = paidQuantity * Number(item.unit_price || 0);

                return (
                    <Paper key={item.product_id} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product?.name || `Item ${index + 1}`}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Line Total: {money(lineTotal)} | Received: {receivedQuantity} | Base Qty: {baseQuantity}
                                </Typography>
                            </Box>
                            <IconButton size="small" color="error" onClick={() => removeItem(index)} title="Remove product">
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr 0.8fr 1fr 1fr 1fr' },
                                gap: 1.2,
                                mb: 1.2,
                            }}
                        >
                            <TextField
                                select
                                size="small"
                                label="Unit"
                                value={item.unit_id}
                                onChange={(event) => updateItem(index, 'unit_id', event.target.value)}
                                error={!!errors[`items.${index}.unit_id`]}
                                helperText={errors[`items.${index}.unit_id`]}
                                required
                            >
                                {unitsForProduct.map((productUnit) => (
                                    <MenuItem key={productUnit.id} value={productUnit.unit_id}>
                                        {productUnit.unit?.short_name || productUnit.unit?.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size="small"
                                label="Qty"
                                type="number"
                                value={item.quantity}
                                onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                                error={!!errors[`items.${index}.quantity`]}
                                helperText={errors[`items.${index}.quantity`]}
                                inputProps={{ min: 1 }}
                                required
                            />
                            <TextField
                                size="small"
                                label="FOC Qty"
                                type="number"
                                value={item.foc_quantity}
                                onChange={(event) => updateItem(index, 'foc_quantity', event.target.value)}
                                error={!!errors[`items.${index}.foc_quantity`]}
                                helperText={errors[`items.${index}.foc_quantity`]}
                                inputProps={{ min: 0 }}
                            />
                            <TextField
                                size="small"
                                label="Unit Cost"
                                type="number"
                                value={item.unit_price}
                                onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                                error={!!errors[`items.${index}.unit_price`]}
                                helperText={errors[`items.${index}.unit_price`]}
                                inputProps={{ min: 0.01, step: '0.01' }}
                                required
                            />
                            <TextField
                                size="small"
                                label="Selling Price"
                                type="number"
                                value={item.selling_price}
                                onChange={(event) => updateItem(index, 'selling_price', event.target.value)}
                                error={!!errors[`items.${index}.selling_price`]}
                                helperText={errors[`items.${index}.selling_price`]}
                                inputProps={{ min: 0.01, step: '0.01' }}
                                required
                            />
                            <TextField
                                size="small"
                                label="Wholesale Price"
                                type="number"
                                value={item.wholesale_price}
                                onChange={(event) => updateItem(index, 'wholesale_price', event.target.value)}
                                error={!!errors[`items.${index}.wholesale_price`]}
                                helperText={errors[`items.${index}.wholesale_price`]}
                                inputProps={{ min: 0.01, step: '0.01' }}
                                required
                            />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.2 }}>
                            <TextField
                                size="small"
                                label="Batch Number"
                                value={item.batch_number}
                                onChange={(event) => updateItem(index, 'batch_number', event.target.value)}
                                error={!!errors[`items.${index}.batch_number`]}
                                helperText={errors[`items.${index}.batch_number`] || 'Optional'}
                            />
                            <TextField
                                size="small"
                                label="Expiry Date"
                                type="date"
                                value={item.expiry_date}
                                onChange={(event) => updateItem(index, 'expiry_date', event.target.value)}
                                error={!!errors[`items.${index}.expiry_date`]}
                                helperText={errors[`items.${index}.expiry_date`]}
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Box>
                    </Paper>
                );
            })}
        </Stack>
    );

    const renderReview = () => (
        <Stack spacing={2.5}>
            {renderStepErrors()}
            {serverErrorMessages.length > 0 && (
                <Alert severity="error">
                    <Stack spacing={0.5}>
                        {serverErrorMessages.map((message) => (
                            <Typography key={message} variant="body2">{message}</Typography>
                        ))}
                    </Stack>
                </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 1.5 }}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Supplier</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{selectedSupplier?.name || '-'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Invoice</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{data.invoice_number || '-'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Payment Due Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{data.due_date || '-'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Total</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{money(totalAmount)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Due</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{money(dueAmount)}</Typography>
                </Paper>
            </Box>

            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.05)' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Batch / Expiry</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Qty</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">FOC</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Cost</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Retail</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Wholesale</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Line Total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.items.map((item) => {
                            const product = getProductById(item.product_id);
                            const selectedUnit = getUnitsForProduct(item.product_id).find((unit) => unit.unit_id === item.unit_id);

                            return (
                                <TableRow key={item.product_id} hover>
                                    <TableCell>{product?.name || '-'}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{item.batch_number || 'Auto generated'}</Typography>
                                        <Typography variant="caption" color="text.secondary">{item.expiry_date || '-'}</Typography>
                                    </TableCell>
                                    <TableCell align="center">{selectedUnit?.unit?.short_name || selectedUnit?.unit?.name || '-'}</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                    <TableCell align="right">{item.foc_quantity || 0}</TableCell>
                                    <TableCell align="right">{money(item.unit_price)}</TableCell>
                                    <TableCell align="right">{money(item.selling_price)}</TableCell>
                                    <TableCell align="right">{money(item.wholesale_price)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        {money(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Stack alignItems="flex-end">
                <Box sx={{ width: { xs: '100%', sm: 320 } }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                        <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{money(totalAmount)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                        <Typography variant="body2" color="text.secondary">Paid Amount</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{money(paidAmount)}</Typography>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Due Amount</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{money(dueAmount)}</Typography>
                    </Stack>
                </Box>
            </Stack>
        </Stack>
    );

    return (
        <MainLayout auth={auth} header="Create Purchase">
            <Head title="Create Purchase" />

            <Box sx={{ flexGrow: 1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                    <Button
                        component={Link}
                        href={route('purchases.index')}
                        variant="outlined"
                        size="small"
                        startIcon={<ArrowBackIcon />}
                        sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                    >
                        Back
                    </Button>
                    <Chip icon={<PurchaseIcon />} label="New Purchase Wizard" variant="outlined" sx={{ height: 36 }} />
                </Stack>

                <Paper sx={{ p: { xs: 2, md: 3 } }}>
                    <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    <Divider sx={{ mb: 2.5 }} />

                    {activeStep === 0 && renderBasicInformation()}
                    {activeStep === 1 && renderProductSelection()}
                    {activeStep === 2 && renderQuantityEntry()}
                    {activeStep === 3 && renderReview()}

                    <Divider sx={{ my: 2.5 }} />

                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                        <Button
                            type="button"
                            variant="outlined"
                            size="small"
                            startIcon={<NavigateBeforeIcon />}
                            onClick={goBack}
                            disabled={activeStep === 0 || processing}
                            sx={{ height: 40, minWidth: 120 }}
                        >
                            Previous
                        </Button>

                        {activeStep < steps.length - 1 ? (
                            <Button
                                type="button"
                                variant="contained"
                                size="small"
                                endIcon={<NavigateNextIcon />}
                                onClick={goNext}
                                disabled={processing}
                                sx={{ height: 40, minWidth: 120 }}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="contained"
                                size="small"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={submit}
                                disabled={processing}
                                sx={{ height: 40, minWidth: 198 }}
                            >
                                Confirm & Receive Stock
                            </Button>
                        )}
                    </Stack>
                </Paper>
            </Box>
        </MainLayout>
    );
}
