import { automaticPrice, purchaseBuyingCost } from '@/Utils/automaticPricing';
import DataTableFooter from '@/Components/DataTableFooter';
import ClickableTableRow from '@/Components/ClickableTableRow';
import TableRowActions, { TableActionCell, TableActionHead } from '@/Components/TableRowActions';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, router, useForm } from '@/spa';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
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
    Check as CheckIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    CheckCircle as CheckCircleIcon,
    NavigateBefore as NavigateBeforeIcon,
    NavigateNext as NavigateNextIcon,
    Payment as PaymentIcon,
    ReceiptLong as PurchaseIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

const purchaseSteps = [
    { label: 'Basic Information', shortLabel: 'Basic' },
    { label: 'Select Products', shortLabel: 'Products' },
    { label: 'Quantities & Prices', shortLabel: 'Quantities' },
    { label: 'Review & Confirm', shortLabel: 'Review' },
];

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

const compactCellFieldSx = {
    minWidth: 0,
    '& .MuiInputBase-root': { minHeight: 30, fontSize: '0.78rem' },
    '& .MuiInputBase-input': { width: '100%', minWidth: 0, px: 0.5, py: 0.5 },
    '& .MuiSelect-select': { px: 0.75, py: '4px !important' },
    '& input[type="number"]': { MozAppearance: 'textfield' },
    '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': {
        WebkitAppearance: 'none',
        margin: 0,
    },
};

const validationCellSx = (invalid) => invalid ? {
    boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.error.main}`,
    bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(211, 47, 47, 0.035)' : 'rgba(239, 83, 80, 0.08)',
} : undefined;

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

export default function PurchaseIndex({ auth, purchases, suppliers, products, branches, filters, pricing_rules = [], open_purchase_modal = false, edit_purchase = null }) {
    const [open, setOpen] = useState(Boolean(open_purchase_modal));
    const initialEditHandled = useRef(false);
    const [activeStep, setActiveStep] = useState(0);
    const [stepErrors, setStepErrors] = useState([]);
    const [productQuery, setProductQuery] = useState('');
    const [categoryId, setCategoryId] = useState('all');
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentPurchase, setPaymentPurchase] = useState(null);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [search, setSearch] = useState(filters?.search || '');
    const purchaseRows = purchases?.data || purchases || [];
    const defaultPurchaseDate = todayInputValue();

    const { data, setData, post, patch, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        supplier_id: '',
        branch_id: auth.user?.current_branch_id || auth.user?.branch_id || branches[0]?.id || '',
        invoice_number: '',
        purchase_date: defaultPurchaseDate,
        due_date: addDaysToInputDate(defaultPurchaseDate, 7),
        payment_status: 'Due',
        paid_amount: 0,
        items: [],
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

    const categories = useMemo(() => {
        const unique = new Map();
        products.forEach((product) => {
            if (product.category?.id) unique.set(product.category.id, product.category);
        });
        return Array.from(unique.values()).sort((left, right) => left.name.localeCompare(right.name));
    }, [products]);

    const selectedProductIds = useMemo(
        () => new Set(data.items.map((item) => String(item.product_id))),
        [data.items]
    );

    const filteredProducts = useMemo(() => {
        const query = productQuery.trim().toLowerCase();
        return products.filter((product) => {
            const matchesCategory = categoryId === 'all' || String(product.category_id) === String(categoryId);
            const searchable = [product.name, product.generic_name, product.barcode, product.category?.name]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return matchesCategory && (!query || searchable.includes(query));
        });
    }, [products, productQuery, categoryId]);

    const allFilteredProductsSelected = filteredProducts.length > 0
        && filteredProducts.every((product) => selectedProductIds.has(String(product.id)));
    const someFilteredProductsSelected = filteredProducts.some((product) => selectedProductIds.has(String(product.id)));

    const getBaseUnit = (product) => {
        const units = product?.product_units || [];
        return units.find((unit) => unit.is_base_unit) || units[0];
    };

    const getProductStock = (product) => (product?.inventories || [])
        .filter((inventory) => String(inventory.branch_id) === String(data.branch_id))
        .reduce((sum, inventory) => sum + Number(inventory.quantity || 0), 0);

    const quantitySummary = useMemo(() => data.items.reduce((summary, item) => {
        const selectedUnit = getUnitsForProduct(item.product_id).find((unit) => unit.unit_id === item.unit_id);
        const factor = Number(selectedUnit?.conversion_factor || 1);
        summary.paid += Number(item.quantity || 0) * factor;
        summary.foc += Number(item.foc_quantity || 0) * factor;
        return summary;
    }, { paid: 0, foc: 0 }), [data.items, products]);

    const ensureOptionValue = (value, options) => {
        const normalized = value ?? '';
        return options.some((option) => option === normalized) ? normalized : '';
    };

    const handleOpen = (purchase = null) => {
        clearErrors();
        setStepErrors([]);
        setActiveStep(0);
        setProductQuery('');
        setCategoryId('all');
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
                branch_id: auth.user?.current_branch_id || auth.user?.branch_id || branches[0]?.id || '',
                invoice_number: '',
                purchase_date: purchaseDate,
                due_date: addDaysToInputDate(purchaseDate, 7),
                payment_status: 'Due',
                paid_amount: 0,
                items: [],
            });
        }
        setOpen(true);
    };

    useEffect(() => {
        if (edit_purchase && !initialEditHandled.current) {
            initialEditHandled.current = true;
            handleOpen(edit_purchase);
        }
    }, [edit_purchase]);

    const handleClose = () => {
        setOpen(false);
        setEditingPurchase(null);
        setActiveStep(0);
        setStepErrors([]);
        setProductQuery('');
        setCategoryId('all');
        clearErrors();
        reset();

        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.has('create') || url.searchParams.has('edit')) {
                url.searchParams.delete('create');
                url.searchParams.delete('edit');
                window.history.replaceState(window.history.state, '', url.toString());
            }
        }
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

    const handleSearch = (page = undefined) => {
        router.get(route('purchases.index'), { search: search || undefined, page }, { preserveState: true, replace: true });
    };

    const purchaseItemForProduct = (product) => {
        const units = getUnitsForProduct(product.id);
        const preferredUnit = units.find((unit) => unit.is_base_unit) || units[0];

        return {
            ...emptyItem,
            product_id: product.id,
            unit_id: preferredUnit?.unit_id || '',
            selling_price: Number(preferredUnit?.selling_price || 0),
            wholesale_price: Number(preferredUnit?.wholesale_price || preferredUnit?.selling_price || 0),
        };
    };

    const addProduct = (product) => {
        if (!product?.id || selectedProductIds.has(String(product.id))) return;
        setData('items', [
            ...data.items,
            purchaseItemForProduct(product),
        ]);
        setStepErrors([]);
    };

    const removeItem = (index) => {
        setData('items', data.items.filter((_, itemIndex) => itemIndex !== index));
    };

    const removeProduct = (productId) => {
        setData('items', data.items.filter((item) => String(item.product_id) !== String(productId)));
    };

    const toggleFilteredProducts = (checked) => {
        const filteredIds = new Set(filteredProducts.map((product) => String(product.id)));
        if (checked) {
            const additions = filteredProducts
                .filter((product) => !selectedProductIds.has(String(product.id)))
                .map(purchaseItemForProduct);
            setData('items', [...data.items, ...additions]);
        } else {
            setData('items', data.items.filter((item) => !filteredIds.has(String(item.product_id))));
        }
        setStepErrors([]);
    };

    const automaticFor = (item, field) => getUnitsForProduct(item.product_id).find((unit) => unit.unit_id === item.unit_id)?.[field + '_mode'] === 'automatic';
    const recalculatePrices = (item) => {
        const unit = getUnitsForProduct(item.product_id).find((candidate) => candidate.unit_id === item.unit_id);
        if (!unit) return item;
        const next = { ...item };
        const cost = purchaseBuyingCost(String(unit.conversion_factor), String(item.unit_price || 0));
        for (const field of ['selling_price', 'wholesale_price']) {
            if (unit[field + '_mode'] === 'automatic') {
                const rule = pricing_rules.find((candidate) => candidate.code === field);
                next[field] = automaticPrice(cost, rule || {}, String(unit.conversion_factor)) ?? unit[field] ?? 0;
            }
        }
        return next;
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

            updatedItems[index] = recalculatePrices(updatedItems[index]);
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

            updatedItems[index] = recalculatePrices(updatedItems[index]);
            setData('items', updatedItems);
            return;
        }

        updatedItems[index] = {
            ...currentItem,
            [field]: value,
        };
        updatedItems[index] = recalculatePrices(updatedItems[index]);
        setData('items', updatedItems);
    };

    const getStepErrors = (step) => {
        const messages = [];

        if (step === 0) {
            if (!data.supplier_id) messages.push('Supplier is required.');
            if (!data.branch_id) messages.push('Branch is required.');
            if (!data.invoice_number.trim()) messages.push('Invoice number is required.');
            if (!data.purchase_date) messages.push('Purchase date is required.');
            if (!data.due_date) messages.push('Payment due date is required.');
            if (data.purchase_date && data.due_date && data.due_date < data.purchase_date) {
                messages.push('Payment due date cannot be before the purchase date.');
            }
        }

        if (step === 1 && data.items.length === 0) {
            messages.push('Select at least one product.');
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
                messages.push('Paid amount cannot exceed the purchase total.');
            }
        }

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
        setActiveStep((step) => Math.min(step + 1, purchaseSteps.length - 1));
    };

    const goBack = () => {
        clearErrors();
        setStepErrors([]);
        setActiveStep((step) => Math.max(step - 1, 0));
    };

    const submit = (event) => {
        event?.preventDefault();
        const messages = getStepErrors(3);
        if (messages.length) {
            setStepErrors(messages);
            return;
        }
        setStepErrors([]);
        const handleSubmissionError = (formErrors) => {
            const errorKeys = Object.keys(formErrors || {});
            if (errorKeys.some((key) => key === 'items' || key.startsWith('items.'))) {
                setActiveStep(2);
                setStepErrors(['validation']);
                return;
            }
            if (errorKeys.some((key) => ['supplier_id', 'branch_id', 'invoice_number', 'purchase_date', 'due_date', 'payment_status', 'paid_amount'].includes(key))) {
                setActiveStep(0);
            }
        };
        if (editingPurchase) {
            const purchaseId = editingPurchase?.id || editingPurchase?.purchase_id || '';
            if (!purchaseId) {
                return;
            }

            patch(route('purchases.update', { purchase: purchaseId }), {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onError: handleSubmissionError,
            });
        } else {
            post(route('purchases.store'), {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onError: handleSubmissionError,
            });
        }
    };

    return (
        <MainLayout auth={auth} header="Purchase Workflow">
            <Head title="Purchases" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <ReportFilterToolbar appBar
                        ariaLabel="Purchase list filters"
                        fieldKinds={['search']}
                        onSubmit={() => handleSearch()}
                        actions={<><Button variant="outlined" size="small" type="submit">Search</Button><CsvExportButton source={purchases} dataKey="purchases" filename="purchases.csv" /><Button type="button" onClick={() => handleOpen()} variant="contained" size="small" startIcon={<AddIcon />}>Create Purchase</Button></>}
                    >
                        <TextField
                            size="small"
                            placeholder="Search invoice or supplier..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
                        />
                    </ReportFilterToolbar>

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
                                    <TableActionHead>Actions</TableActionHead>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {purchaseRows.map((purchase) => (
                                    <ClickableTableRow key={purchase.id} href={route('purchases.show', { purchase: purchase.id })} label={`View purchase ${purchase.invoice_number}`}>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <PurchaseIcon fontSize="small" color="primary" />
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
                                        <TableActionCell>
                                            <TableRowActions label={purchase.invoice_number}>
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
                                            </TableRowActions>
                                        </TableActionCell>
                                    </ClickableTableRow>
                                ))}
                                {purchaseRows.length === 0 && (
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
                    <DataTableFooter paginator={purchases} onPageChange={(page) => handleSearch(page)} />
                </Paper>
            </Box>

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
                <DialogTitle sx={{ width: '100%', boxSizing: 'border-box', px: { xs: 1.5, md: 2 }, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" sx={{ width: '100%', minHeight: 42 }}>
                        <Box sx={{ minWidth: { xs: 120, md: 210 }, flexShrink: 0 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                                {editingPurchase ? 'Edit Purchase' : 'New Purchase'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: 'none', lg: 'block' } }}>
                                Receive inventory and supplier payment details
                            </Typography>
                        </Box>
                        <Stack
                            direction="row"
                            alignItems="center"
                            sx={{
                                flex: '0 1 760px',
                                minWidth: 0,
                                maxWidth: 760,
                                ml: 'auto',
                                gap: 1,
                            }}
                        >
                            <Box
                                role="tablist"
                                aria-label="Purchase form steps"
                                sx={{
                                    flex: 1,
                                    minWidth: 120,
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    px: 0.5,
                                }}
                            >
                            {purchaseSteps.map((step, index) => {
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
                                            position: 'relative',
                                            flex: 1,
                                            minWidth: 0,
                                            p: 0,
                                            m: 0,
                                            border: 0,
                                            color: 'inherit',
                                            bgcolor: 'transparent',
                                            font: 'inherit',
                                            cursor: index <= activeStep && !processing ? 'pointer' : 'default',
                                            opacity: 1,
                                            '&:focus-visible': {
                                                outline: '2px solid',
                                                outlineColor: 'primary.main',
                                                outlineOffset: 2,
                                                borderRadius: 1,
                                            },
                                        }}
                                    >
                                        {index < purchaseSteps.length - 1 && (
                                            <Box
                                                aria-hidden="true"
                                                sx={{
                                                    position: 'absolute',
                                                    zIndex: 0,
                                                    top: 13,
                                                    left: '50%',
                                                    width: '100%',
                                                    height: 2,
                                                    bgcolor: completed ? 'success.light' : 'divider',
                                                }}
                                            />
                                        )}
                                        <Stack alignItems="center" spacing={0.25} sx={{ position: 'relative', zIndex: 1 }}>
                                            <Box
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: '50%',
                                                    display: 'grid',
                                                    placeItems: 'center',
                                                    border: '2px solid',
                                                    borderColor: completed || active ? 'success.light' : 'divider',
                                                    bgcolor: completed ? 'success.light' : active ? 'background.paper' : 'background.paper',
                                                    color: completed ? 'common.white' : active ? 'success.dark' : 'text.secondary',
                                                    boxShadow: active ? (theme) => `0 0 0 5px ${theme.palette.success.main}18` : 'none',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                {completed ? <CheckIcon sx={{ fontSize: 18 }} /> : index + 1}
                                            </Box>
                                            <Typography
                                                component="span"
                                                sx={{
                                                    display: { xs: 'none', md: 'block' },
                                                    position: 'relative',
                                                    pb: active ? 0.5 : 0,
                                                    color: completed || active ? 'success.dark' : 'text.secondary',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    lineHeight: 1,
                                                    whiteSpace: 'nowrap',
                                                    '&::after': active ? {
                                                        content: '""',
                                                        position: 'absolute',
                                                        left: '50%',
                                                        bottom: 0,
                                                        width: 28,
                                                        height: 3,
                                                        borderRadius: 2,
                                                        bgcolor: 'success.dark',
                                                        transform: 'translateX(-50%)',
                                                    } : undefined,
                                                }}
                                            >
                                                {step.shortLabel}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                );
                            })}
                            </Box>
                            <IconButton size="small" onClick={handleClose} disabled={processing} aria-label="Cancel purchase" sx={{ flexShrink: 0 }}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Stack>
                </DialogTitle>

                <DialogContent
                    sx={{
                        p: activeStep <= 2 ? { xs: 1.25, md: 1.5 } : { xs: 2, md: 2.5 },
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                        overflow: activeStep <= 2 ? 'hidden' : 'auto',
                        bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'background.default',
                    }}
                >
                    <Stack spacing={activeStep <= 2 ? 1.25 : 2} sx={{ flex: activeStep <= 2 ? 1 : 'initial', minHeight: 0 }}>
                        {editingPurchase && activeStep === 0 && (
                            <Alert severity="warning">
                                Updating this purchase recalculates its stock movement and supplier balance.
                            </Alert>
                        )}

                        {stepErrors.length > 0 && activeStep !== 2 && (
                            <Alert severity="error">
                                <Stack spacing={0.25}>
                                    {stepErrors.map((message) => (
                                        <Typography key={message} variant="body2">{message}</Typography>
                                    ))}
                                </Stack>
                            </Alert>
                        )}

                        {activeStep === 0 && (
                            <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Purchase information</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, alignItems: 'start' }}>
                                    <Autocomplete
                                        options={suppliers}
                                        value={selectedSupplier || null}
                                        onChange={(_, supplier) => {
                                            setData('supplier_id', supplier?.id || '');
                                            setStepErrors([]);
                                        }}
                                        getOptionLabel={(supplier) => supplier?.name || ''}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Supplier" size="small" required error={!!errors.supplier_id} helperText={errors.supplier_id || 'Search supplier name'} />
                                        )}
                                    />
                                    <TextField
                                        select
                                        label="Branch"
                                        size="small"
                                        value={data.branch_id}
                                        onChange={(event) => setData('branch_id', event.target.value)}
                                        error={!!errors.branch_id}
                                        helperText={errors.branch_id}
                                        required
                                    >
                                        {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}
                                    </TextField>
                                    <TextField
                                        label="Invoice Number"
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
                                        size="small"
                                        value={data.purchase_date}
                                        onChange={(event) => {
                                            const purchaseDate = event.target.value;
                                            setData({ ...data, purchase_date: purchaseDate, due_date: addDaysToInputDate(purchaseDate, 7) });
                                        }}
                                        error={!!errors.purchase_date}
                                        helperText={errors.purchase_date}
                                        InputLabelProps={{ shrink: true }}
                                        required
                                    />
                                    <TextField
                                        label="Payment Due Date"
                                        type="date"
                                        size="small"
                                        value={data.due_date}
                                        onChange={(event) => setData('due_date', event.target.value)}
                                        error={!!errors.due_date}
                                        helperText={errors.due_date || 'Defaults to 7 days after purchase'}
                                        InputLabelProps={{ shrink: true }}
                                        required
                                    />
                                    <TextField
                                        select
                                        label="Payment Status"
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
                                        size="small"
                                        value={data.payment_status === 'Paid' ? totalAmount : data.payment_status === 'Due' ? 0 : data.paid_amount}
                                        onChange={(event) => setData('paid_amount', event.target.value)}
                                        disabled={data.payment_status !== 'Partial'}
                                        error={!!errors.paid_amount}
                                        helperText={errors.paid_amount}
                                        inputProps={{ min: 0, step: '0.01' }}
                                    />
                                    {selectedSupplier && (
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                px: 1.5,
                                                py: 0.75,
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 1.5,
                                                gridColumn: { sm: 'span 2', md: 'span 1' },
                                                bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(8, 145, 111, 0.04)' : 'rgba(52, 211, 153, 0.08)',
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" noWrap>Current balance</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 800 }}>${Number(selectedSupplier.balance || 0).toFixed(2)}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" noWrap>Projected</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 800 }}>${Number(projectedBalance || 0).toFixed(2)}</Typography>
                                            </Box>
                                        </Paper>
                                    )}
                                </Box>
                            </Paper>
                        )}

                        {activeStep === 1 && (
                            <Paper variant="outlined" sx={{ p: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(360px, 1fr) 320px' }, gap: 1, alignItems: 'center', mb: 1 }}>
                                    <TextField
                                        size="small"
                                        placeholder="Search name, SKU, barcode, or category"
                                        value={productQuery}
                                        onChange={(event) => setProductQuery(event.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                                    />
                                    <TextField select size="small" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} inputProps={{ 'aria-label': 'Product category' }}>
                                        <MenuItem value="all">All categories</MenuItem>
                                        {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                                    </TextField>
                                </Box>
                                <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell padding="checkbox" sx={{ width: 52 }}>
                                                    <Checkbox
                                                        size="small"
                                                        checked={allFilteredProductsSelected}
                                                        indeterminate={!allFilteredProductsSelected && someFilteredProductsSelected}
                                                        disabled={filteredProducts.length === 0}
                                                        onChange={(event) => toggleFilteredProducts(event.target.checked)}
                                                        inputProps={{ 'aria-label': 'Select all matching products' }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Stock</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Cost</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Buying Units</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredProducts.map((product) => {
                                                const selected = selectedProductIds.has(String(product.id));
                                                const units = getUnitsForProduct(product.id);
                                                const baseUnit = getBaseUnit(product);
                                                const baseUnitName = baseUnit?.unit?.short_name || baseUnit?.unit?.name || 'base unit';
                                                const stock = getProductStock(product);
                                                return (
                                                    <TableRow
                                                        key={product.id}
                                                        hover
                                                        selected={selected}
                                                        onClick={() => selected ? removeProduct(product.id) : addProduct(product)}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            '&.Mui-selected, &.Mui-selected:hover': {
                                                                bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(8, 145, 111, 0.08)' : 'rgba(52, 211, 153, 0.12)',
                                                            },
                                                        }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                size="small"
                                                                checked={selected}
                                                                onClick={(event) => event.stopPropagation()}
                                                                onChange={() => selected ? removeProduct(product.id) : addProduct(product)}
                                                                inputProps={{ 'aria-label': `Select ${product.name}` }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{product.name}</Typography>
                                                        </TableCell>
                                                        <TableCell>{product.category?.name || 'Uncategorized'}</TableCell>
                                                        <TableCell>{Number(stock).toLocaleString()} {baseUnitName}</TableCell>
                                                        <TableCell>
                                                            <Typography component="span" variant="body2" sx={{ fontWeight: 800 }}>
                                                                ${Number(product.pricing_buying_cost || 0).toFixed(2)}
                                                            </Typography>
                                                            <Typography component="span" variant="body2" color="text.secondary"> / {baseUnitName}</Typography>
                                                        </TableCell>
                                                        <TableCell>{units.map((unit) => unit.unit?.short_name || unit.unit?.name).filter(Boolean).join(' · ') || '-'}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {filteredProducts.length === 0 && (
                                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><Typography color="text.secondary">No products match this search.</Typography></TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}

                        {activeStep === 2 && (
                            <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                    <Table
                                        stickyHeader
                                        size="small"
                                        sx={{
                                            minWidth: 1040,
                                            tableLayout: 'fixed',
                                            '& .MuiTableCell-root': {
                                                px: 0.75,
                                                py: 0.5,
                                                borderRight: 1,
                                                borderColor: 'divider',
                                                overflow: 'hidden',
                                                overflowWrap: 'anywhere',
                                            },
                                            '& .MuiTableCell-head': {
                                                py: 1,
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                lineHeight: 1.1,
                                                whiteSpace: 'normal',
                                            },
                                        }}
                                    >
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ width: 150 }}>Product</TableCell>
                                                <TableCell sx={{ width: 100 }}>Buying Unit</TableCell>
                                                <TableCell sx={{ width: 62 }}>Paid Qty</TableCell>
                                                <TableCell sx={{ width: 62 }}>FOC Qty</TableCell>
                                                <TableCell sx={{ width: 74 }}>Unit Cost</TableCell>
                                                <TableCell sx={{ width: 72 }}>Retail</TableCell>
                                                <TableCell sx={{ width: 82 }}>Wholesale</TableCell>
                                                <TableCell sx={{ width: 100 }}>Batch</TableCell>
                                                <TableCell sx={{ width: 112 }}>Expiry</TableCell>
                                                <TableCell sx={{ width: 88 }}>Effective Cost</TableCell>
                                                <TableCell sx={{ width: 90 }}>Line Total</TableCell>
                                                <TableCell sx={{ width: 44 }} aria-label="Actions" />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {data.items.map((item, index) => {
                                                const product = getProductById(item.product_id);
                                                const units = getUnitsForProduct(item.product_id);
                                                const selectedUnit = units.find((unit) => unit.unit_id === item.unit_id);
                                                const factor = Number(selectedUnit?.conversion_factor || 1);
                                                const paidQuantity = Number(item.quantity || 0);
                                                const focQuantity = Number(item.foc_quantity || 0);
                                                const receivedBaseQuantity = (paidQuantity + focQuantity) * factor;
                                                const lineTotal = paidQuantity * Number(item.unit_price || 0);
                                                const effectiveCost = receivedBaseQuantity > 0 ? lineTotal / receivedBaseQuantity : 0;
                                                const baseUnit = getBaseUnit(product);
                                                const baseUnitName = baseUnit?.unit?.short_name || baseUnit?.unit?.name || 'base';
                                                const fieldProps = { variant: 'standard', fullWidth: true, InputProps: { disableUnderline: true }, sx: compactCellFieldSx };
                                                const showClientErrors = stepErrors.length > 0;
                                                const fieldInvalid = {
                                                    unit_id: (showClientErrors && !item.unit_id) || Boolean(errors[`items.${index}.unit_id`]),
                                                    quantity: (showClientErrors && Number(item.quantity || 0) < 1) || Boolean(errors[`items.${index}.quantity`]),
                                                    foc_quantity: (showClientErrors && Number(item.foc_quantity || 0) < 0) || Boolean(errors[`items.${index}.foc_quantity`]),
                                                    unit_price: (showClientErrors && Number(item.unit_price || 0) <= 0) || Boolean(errors[`items.${index}.unit_price`]),
                                                    selling_price: (showClientErrors && Number(item.selling_price || 0) <= 0) || Boolean(errors[`items.${index}.selling_price`]),
                                                    wholesale_price: (showClientErrors && Number(item.wholesale_price || 0) <= 0) || Boolean(errors[`items.${index}.wholesale_price`]),
                                                    expiry_date: (showClientErrors && !item.expiry_date) || Boolean(errors[`items.${index}.expiry_date`]),
                                                };

                                                return (
                                                    <TableRow key={item.product_id} hover>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{product?.name || `Item ${index + 1}`}</Typography>
                                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                                {Number(getProductStock(product)).toLocaleString()} {baseUnitName}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={validationCellSx(fieldInvalid.unit_id)}>
                                                            <TextField {...fieldProps} select value={item.unit_id} onChange={(event) => updateItem(index, 'unit_id', event.target.value)} inputProps={{ 'aria-label': `${product?.name || 'Product'} buying unit` }}>
                                                                {units.map((unit) => (
                                                                    <MenuItem key={unit.id} value={unit.unit_id}>
                                                                        {unit.unit?.short_name || unit.unit?.name}{Number(unit.conversion_factor || 1) > 1 ? ` (×${unit.conversion_factor})` : ''}
                                                                    </MenuItem>
                                                                ))}
                                                            </TextField>
                                                        </TableCell>
                                                        <TableCell sx={validationCellSx(fieldInvalid.quantity)}>
                                                            <TextField {...fieldProps} type="number" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} inputProps={{ min: 1, 'aria-label': `${product?.name || 'Product'} paid quantity` }} />
                                                        </TableCell>
                                                        <TableCell sx={validationCellSx(fieldInvalid.foc_quantity)}>
                                                            <TextField {...fieldProps} type="number" value={item.foc_quantity} onChange={(event) => updateItem(index, 'foc_quantity', event.target.value)} inputProps={{ min: 0, 'aria-label': `${product?.name || 'Product'} FOC quantity` }} />
                                                        </TableCell>
                                                        <TableCell sx={validationCellSx(fieldInvalid.unit_price)}>
                                                            <TextField {...fieldProps} type="number" value={item.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} inputProps={{ min: 0.01, step: '0.01', 'aria-label': `${product?.name || 'Product'} unit cost` }} />
                                                        </TableCell>
                                                        <TableCell sx={validationCellSx(fieldInvalid.selling_price)}>
                                                            <TextField {...fieldProps} type="number" value={item.selling_price} onChange={(event) => updateItem(index, 'selling_price', event.target.value)} disabled={automaticFor(item, 'selling_price')} inputProps={{ min: 0.01, step: '0.01', 'aria-label': `${product?.name || 'Product'} retail price` }} />
                                                        </TableCell>
                                                        <TableCell sx={validationCellSx(fieldInvalid.wholesale_price)}>
                                                            <TextField {...fieldProps} type="number" value={item.wholesale_price} onChange={(event) => updateItem(index, 'wholesale_price', event.target.value)} disabled={automaticFor(item, 'wholesale_price')} inputProps={{ min: 0.01, step: '0.01', 'aria-label': `${product?.name || 'Product'} wholesale price` }} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField {...fieldProps} value={item.batch_number} placeholder="Auto" onChange={(event) => updateItem(index, 'batch_number', event.target.value)} inputProps={{ 'aria-label': `${product?.name || 'Product'} batch number` }} />
                                                        </TableCell>
                                                        <TableCell sx={validationCellSx(fieldInvalid.expiry_date)}>
                                                            <TextField {...fieldProps} type="date" value={item.expiry_date} onChange={(event) => updateItem(index, 'expiry_date', event.target.value)} inputProps={{ 'aria-label': `${product?.name || 'Product'} expiry date` }} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">{effectiveCost.toFixed(2)} / {baseUnitName}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 800 }}>${lineTotal.toFixed(2)}</Typography>
                                                        </TableCell>
                                                        <TableCell align="center" sx={{ borderRight: '0 !important' }}>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => removeItem(index)}
                                                                aria-label={`Remove ${product?.name || 'item'}`}
                                                                sx={{ border: 1, borderColor: 'error.light', borderRadius: 1 }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Stack
                                    direction="row"
                                    justifyContent="flex-end"
                                    alignItems="center"
                                    divider={<Divider orientation="vertical" flexItem />}
                                    sx={{ minHeight: 52, px: 1.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}
                                >
                                    <Typography variant="body2" sx={{ px: 2 }} color="text.secondary">Paid <Box component="strong" sx={{ ml: 0.75, color: 'text.primary' }}>{quantitySummary.paid}</Box></Typography>
                                    <Typography variant="body2" sx={{ px: 2 }} color="text.secondary">FOC <Box component="strong" sx={{ ml: 0.75, color: 'text.primary' }}>{quantitySummary.foc}</Box></Typography>
                                    <Typography variant="body2" sx={{ px: 2 }} color="text.secondary">Received <Box component="strong" sx={{ ml: 0.75, color: 'text.primary' }}>{quantitySummary.paid + quantitySummary.foc}</Box></Typography>
                                    <Paper elevation={0} sx={{ px: 2, py: 1, ml: 1.5, bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(8, 145, 111, 0.1)' : 'rgba(52, 211, 153, 0.14)' }}>
                                        <Typography variant="body2" color="text.secondary">Total <Box component="strong" sx={{ ml: 1, color: 'success.dark', fontSize: '1rem' }}>${totalAmount.toFixed(2)}</Box></Typography>
                                    </Paper>
                                </Stack>
                            </Paper>
                        )}

                        {activeStep === 3 && (
                            <Stack spacing={2}>
                                {Object.keys(errors).length > 0 && (
                                    <Alert severity="error">{Object.values(errors).flat().join(' ')}</Alert>
                                )}
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1.25 }}>
                                    {[
                                        ['Supplier', selectedSupplier?.name || '-'],
                                        ['Invoice', data.invoice_number || '-'],
                                        ['Products', data.items.length],
                                        ['Purchase Total', `$${totalAmount.toFixed(2)}`],
                                        ['Amount Due', `$${dueAmount.toFixed(2)}`],
                                    ].map(([label, value]) => (
                                        <Paper key={label} variant="outlined" sx={{ p: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{value}</Typography>
                                        </Paper>
                                    ))}
                                </Box>
                                <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Batch / Expiry</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }} align="right">Paid</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }} align="right">FOC</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }} align="right">Unit Cost</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }} align="right">Line Total</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {data.items.map((item) => {
                                                    const product = getProductById(item.product_id);
                                                    const unit = getUnitsForProduct(item.product_id).find((candidate) => candidate.unit_id === item.unit_id);
                                                    return (
                                                        <TableRow key={item.product_id}>
                                                            <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{product?.name || '-'}</Typography></TableCell>
                                                            <TableCell><Typography variant="body2">{item.batch_number || 'Auto generated'}</Typography><Typography variant="caption" color="text.secondary">{formatPurchaseDate(item.expiry_date)}</Typography></TableCell>
                                                            <TableCell>{unit?.unit?.short_name || unit?.unit?.name || '-'}</TableCell>
                                                            <TableCell align="right">{item.quantity}</TableCell>
                                                            <TableCell align="right">{item.foc_quantity || 0}</TableCell>
                                                            <TableCell align="right">${Number(item.unit_price || 0).toFixed(2)}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 800 }}>${(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderTop: 1, borderColor: 'divider', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Step {activeStep + 1} of {purchaseSteps.length}</Typography>
                    <Stack direction="row" spacing={1}>
                        {activeStep > 0 && (
                            <Button type="button" variant="outlined" startIcon={<NavigateBeforeIcon />} onClick={goBack} disabled={processing}>Previous</Button>
                        )}
                        {activeStep < purchaseSteps.length - 1 ? (
                            <Button type="button" variant="contained" endIcon={<NavigateNextIcon />} onClick={goNext} disabled={processing}>Continue</Button>
                        ) : (
                            <Button type="button" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={submit} disabled={processing}>
                                {editingPurchase ? 'Update Purchase' : 'Confirm & Receive Stock'}
                            </Button>
                        )}
                    </Stack>
                </DialogActions>
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
