import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PosLayout from '@/Layouts/PosLayout';
import { usePage, Head, useForm } from '@inertiajs/react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
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
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    PersonAdd as PersonAddIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    QrCodeScanner as ScanIcon,
    Search as SearchIcon,
    ShoppingCartCheckout as CheckoutIcon,
    ViewList as ListViewIcon,
    ViewModule as GridViewIcon,
} from '@mui/icons-material';

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function PosIndex({ auth, paymentMethods, paymentStatuses, posDefaults }) {
    const { settings = {} } = usePage().props;
    const currencySymbol = settings.app?.currency_symbol || '$';

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [scanError, setScanError] = useState('');
    const [resultsView, setResultsView] = useState('table');
    const [catalogCategories, setCatalogCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [catalogPage, setCatalogPage] = useState(1);
    const [catalogHasMore, setCatalogHasMore] = useState(false);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [customerSearchInput, setCustomerSearchInput] = useState('');
    const [customerLoading, setCustomerLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '', address: '' });
    const [newCustomerSubmitting, setNewCustomerSubmitting] = useState(false);
    const [newCustomerError, setNewCustomerError] = useState('');

    const scanBuffer = useRef('');
    const lastScanTime = useRef(0);

    const { data, setData, post, processing, errors } = useForm({
        customer_id: null,
        discount: 0,
        payment_method: paymentMethods?.[0] || 'Cash',
        payment_status: paymentStatuses?.[0] || 'Paid',
        items: [],
    });

    const branchId = auth.user?.current_branch_id || auth.user?.branch_id;
    const branchName = auth.user?.accessible_branches?.find((b) => b.id === branchId)?.name;

    useEffect(() => {
        setData('items', cart.map((line) => ({
            product_id: line.product_id,
            unit_id: line.unit_id,
            quantity: line.quantity,
        })));
    }, [cart, setData]);

    useEffect(() => {
        setData('customer_id', selectedCustomer?.id ?? null);
    }, [selectedCustomer, setData]);

    const fetchCustomers = useCallback(async (query) => {
        setCustomerLoading(true);
        try {
            const response = await fetch(route('pos.customers', { query: query.trim() || undefined }));
            const list = await response.json();
            setCustomerOptions(Array.isArray(list) ? list : []);
        } catch {
            setCustomerOptions([]);
        } finally {
            setCustomerLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            fetchCustomers(customerSearchInput);
        }, 300);
        return () => clearTimeout(t);
    }, [customerSearchInput, fetchCustomers]);

    const openNewCustomer = () => {
        setNewCustomerForm({ name: '', phone: '', email: '', address: '' });
        setNewCustomerError('');
        setNewCustomerOpen(true);
    };

    const closeNewCustomer = () => {
        setNewCustomerOpen(false);
        setNewCustomerError('');
    };

    const submitNewCustomer = async (e) => {
        e.preventDefault();
        setNewCustomerError('');
        if (!newCustomerForm.name?.trim()) {
            setNewCustomerError('Name is required.');
            return;
        }
        setNewCustomerSubmitting(true);
        try {
            const response = await fetch(route('pos.customers.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(newCustomerForm),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const errors = data?.errors ? Object.values(data.errors).flat() : [];
                const msg = errors.length ? errors.join(' ') : (data?.message || 'Failed to create customer.');
                setNewCustomerError(msg);
                return;
            }
            setSelectedCustomer(data);
            setCustomerOptions((prev) => (prev.some((c) => c.id === data.id) ? prev : [data, ...prev]));
            closeNewCustomer();
        } catch {
            setNewCustomerError('Network error. Please try again.');
        } finally {
            setNewCustomerSubmitting(false);
        }
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                return;
            }

            const currentTime = Date.now();

            if (currentTime - lastScanTime.current > 100) {
                scanBuffer.current = '';
            }

            lastScanTime.current = currentTime;

            if (e.key === 'Enter') {
                if (scanBuffer.current.length > 3) {
                    handleBarcodeScan(scanBuffer.current);
                    scanBuffer.current = '';
                }
            } else if (e.key.length === 1) {
                scanBuffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const fetchSearch = async () => {
        const query = searchQuery.trim();
        setScanError('');

        if (!query) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const response = await fetch(route('pos.products', { query }));
            const data = await response.json();
            setSearchResults(Array.isArray(data) ? data : []);
        } finally {
            setSearchLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(route('pos.categories'));
            const data = await response.json();
            setCatalogCategories(Array.isArray(data) ? data : []);
        } catch {
            setCatalogCategories([]);
        }
    };

    const fetchCatalog = async ({ categoryId, page, append }) => {
        setScanError('');
        setCatalogLoading(true);
        try {
            const response = await fetch(route('pos.catalog', { category_id: categoryId || null, page, per_page: 60 }));
            const payload = await response.json();
            const items = Array.isArray(payload?.data) ? payload.data : [];
            const meta = payload?.meta || {};
            const hasMore = Number(meta.current_page || 1) < Number(meta.last_page || 1);

            setCatalogHasMore(hasMore);
            setCatalogPage(Number(meta.current_page || page || 1));
            setSearchResults((prev) => (append ? [...prev, ...items] : items));
        } finally {
            setCatalogLoading(false);
        }
    };

    useEffect(() => {
        if (resultsView !== 'grid') return;
        if (catalogCategories.length === 0) {
            fetchCategories();
        }
        fetchCatalog({ categoryId: selectedCategoryId, page: 1, append: false });
    }, [resultsView]);

    useEffect(() => {
        if (resultsView !== 'grid') return;
        fetchCatalog({ categoryId: selectedCategoryId, page: 1, append: false });
    }, [selectedCategoryId]);

    const handleBarcodeScan = async (barcode) => {
        setScanError('');
        try {
            const response = await fetch(route('pos.scan', { barcode }));
            if (!response.ok) {
                setScanError(`Barcode not found: ${barcode}`);
                return;
            }
            const product = await response.json();
            addProductToCart(product);
        } catch {
            setScanError(`Barcode scan failed: ${barcode}`);
        }
    };

    const addProductToCart = (product) => {
        const units = product?.units || [];
        const preferredUnit = units.find((u) => u.is_base_unit) || units[0];

        if (!preferredUnit) {
            setScanError('Selected product has no units configured.');
            return;
        }

        setCart((prev) => {
            const existingIndex = prev.findIndex(
                (l) => l.product_id === product.id && l.unit_id === preferredUnit.unit_id
            );

            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: Number(updated[existingIndex].quantity || 0) + 1,
                };
                return updated;
            }

            return [
                ...prev,
                {
                    id: makeId(),
                    product_id: product.id,
                    name: product.name,
                    barcode: product.barcode,
                    image_path: product.image_path || null,
                    tax_method: product.tax_method,
                    tax_rate: Number(product.total_tax_rate || 0),
                    stock_quantity: product.stock_quantity || 0,
                    units,
                    unit_id: preferredUnit.unit_id,
                    unit_name: preferredUnit.short_name || preferredUnit.name,
                    conversion_factor: preferredUnit.conversion_factor || 1,
                    unit_price: preferredUnit.selling_price || 0,
                    quantity: 1,
                },
            ];
        });
    };

    const updateCartLine = (id, patch) => {
        setCart((prev) =>
            prev.map((line) => {
                if (line.id !== id) return line;

                const updated = { ...line, ...patch };

                if (patch.unit_id) {
                    const unit = (updated.units || []).find((u) => u.unit_id === patch.unit_id);
                    if (unit) {
                        updated.unit_name = unit.short_name || unit.name;
                        updated.conversion_factor = unit.conversion_factor || 1;
                        updated.unit_price = unit.selling_price || 0;
                    }
                }

                return updated;
            })
        );
    };

    const removeCartLine = (id) => setCart((prev) => prev.filter((l) => l.id !== id));

    const totals = useMemo(() => {
        let totalAmount = 0;
        let tax = 0;

        for (const line of cart) {
            const qty = Number(line.quantity || 0);
            const unitPrice = Number(line.unit_price || 0);
            const rate = Number(line.tax_rate || 0);
            const lineTotal = qty * unitPrice;

            if (line.tax_method === 'Inclusive' && rate > 0) {
                const preTax = lineTotal / (1 + rate / 100);
                totalAmount += preTax;
                tax += lineTotal - preTax;
            } else {
                totalAmount += lineTotal;
                tax += lineTotal * (rate / 100);
            }
        }

        const discount = Math.max(Number(data.discount || 0), 0);
        const grandTotal = Math.max(totalAmount + tax - discount, 0);

        return {
            totalAmount,
            tax,
            discount,
            grandTotal,
        };
    }, [cart, data.discount]);

    const submit = (e) => {
        e.preventDefault();
        post(route('pos.checkout'), {
            preserveScroll: true,
            onSuccess: () => {
                setCart([]);
                setSearchResults([]);
                setSearchQuery('');
                setScanError('');
                setSelectedCustomer(null);
                setCustomerSearchInput('');
                setData('customer_id', null);
                setData('discount', 0);
                setData('payment_method', paymentMethods?.[0] || 'Cash');
                setData('payment_status', paymentStatuses?.[0] || 'Paid');
            },
        });
    };

    return (
        <PosLayout header="POS Interface">
            <Head title="POS" />

            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <ScanIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                Product Search / Barcode Scan
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={resultsView}
                                onChange={(e, next) => {
                                    if (next) setResultsView(next);
                                }}
                            >
                                <ToggleButton value="table">
                                    <ListViewIcon fontSize="small" />
                                </ToggleButton>
                                <ToggleButton value="grid">
                                    <GridViewIcon fontSize="small" />
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <Chip size="small" label={`Branch: ${branchName || branchId || '-'}`} variant="outlined" />
                        </Stack>

                        {scanError && (
                            <Alert severity="error" sx={{ mb: 1.5 }}>
                                {scanError}
                            </Alert>
                        )}

                        {resultsView === 'table' ? (
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search by name, generic name, or barcode..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchSearch()}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={fetchSearch}
                                    disabled={searchLoading}
                                    sx={{ minWidth: 110 }}
                                >
                                    Search
                                </Button>
                            </Stack>
                        ) : (
                            <Box sx={{ pb: 0.5 }}>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                        gap: 1,
                                    }}
                                >
                                    <Button
                                        variant={selectedCategoryId === '' ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setSelectedCategoryId('')}
                                        sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                                    >
                                        All
                                    </Button>
                                    {catalogCategories.map((cat) => (
                                        <Button
                                            key={cat.id}
                                            variant={selectedCategoryId === cat.id ? 'contained' : 'outlined'}
                                            size="small"
                                            onClick={() => setSelectedCategoryId(cat.id)}
                                            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                                        >
                                            {cat.name}
                                        </Button>
                                    ))}
                                </Box>
                                {catalogLoading && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                                        Loading...
                                    </Typography>
                                )}
                            </Box>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            RESULTS
                        </Typography>

                        {resultsView === 'table' ? (
                            <TableContainer sx={{ mt: 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Stock
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="center">
                                                Add
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {searchResults.map((p) => (
                                            <TableRow key={p.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {p.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {p.barcode || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {p.stock_quantity}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" color="primary" onClick={() => addProductToCart(p)}>
                                                        <AddIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {searchResults.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                                                    <Typography variant="body2" color="text.secondary italic">
                                                        Search products or scan a barcode to add items.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box
                                sx={{
                                    mt: 1,
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 1.5,
                                }}
                            >
                                {searchResults.map((p) => {
                                    const units = p.units || [];
                                    const preferred = units.find((u) => u.is_base_unit) || units[0];
                                    const price = Number(preferred?.selling_price || 0);
                                    const unitLabel = preferred?.short_name || preferred?.name || '';
                                    const imageUrl = p.image_path ? `/storage/${p.image_path}` : null;

                                    return (
                                        <Card key={p.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                                            <CardActionArea onClick={() => addProductToCart(p)}>
                                                <Box
                                                    sx={{
                                                        height: 120,
                                                        bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.100' : 'rgba(255, 255, 255, 0.06)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {imageUrl ? (
                                                        <Box
                                                            component="img"
                                                            src={imageUrl}
                                                            alt={p.name}
                                                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">
                                                            No Image
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <CardContent sx={{ py: 1.25 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={p.name}>
                                                        {p.name}
                                                    </Typography>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {unitLabel ? `Unit: ${unitLabel}` : 'Unit'}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                                            {currencySymbol}{price.toFixed(2)}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Stock
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                            {p.stock_quantity}
                                                        </Typography>
                                                    </Stack>
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    );
                                })}
                                {searchResults.length === 0 && (
                                    <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                                        <Typography variant="body2" color="text.secondary italic" align="center">
                                            Search products or scan a barcode to add items.
                                        </Typography>
                                    </Paper>
                                )}
                                {searchResults.length > 0 && catalogHasMore && (
                                    <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            disabled={catalogLoading}
                                            onClick={() => fetchCatalog({ categoryId: selectedCategoryId, page: catalogPage + 1, append: true })}
                                        >
                                            Load more
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Paper>

                    <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Cart
                        </Typography>

                        <TableContainer sx={{ minHeight: 260 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">
                                            Qty
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">
                                            Total
                                        </TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {cart.map((line) => {
                                        const qty = Number(line.quantity || 0);
                                        const unitPrice = Number(line.unit_price || 0);
                                        const lineTotal = qty * unitPrice;
                                        const maxQty = Math.floor((Number(line.stock_quantity || 0) || 0) / (Number(line.conversion_factor || 1) || 1));

                                        return (
                                            <TableRow key={line.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {line.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {line.barcode || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        value={line.unit_id}
                                                        onChange={(e) => updateCartLine(line.id, { unit_id: e.target.value })}
                                                        sx={{ minWidth: 120 }}
                                                    >
                                                        {(line.units || []).map((u) => (
                                                            <MenuItem key={u.unit_id} value={u.unit_id}>
                                                                {u.short_name || u.name}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={line.quantity}
                                                        onChange={(e) => updateCartLine(line.id, { quantity: e.target.value })}
                                                        inputProps={{ min: 0.01, step: '0.01' }}
                                                        sx={{ width: 90 }}
                                                        error={maxQty >= 0 && qty > maxQty}
                                                        helperText={maxQty >= 0 && qty > maxQty ? `Max ${maxQty}` : ''}
                                                    />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {currencySymbol}{lineTotal.toFixed(2)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" color="error" onClick={() => removeCartLine(line.id)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {cart.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                                                <Typography variant="body2" color="text.secondary italic">
                                                    Cart is empty.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Divider sx={{ my: 2 }} />

                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    Subtotal
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {currencySymbol}{totals.totalAmount.toFixed(2)}
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    Tax
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {currencySymbol}{totals.tax.toFixed(2)}
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    Discount
                                </Typography>
                                <TextField
                                    size="small"
                                    type="number"
                                    value={data.discount}
                                    onChange={(e) => setData('discount', e.target.value)}
                                    InputProps={{
                                        startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>{currencySymbol}</Typography>,
                                    }}
                                    inputProps={{ min: 0, step: '0.01' }}
                                    sx={{ width: 120 }}
                                />
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                    Grand Total
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                    {currencySymbol}{totals.grandTotal.toFixed(2)}
                                </Typography>
                            </Stack>
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        <Box component="form" onSubmit={submit}>
                            <Stack spacing={1.5}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Customer (optional)
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                        <Autocomplete
                                            size="small"
                                            fullWidth
                                            options={customerOptions}
                                            value={selectedCustomer}
                                            onChange={(e, value) => setSelectedCustomer(value)}
                                            inputValue={customerSearchInput}
                                            onInputChange={(e, value) => setCustomerSearchInput(value || '')}
                                            getOptionLabel={(option) => (option?.name ?? '') || ''}
                                            renderOption={(props, option) => (
                                                <li {...props} key={option.id}>
                                                    <Stack>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {[option.phone, option.email].filter(Boolean).join(' · ') || 'No contact'}
                                                        </Typography>
                                                    </Stack>
                                                </li>
                                            )}
                                            loading={customerLoading}
                                            isOptionEqualToValue={(option, value) => option?.id === value?.id}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    placeholder="Search by name, phone, or email..."
                                                    size="small"
                                                />
                                            )}
                                        />
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            size="small"
                                            startIcon={<PersonAddIcon />}
                                            onClick={openNewCustomer}
                                            sx={{ minWidth: 140 }}
                                        >
                                            New customer
                                        </Button>
                                    </Stack>
                                </Box>

                                <Stack direction="row" spacing={1}>
                                    <TextField
                                        select
                                        size="small"
                                        fullWidth
                                        label="Payment Method"
                                        value={data.payment_method}
                                        onChange={(e) => setData('payment_method', e.target.value)}
                                        error={!!errors.payment_method}
                                        helperText={errors.payment_method}
                                    >
                                        {(paymentMethods || []).map((m) => (
                                            <MenuItem key={m} value={m}>
                                                {m}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        select
                                        size="small"
                                        fullWidth
                                        label="Payment Status"
                                        value={data.payment_status}
                                        onChange={(e) => setData('payment_status', e.target.value)}
                                        error={!!errors.payment_status}
                                        helperText={errors.payment_status}
                                    >
                                        {(paymentStatuses || []).map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {s}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>

                                {errors.items && (
                                    <Alert severity="error">{errors.items}</Alert>
                                )}

                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<CheckoutIcon />}
                                    disabled={processing || cart.length === 0}
                                    fullWidth
                                >
                                    Complete Sale
                                </Button>
                            </Stack>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            <Dialog open={newCustomerOpen} onClose={closeNewCustomer} maxWidth="sm" fullWidth>
                <form onSubmit={submitNewCustomer}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        New customer
                        <IconButton size="small" onClick={closeNewCustomer}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 0.5 }}>
                            {newCustomerError && (
                                <Alert severity="error" onClose={() => setNewCustomerError('')}>
                                    {newCustomerError}
                                </Alert>
                            )}
                            <TextField
                                size="small"
                                label="Name"
                                fullWidth
                                value={newCustomerForm.name}
                                onChange={(e) => setNewCustomerForm((p) => ({ ...p, name: e.target.value }))}
                                required
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    size="small"
                                    label="Phone"
                                    fullWidth
                                    value={newCustomerForm.phone}
                                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                                />
                                <TextField
                                    size="small"
                                    label="Email"
                                    fullWidth
                                    type="email"
                                    value={newCustomerForm.email}
                                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, email: e.target.value }))}
                                />
                            </Stack>
                            <TextField
                                size="small"
                                label="Address"
                                fullWidth
                                multiline
                                rows={2}
                                value={newCustomerForm.address}
                                onChange={(e) => setNewCustomerForm((p) => ({ ...p, address: e.target.value }))}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button type="button" size="small" onClick={closeNewCustomer}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" size="small" disabled={newCustomerSubmitting}>
                            {newCustomerSubmitting ? 'Creating…' : 'Create & use'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </PosLayout>
    );
}
