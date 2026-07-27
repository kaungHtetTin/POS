import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
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
    Add as AddIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Inventory as InventoryIcon,
    Payment as PaymentIcon,
    ReceiptLong as PurchaseIcon,
    Search as SearchIcon,
    Visibility as VisibilityIcon,
    WarningAmber as WarningIcon,
} from '@mui/icons-material';

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

export default function PurchaseIndex({ auth, purchases, suppliers, products, branches, filters }) {
    const [open, setOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentPurchase, setPaymentPurchase] = useState(null);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [search, setSearch] = useState(filters?.search || '');
    const defaultPurchaseDate = todayInputValue();

    const { data, setData, post, patch, delete: destroy, processing, errors, reset } = useForm({
        supplier_id: '',
        branch_id: auth.user?.current_branch_id || auth.user?.branch_id || branches[0]?.id || '',
        invoice_number: '',
        purchase_date: defaultPurchaseDate,
        due_date: addDaysToInputDate(defaultPurchaseDate, 7),
        payment_status: 'Due',
        paid_amount: 0,
        items: [{ ...emptyItem }],
    });

    const {
        data: paymentData,
        setData: setPaymentData,
        post: postPayment,
        processing: paymentProcessing,
        errors: paymentErrors,
        reset: resetPayment,
    } = useForm({
        supplier_id: '',
        purchase_id: '',
        branch_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'Cash',
        reference_number: '',
        notes: '',
    });

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
        const existingDueForSelectedSupplier = editingPurchase?.supplier_id === selectedSupplier.id
            ? Number(editingPurchase?.due_amount || 0)
            : 0;

        return Number(selectedSupplier.balance || 0) - existingDueForSelectedSupplier + dueAmount;
    }, [selectedSupplier, dueAmount, editingPurchase]);

    const exceedsCredit = selectedSupplier && projectedBalance > Number(selectedSupplier.credit_limit || 0);

    const formatPurchaseDate = (value) => {
        if (!value) {
            return '-';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const getProductById = (productId) => products.find((product) => product.id === productId);

    const getUnitsForProduct = (productId) => {
        const product = getProductById(productId);
        return product?.product_units || [];
    };

    const ensureOptionValue = (value, options) => {
        const normalized = value ?? '';
        return options.some((option) => option === normalized) ? normalized : '';
    };

    const handleOpen = (purchase = null) => {
        if (purchase) {
            setEditingPurchase(purchase);
            const supplierId = ensureOptionValue(
                purchase?.supplier_id ?? '',
                suppliers.map((supplier) => supplier.id)
            );
            const branchId = ensureOptionValue(
                purchase?.branch_id ?? '',
                branches.map((branch) => branch.id)
            );
            const paymentStatus = ensureOptionValue(
                purchase?.payment_status ?? '',
                ['Paid', 'Partial', 'Due']
            ) || 'Due';
            const purchaseDate = purchase.purchase_date?.split('T')[0] || '';

            setData({
                supplier_id: supplierId,
                branch_id: branchId,
                invoice_number: purchase?.invoice_number || '',
                purchase_date: purchaseDate,
                due_date: purchase.due_date?.split('T')[0] || addDaysToInputDate(purchaseDate, 7),
                payment_status: paymentStatus,
                paid_amount: Number(purchase?.paid_amount || 0),
                items: (purchase.items || []).map(item => {
                    const productId = item?.product_id ?? '';
                    const unitsForProduct = getUnitsForProduct(productId);
                    const hasSelectedUnit = unitsForProduct.some((u) => u.unit_id === item?.unit_id);
                    const fallbackUnit = unitsForProduct.find((u) => u.is_base_unit) || unitsForProduct[0];
                    const selectedUnitId = hasSelectedUnit ? (item?.unit_id ?? '') : (fallbackUnit?.unit_id || '');

                    return ({
                    product_id: productId,
                    unit_id: selectedUnitId,
                    batch_number: item?.batch_number || '',
                    expiry_date: item.expiry_date?.split('T')[0] || '',
                    quantity: Number(item?.quantity || 1),
                    foc_quantity: Number(item?.foc_quantity || 0),
                    unit_price: Number(item?.unit_price || 0),
                    // Try to find the matching selling_price from product units
                    selling_price: Number(
                        products.find(p => p.id === productId)?.product_units?.find(u => u.unit_id === selectedUnitId)?.selling_price
                        || item?.unit_price
                        || 0
                    ),
                    wholesale_price: Number(
                        products.find(p => p.id === productId)?.product_units?.find(u => u.unit_id === selectedUnitId)?.wholesale_price
                        || products.find(p => p.id === productId)?.product_units?.find(u => u.unit_id === selectedUnitId)?.selling_price
                        || item?.unit_price
                        || 0
                    ),
                });
                }),
            });
        } else {
            setEditingPurchase(null);
            reset();
            const purchaseDate = todayInputValue();
            setData({
                supplier_id: '',
                branch_id: auth.user?.branch_id || branches[0]?.id || '',
                invoice_number: '',
                purchase_date: purchaseDate,
                due_date: addDaysToInputDate(purchaseDate, 7),
                payment_status: 'Due',
                paid_amount: 0,
                items: [{ ...emptyItem }],
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingPurchase(null);
        reset();
    };

    const handlePaymentOpen = (purchase) => {
        setPaymentPurchase(purchase);
        resetPayment();
        setPaymentData({
            supplier_id: purchase.supplier_id,
            purchase_id: purchase.id,
            branch_id: purchase.branch_id || auth.user?.current_branch_id || auth.user?.branch_id || '',
            payment_date: new Date().toISOString().split('T')[0],
            amount: Number(purchase.due_amount || 0).toFixed(2),
            payment_method: 'Cash',
            reference_number: '',
            notes: '',
        });
        setPaymentOpen(true);
    };

    const handlePaymentClose = () => {
        setPaymentOpen(false);
        setPaymentPurchase(null);
        resetPayment();
    };

    const submitPayment = (event) => {
        event.preventDefault();
        postPayment(route('supplier-payments.store'), {
            preserveScroll: true,
            onSuccess: () => handlePaymentClose(),
        });
    };

    const handleDelete = (purchase) => {
        if (confirm('Are you sure you want to delete this purchase? This will reverse the stock increase.')) {
            destroy(route('purchases.destroy', { purchase: purchase?.id }), {
                preserveScroll: true,
            });
        }
    };

    const handleSearch = () => {
        router.get(route('purchases.index'), { search }, { preserveState: true, replace: true });
    };

    const addItem = () => {
        setData('items', [...data.items, { ...emptyItem }]);
    };

    const removeItem = (index) => {
        if (data.items.length === 1) {
            return;
        }
        setData('items', data.items.filter((_, itemIndex) => itemIndex !== index));
    };

    const updateItem = (index, field, value) => {
        const updatedItems = [...data.items];
        const currentItem = updatedItems[index];

        if (field === 'product_id') {
            const units = getUnitsForProduct(value);
            const preferredUnit = units.find((unit) => unit.is_base_unit) || units[0];

            updatedItems[index] = {
                ...currentItem,
                product_id: value,
                unit_id: preferredUnit?.unit_id || '',
                selling_price: preferredUnit ? Number(preferredUnit.selling_price || 0) : 0,
                wholesale_price: preferredUnit ? Number(preferredUnit.wholesale_price || preferredUnit.selling_price || 0) : 0,
            };

            setData('items', updatedItems);
            return;
        }

        if (field === 'unit_id') {
            const units = getUnitsForProduct(currentItem.product_id);
            const selectedUnit = units.find((unit) => unit.unit_id === value);

            updatedItems[index] = {
                ...currentItem,
                unit_id: value,
                selling_price: selectedUnit ? Number(selectedUnit.selling_price || 0) : currentItem.selling_price,
                wholesale_price: selectedUnit ? Number(selectedUnit.wholesale_price || selectedUnit.selling_price || 0) : currentItem.wholesale_price,
            };

            setData('items', updatedItems);
            return;
        }

        updatedItems[index] = {
            ...currentItem,
            [field]: value,
        };
        setData('items', updatedItems);
    };

    const submit = (event) => {
        event.preventDefault();
        if (editingPurchase) {
            const purchaseId = editingPurchase?.id || editingPurchase?.purchase_id || '';
            if (!purchaseId) {
                return;
            }

            patch(route('purchases.update', { purchase: purchaseId }), {
                preserveScroll: true,
                onSuccess: () => handleClose(),
            });
        } else {
            post(route('purchases.store'), {
                preserveScroll: true,
                onSuccess: () => handleClose(),
            });
        }
    };

    return (
        <MainLayout auth={auth} header="Purchase Workflow">
            <Head title="Purchases" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            PURCHASE ORDERS & STOCK RECEIPTS
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                size="small"
                                placeholder="Search invoice or supplier..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ minWidth: { sm: 250 } }}
                            />
                            <Button variant="outlined" size="small" onClick={handleSearch}>Search</Button>
                            <Button
                                component={Link}
                                href={route('purchases.create')}
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                sx={{
                                    height: 40,
                                    minWidth: 164,
                                    px: 2,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                Create Purchase
                            </Button>
                        </Stack>
                    </Stack>

                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Invoice</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Supplier & Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Date</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Due Date</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Items</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Paid</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Due</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {purchases.map((purchase) => (
                                    <TableRow key={purchase.id} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <PurchaseIcon fontSize="small" color="primary" />
                                                <Typography
                                                    component={Link}
                                                    href={route('purchases.show', { purchase: purchase.id })}
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 500,
                                                        color: 'primary.main',
                                                        textDecoration: 'none',
                                                        '&:hover': { textDecoration: 'underline' },
                                                    }}
                                                >
                                                    {purchase.invoice_number}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{purchase.supplier?.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{purchase.branch?.name}</Typography>
                                        </TableCell>
                                        <TableCell align="center">{formatPurchaseDate(purchase.purchase_date)}</TableCell>
                                        <TableCell align="center">{formatPurchaseDate(purchase.due_date)}</TableCell>
                                        <TableCell align="center">{purchase.items_count}</TableCell>
                                        <TableCell align="right">${Number(purchase.total_amount || 0).toFixed(2)}</TableCell>
                                        <TableCell align="right">${Number(purchase.paid_amount || 0).toFixed(2)}</TableCell>
                                        <TableCell align="right">${Number(purchase.due_amount || 0).toFixed(2)}</TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                size="small"
                                                label={purchase.payment_status}
                                                color={purchase.payment_status === 'Paid' ? 'success' : purchase.payment_status === 'Partial' ? 'warning' : 'error'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <IconButton
                                                    component={Link}
                                                    href={route('purchases.show', { purchase: purchase.id })}
                                                    size="small"
                                                    color="info"
                                                    title="View Invoice"
                                                >
                                                    <VisibilityIcon fontSize="inherit" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handlePaymentOpen(purchase)}
                                                    disabled={Number(purchase.due_amount || 0) <= 0}
                                                    title="Record Payment"
                                                >
                                                    <PaymentIcon fontSize="inherit" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleOpen(purchase)}
                                                    disabled={Number(purchase.payments_count || 0) > 0}
                                                    title="Edit Purchase"
                                                >
                                                    <EditIcon fontSize="inherit" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(purchase)}
                                                    disabled={Number(purchase.payments_count || 0) > 0}
                                                    title="Delete Purchase"
                                                >
                                                    <DeleteIcon fontSize="inherit" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {purchases.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No purchases found. Create a purchase order to receive stock.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editingPurchase ? 'Edit Purchase Order' : 'Create Purchase Order & Receive Stock'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            {exceedsCredit && (
                                <Alert severity="error" icon={<WarningIcon fontSize="inherit" />}>
                                    Credit limit warning: projected balance (${Number(projectedBalance || 0).toFixed(2)}) exceeds supplier credit limit (${Number(selectedSupplier?.credit_limit || 0).toFixed(2)}).
                                </Alert>
                            )}

                            {editingPurchase && (
                                <Alert severity="warning" sx={{ mb: 1 }}>
                                    Warning: Editing this purchase will temporarily reverse previous stock increases and supplier balance changes before applying new values.
                                </Alert>
                            )}

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    select
                                    label="Supplier"
                                    fullWidth
                                    size="small"
                                    value={data.supplier_id}
                                    onChange={(event) => setData('supplier_id', event.target.value)}
                                    error={!!errors.supplier_id}
                                    helperText={errors.supplier_id}
                                    required
                                >
                                    {suppliers.map((supplier) => (
                                        <MenuItem key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    select
                                    label="Branch"
                                    fullWidth
                                    size="small"
                                    value={data.branch_id}
                                    onChange={(event) => setData('branch_id', event.target.value)}
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
                            </Stack>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    label="Invoice Number"
                                    fullWidth
                                    size="small"
                                    value={data.invoice_number}
                                    onChange={(event) => setData('invoice_number', event.target.value)}
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
                            </Stack>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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
                            </Stack>

                            {selectedSupplier && (
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                    <Alert severity="info" sx={{ flex: 1 }}>
                                        Current Balance: ${Number(selectedSupplier.balance || 0).toFixed(2)}
                                    </Alert>
                                    <Alert severity="info" sx={{ flex: 1 }}>
                                        Credit Limit: ${Number(selectedSupplier.credit_limit || 0).toFixed(2)}
                                    </Alert>
                                    <Alert severity={exceedsCredit ? 'error' : 'success'} sx={{ flex: 1 }}>
                                        Projected Balance: ${Number(projectedBalance || 0).toFixed(2)}
                                    </Alert>
                                </Stack>
                            )}

                            <Divider />

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Purchase Items
                                </Typography>
                                <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={addItem}>
                                    Add Item
                                </Button>
                            </Stack>

                            <Stack spacing={1.5}>
                                {data.items.map((item, index) => {
                                    const unitsForProduct = getUnitsForProduct(item.product_id);
                                    const selectedUnit = unitsForProduct.find((unit) => unit.unit_id === item.unit_id);
                                    const conversionFactor = Number(selectedUnit?.conversion_factor || 1);
                                    const paidQuantity = Number(item.quantity || 0);
                                    const focQuantity = Number(item.foc_quantity || 0);
                                    const receivedQuantity = paidQuantity + focQuantity;
                                    const baseQuantity = receivedQuantity * conversionFactor;
                                    const lineTotal = (Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2);

                                    return (
                                        <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                                    Item #{index + 1}
                                                </Typography>
                                                <IconButton color="error" size="small" onClick={() => removeItem(index)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>

                                            <Box
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 0.7fr 0.7fr 0.9fr 0.9fr 0.9fr' },
                                                    gap: 1.2,
                                                    mb: 1.2,
                                                }}
                                            >
                                                <TextField
                                                    select
                                                    size="small"
                                                    label="Product"
                                                    value={item.product_id}
                                                    onChange={(event) => updateItem(index, 'product_id', event.target.value)}
                                                    required
                                                    sx={{ minWidth: 220 }}
                                                >
                                                    {products.map((product) => (
                                                        <MenuItem key={product.id} value={product.id}>
                                                            {product.name}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                                <TextField
                                                    select
                                                    size="small"
                                                    label="Unit"
                                                    value={item.unit_id}
                                                    onChange={(event) => updateItem(index, 'unit_id', event.target.value)}
                                                    required
                                                    disabled={!item.product_id}
                                                    sx={{ minWidth: 120 }}
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
                                                    inputProps={{ min: 1 }}
                                                    required
                                                />
                                                <TextField
                                                    size="small"
                                                    label="FOC Qty"
                                                    type="number"
                                                    value={item.foc_quantity}
                                                    onChange={(event) => updateItem(index, 'foc_quantity', event.target.value)}
                                                    inputProps={{ min: 0 }}
                                                />
                                                <TextField
                                                    size="small"
                                                    label="Unit Cost"
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                                                    inputProps={{ min: 0.01, step: '0.01' }}
                                                    required
                                                />
                                                <TextField
                                                    size="small"
                                                    label="Selling Price"
                                                    type="number"
                                                    value={item.selling_price}
                                                    onChange={(event) => updateItem(index, 'selling_price', event.target.value)}
                                                    inputProps={{ min: 0.01, step: '0.01' }}
                                                    required
                                                />
                                                <TextField
                                                    size="small"
                                                    label="Wholesale Price"
                                                    type="number"
                                                    value={item.wholesale_price}
                                                    onChange={(event) => updateItem(index, 'wholesale_price', event.target.value)}
                                                    inputProps={{ min: 0.01, step: '0.01' }}
                                                    required
                                                />
                                            </Box>

                                            <Box
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr auto' },
                                                    gap: 1.2,
                                                    alignItems: 'start',
                                                }}
                                            >
                                                <TextField
                                                    size="small"
                                                    label="Batch Number"
                                                    value={item.batch_number}
                                                    onChange={(event) => updateItem(index, 'batch_number', event.target.value)}
                                                    placeholder="Optional (auto-generate if empty)"
                                                    sx={{ minWidth: 180 }}
                                                />
                                                <TextField
                                                    size="small"
                                                    label="Expiry Date"
                                                    type="date"
                                                    value={item.expiry_date}
                                                    onChange={(event) => updateItem(index, 'expiry_date', event.target.value)}
                                                    InputLabelProps={{ shrink: true }}
                                                    required
                                                    sx={{ minWidth: 150 }}
                                                />
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1,
                                                        minWidth: { md: 170 },
                                                        bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.03)',
                                                    }}
                                                >
                                                    <Typography variant="caption" color="text.secondary">Line Total</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>${lineTotal}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Received: {receivedQuantity} | Base Qty: {baseQuantity}
                                                    </Typography>
                                                </Paper>
                                            </Box>

                                            {errors[`items.${index}.product_id`] && (
                                                <Typography variant="caption" color="error">{errors[`items.${index}.product_id`]}</Typography>
                                            )}
                                            {errors[`items.${index}.unit_id`] && (
                                                <Typography variant="caption" color="error">{errors[`items.${index}.unit_id`]}</Typography>
                                            )}
                                            {errors[`items.${index}.foc_quantity`] && (
                                                <Typography variant="caption" color="error">{errors[`items.${index}.foc_quantity`]}</Typography>
                                            )}
                                            {errors[`items.${index}.wholesale_price`] && (
                                                <Typography variant="caption" color="error">{errors[`items.${index}.wholesale_price`]}</Typography>
                                            )}
                                        </Paper>
                                    );
                                })}
                            </Stack>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <InventoryIcon fontSize="small" color="primary" />
                                        <Typography variant="body2">Total Amount: ${totalAmount.toFixed(2)}</Typography>
                                    </Stack>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                                    <Typography variant="body2">Due Amount: ${dueAmount.toFixed(2)}</Typography>
                                </Paper>
                            </Stack>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} size="small">Cancel</Button>
                        <Button type="submit" variant="contained" size="small" disabled={processing}>
                            {editingPurchase ? 'Update Purchase' : 'Save Purchase & Receive Stock'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Dialog open={paymentOpen} onClose={handlePaymentClose} maxWidth="sm" fullWidth>
                <form onSubmit={submitPayment}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Record Purchase Payment
                        <IconButton size="small" onClick={handlePaymentClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Paper variant="outlined" sx={{ p: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {paymentPurchase?.invoice_number || '-'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Supplier: {paymentPurchase?.supplier?.name || '-'} | Due: ${Number(paymentPurchase?.due_amount || 0).toFixed(2)}
                                </Typography>
                            </Paper>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Payment Date"
                                    type="date"
                                    fullWidth
                                    size="small"
                                    value={paymentData.payment_date}
                                    onChange={(event) => setPaymentData('payment_date', event.target.value)}
                                    error={!!paymentErrors.payment_date}
                                    helperText={paymentErrors.payment_date}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                />
                                <TextField
                                    select
                                    label="Method"
                                    fullWidth
                                    size="small"
                                    value={paymentData.payment_method}
                                    onChange={(event) => setPaymentData('payment_method', event.target.value)}
                                    error={!!paymentErrors.payment_method}
                                    helperText={paymentErrors.payment_method}
                                    required
                                >
                                    <MenuItem value="Cash">Cash</MenuItem>
                                    <MenuItem value="Card">Card</MenuItem>
                                    <MenuItem value="Mobile">Mobile</MenuItem>
                                    <MenuItem value="Wallet">Wallet</MenuItem>
                                </TextField>
                            </Stack>
                            <TextField
                                label="Amount"
                                type="number"
                                fullWidth
                                size="small"
                                value={paymentData.amount}
                                onChange={(event) => setPaymentData('amount', event.target.value)}
                                error={!!paymentErrors.amount}
                                helperText={paymentErrors.amount || `Maximum: $${Number(paymentPurchase?.due_amount || 0).toFixed(2)}`}
                                inputProps={{ min: 0.01, max: Number(paymentPurchase?.due_amount || 0), step: '0.01' }}
                                required
                            />
                            <TextField
                                label="Reference Number"
                                fullWidth
                                size="small"
                                value={paymentData.reference_number}
                                onChange={(event) => setPaymentData('reference_number', event.target.value)}
                                error={!!paymentErrors.reference_number}
                                helperText={paymentErrors.reference_number}
                            />
                            <TextField
                                label="Notes"
                                fullWidth
                                size="small"
                                multiline
                                rows={3}
                                value={paymentData.notes}
                                onChange={(event) => setPaymentData('notes', event.target.value)}
                                error={!!paymentErrors.notes}
                                helperText={paymentErrors.notes}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handlePaymentClose} size="small">Cancel</Button>
                        <Button type="submit" variant="contained" size="small" disabled={paymentProcessing}>
                            Save Payment
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
