import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import {
    Box,
    Paper,
    Typography,
    Divider,
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
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Avatar,
    Tooltip,
    Checkbox,
    ListItemText,
    FormControlLabel,
    Switch,
    FormHelperText,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Medication as ProductIcon,
    Close as CloseIcon,
    PhotoCamera as PhotoCameraIcon,
    QrCode as BarcodeIcon,
    Search as SearchIcon,
    FilterAlt as FilterIcon,
    Clear as ClearIcon,
    AddCircleOutline as AddUnitIcon,
    Print as PrintIcon,
} from '@mui/icons-material';

export default function ProductIndex({ auth, products, categories, taxes, units, filters, default_tax_id: defaultTaxId }) {
    const { ziggy = {} } = usePage().props;
    const appBase = ziggy?.base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const storageUrl = (path) => withBase(`/storage/${String(path || '').replace(/^\/+/, '')}`);

    const [open, setOpen] = useState(false);

    // Printing State
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [printItems, setPrintItems] = useState([]);
    const [selectedForPrint, setSelectedForPrint] = useState([]);

    // Scanner State
    const scanBuffer = useRef('');
    const lastScanTime = useRef(0);
    const barcodeInputRef = useRef(null);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Only listen if no modal is open and we aren't typing in an input
            if (open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                return;
            }

            const currentTime = Date.now();
            
            // Clear buffer if more than 100ms between keys (likely manual typing)
            if (currentTime - lastScanTime.current > 100) {
                scanBuffer.current = '';
            }
            
            lastScanTime.current = currentTime;

            if (e.key === 'Enter') {
                if (scanBuffer.current.length > 3) {
                    processScan(scanBuffer.current);
                    scanBuffer.current = '';
                }
            } else if (e.key.length === 1) {
                scanBuffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [open, products]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const timer = setTimeout(() => {
            barcodeInputRef.current?.focus();
        }, 120);

        return () => clearTimeout(timer);
    }, [open]);

    const processScan = (barcode) => {
        const existingProduct = products.data.find(p => p.barcode === barcode);
        if (existingProduct) {
            handleOpen(existingProduct);
        } else {
            handleOpen();
            setData('barcode', barcode);
        }
    };

    // Search and Filter State
    const [search, setSearch] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');

    const handleSearch = () => {
        router.get(route('products.index'), {
            search: search,
            category: selectedCategory,
            status: selectedStatus,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleClearFilters = () => {
        setSearch('');
        setSelectedCategory('');
        setSelectedStatus('');
        router.get(route('products.index'));
    };

    const togglePrintSelection = (productId) => {
        setSelectedForPrint(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId) 
                : [...prev, productId]
        );
    };

    const handleOpenPrintDialog = () => {
        const items = products.data
            .filter(p => selectedForPrint.includes(p.id))
            .map(p => ({
                id: p.id,
                name: p.name,
                barcode: p.barcode,
                quantity: 1
            }));
        setPrintItems(items);
        setPrintDialogOpen(true);
    };

    const updatePrintQuantity = (id, qty) => {
        setPrintItems(prev => prev.map(item => 
            item.id === id ? { ...item, quantity: Math.max(1, parseInt(qty) || 1) } : item
        ));
    };

    const removePrintItem = (id) => {
        setPrintItems(prev => prev.filter(item => item.id !== id));
        setSelectedForPrint(prev => prev.filter(pId => pId !== id));
    };

    const handlePrint = () => {
        // We will implement the actual print logic in the next step
        // For now, we'll open a new window with the print data
        const printData = JSON.stringify(printItems);
        window.open(route('products.labels.print', { items: printData }), '_blank');
    };

    const { data, setData, post, reset, errors, processing } = useForm({
        category_id: '',
        tax_id: defaultTaxId || '',
        tax_ids: defaultTaxId ? [defaultTaxId] : [],
        name: '',
        generic_name: '',
        brand_name: '',
        manufacturer: '',
        strength: '',
        barcode: '',
        description: '',
        min_stock_level: 10,
        discount_percentage: 0,
        tax_method: 'Exclusive',
        status: 'Active',
        image: null,
        product_units: [
            { unit_id: '', conversion_factor: 1, selling_price: 0, wholesale_price: 0, is_base_unit: true }
        ],
    });

    const handleOpen = () => {
        reset();
        if (defaultTaxId) {
            setData(prev => ({
                ...prev,
                tax_id: defaultTaxId,
                tax_ids: [defaultTaxId],
            }));
        }
        setOpen(true);
    };

    const handleAddUnit = () => {
        const newUnits = [...data.product_units, { unit_id: '', conversion_factor: 1, selling_price: 0, wholesale_price: 0, is_base_unit: false }];
        setData('product_units', newUnits);
    };

    const handleRemoveUnit = (index) => {
        if (data.product_units[index].is_base_unit) return;
        const newUnits = data.product_units.filter((_, i) => i !== index);
        setData('product_units', newUnits);
    };

    const handleUnitChange = (index, field, value) => {
        const newUnits = [...data.product_units];
        newUnits[index][field] = value;
        setData('product_units', newUnits);
    };

    const handleSetBaseUnit = (index) => {
        const newUnits = data.product_units.map((unit, i) => ({
            ...unit,
            is_base_unit: i === index
        }));
        setData('product_units', newUnits);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
    };

    const generateBarcode = () => {
        // Generate a random 12-digit numeric barcode (Internal standard)
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        setData('barcode', `200${timestamp}${random}`);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('products.store'), {
            forceFormData: true,
            onSuccess: () => handleClose(),
        });
    };

    const handleDelete = (product) => {
        if (confirm(`Are you sure you want to remove "${product.name}"?`)) {
            router.delete(route('products.destroy', product.id));
        }
    };

    return (
        <MainLayout
            auth={auth}
            header="Medicine Management"
        >
            <Head title="Medicines" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                        <TextField
                            placeholder="Search by name, brand, generic, or barcode..."
                            size="small"
                            fullWidth
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                            }}
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={selectedCategory}
                                label="Category"
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <MenuItem value="">All Categories</MenuItem>
                                {categories.map(cat => (
                                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={selectedStatus}
                                label="Status"
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <MenuItem value="">All Status</MenuItem>
                                <MenuItem value="Active">Active</MenuItem>
                                <MenuItem value="Inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>
                        <Stack direction="row" spacing={1}>
                            <Button 
                                variant="contained" 
                                size="small" 
                                onClick={handleSearch}
                                startIcon={<FilterIcon />}
                            >
                                Filter
                            </Button>
                            <Button 
                                variant="outlined" 
                                size="small" 
                                onClick={handleClearFilters}
                                color="inherit"
                                startIcon={<ClearIcon />}
                            >
                                Clear
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                MEDICINE INVENTORY
                            </Typography>
                            <Chip 
                                icon={<BarcodeIcon sx={{ fontSize: '14px !important' }} />}
                                label="Scanner Active" 
                                size="small" 
                                color="success" 
                                variant="outlined" 
                                sx={{ height: 20, fontSize: '10px' }} 
                            />
                            {selectedForPrint.length > 0 && (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    size="small"
                                    startIcon={<PrintIcon />}
                                    onClick={handleOpenPrintDialog}
                                    sx={{ height: 24, fontSize: '10px' }}
                                >
                                    Print Labels ({selectedForPrint.length})
                                </Button>
                            )}
                        </Stack>
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                            sx={{ height: 40, px: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Add New Medicine
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            size="small"
                                            indeterminate={selectedForPrint.length > 0 && selectedForPrint.length < products.data.length}
                                            checked={products.data.length > 0 && selectedForPrint.length === products.data.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedForPrint(products.data.map(p => p.id));
                                                } else {
                                                    setSelectedForPrint([]);
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Medicine Info</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Generic/Brand</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Manufacturer</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Tax</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Discount</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {products.data.map((product) => (
                                    <TableRow key={product.id} hover>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                checked={selectedForPrint.includes(product.id)}
                                                onChange={() => togglePrintSelection(product.id)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar 
                                                    src={product.image_path ? storageUrl(product.image_path) : null}
                                                    variant="rounded"
                                                    sx={{ width: 40, height: 40, bgcolor: 'primary.light' }}
                                                >
                                                    <ProductIcon fontSize="small" />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{product.name}</Typography>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <BarcodeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                                        <Typography variant="caption" color="text.secondary">{product.barcode || 'No Barcode'}</Typography>
                                                    </Stack>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={product.category?.name} size="small" variant="outlined" sx={{ fontSize: '10px', height: '20px' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>{product.generic_name || 'N/A'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{product.brand_name || 'N/A'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{product.manufacturer || 'N/A'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {(product.taxes || []).length > 0 ? (
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <Typography variant="caption">
                                                        {product.taxes[0].name} ({product.taxes[0].rate}%)
                                                    </Typography>
                                                    {(product.taxes || []).length > 1 && (
                                                        <Chip
                                                            size="small"
                                                            label={`+${product.taxes.length - 1}`}
                                                            variant="outlined"
                                                            sx={{ height: 18, fontSize: 10 }}
                                                        />
                                                    )}
                                                </Stack>
                                            ) : product.tax ? (
                                                <Typography variant="caption">{product.tax.name} ({product.tax.rate}%)</Typography>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">No Tax</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={`${Number(product.discount_percentage || 0).toFixed(2)}%`}
                                                size="small"
                                                color={Number(product.discount_percentage || 0) > 0 ? 'success' : 'default'}
                                                variant="outlined"
                                                sx={{ fontSize: '10px', height: '20px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={product.status} 
                                                size="small" 
                                                color={product.status === 'Active' ? 'success' : 'error'} 
                                                variant="outlined"
                                                sx={{ fontSize: '10px', height: '20px' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" color="primary" onClick={() => router.visit(route('products.edit', product.id))}>
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDelete(product)}>
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {products.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No medicines found. Click "Add New Medicine" to get started.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            {/* Add/Edit Product Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Add New Medicine
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers sx={{ p: 0 }}>
                        <Stack spacing={3} sx={{ p: 3 }}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1.5 }}>
                                    MEDICINE IDENTITY
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            md: '220px repeat(4, minmax(0, 1fr))',
                                        },
                                        gap: 2,
                                        alignItems: 'start',
                                    }}
                                >
                                    <Stack
                                        alignItems="center"
                                        spacing={1.5}
                                        sx={{
                                            gridColumn: { xs: '1', md: '1 / 2' },
                                            gridRow: { md: '1 / span 3' },
                                            height: '100%',
                                            p: 2,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Avatar
                                            src={data.image ? URL.createObjectURL(data.image) : null}
                                            variant="rounded"
                                            sx={{ width: 128, height: 128, border: '1px solid', borderColor: 'divider' }}
                                        >
                                            <ProductIcon sx={{ fontSize: 60 }} />
                                        </Avatar>
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            size="small"
                                            fullWidth
                                            startIcon={<PhotoCameraIcon />}
                                        >
                                            Upload Photo
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={(e) => setData('image', e.target.files[0])}
                                            />
                                        </Button>
                                        {errors.image && <Typography variant="caption" color="error">{errors.image}</Typography>}
                                    </Stack>
                                    <TextField
                                        label="Medicine Name"
                                        fullWidth
                                        size="small"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        error={!!errors.name}
                                        helperText={errors.name}
                                        required
                                        sx={{ gridColumn: { xs: '1', md: '2 / span 2' } }}
                                    />
                                    <FormControl
                                        fullWidth
                                        size="small"
                                        error={!!errors.category_id}
                                        required
                                        sx={{ gridColumn: { xs: '1', md: '4 / span 2' } }}
                                    >
                                        <InputLabel>Category</InputLabel>
                                        <Select
                                            value={data.category_id}
                                            label="Category"
                                            onChange={e => setData('category_id', e.target.value)}
                                        >
                                            {categories.map(cat => (
                                                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                            ))}
                                        </Select>
                                        {errors.category_id && <FormHelperText>{errors.category_id}</FormHelperText>}
                                    </FormControl>
                                    <TextField
                                        label="Generic Name"
                                        fullWidth
                                        size="small"
                                        value={data.generic_name}
                                        onChange={e => setData('generic_name', e.target.value)}
                                        error={!!errors.generic_name}
                                        helperText={errors.generic_name}
                                        sx={{ gridColumn: { xs: '1', md: '2 / span 1' } }}
                                    />
                                    <TextField
                                        label="Brand Name"
                                        fullWidth
                                        size="small"
                                        value={data.brand_name}
                                        onChange={e => setData('brand_name', e.target.value)}
                                        error={!!errors.brand_name}
                                        helperText={errors.brand_name}
                                        sx={{ gridColumn: { xs: '1', md: '3 / span 1' } }}
                                    />
                                    <TextField
                                        label="Manufacturer"
                                        fullWidth
                                        size="small"
                                        value={data.manufacturer}
                                        onChange={e => setData('manufacturer', e.target.value)}
                                        error={!!errors.manufacturer}
                                        helperText={errors.manufacturer}
                                        sx={{ gridColumn: { xs: '1', md: '4 / span 1' } }}
                                    />
                                    <TextField
                                        label="Strength (e.g. 500mg)"
                                        fullWidth
                                        size="small"
                                        value={data.strength}
                                        onChange={e => setData('strength', e.target.value)}
                                        error={!!errors.strength}
                                        helperText={errors.strength}
                                        sx={{ gridColumn: { xs: '1', md: '5 / span 1' } }}
                                    />
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="flex-start"
                                        sx={{ gridColumn: { xs: '1', md: '2 / span 4' } }}
                                    >
                                        <TextField
                                            label="Barcode / SKU"
                                            fullWidth
                                            size="small"
                                            autoFocus
                                            inputRef={barcodeInputRef}
                                            value={data.barcode}
                                            onChange={e => setData('barcode', e.target.value)}
                                            error={!!errors.barcode}
                                            helperText={errors.barcode}
                                        />
                                        <Tooltip title="Generate Internal Barcode">
                                            <IconButton
                                                size="small"
                                                sx={{ mt: 0.5, border: '1px solid', borderColor: 'divider' }}
                                                onClick={generateBarcode}
                                            >
                                                <BarcodeIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Box>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1.5 }}>
                                    TAX, STOCK & STATUS
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            sm: 'repeat(2, minmax(0, 1fr))',
                                            md: 'repeat(4, minmax(0, 1fr))',
                                            lg: 'repeat(5, minmax(0, 1fr))',
                                        },
                                        gap: 2,
                                    }}
                                >
                                    <FormControl fullWidth size="small" error={!!errors.tax_id || !!errors.tax_ids}>
                                        <InputLabel>Applied Taxes</InputLabel>
                                        <Select
                                            multiple
                                            value={data.tax_ids}
                                            label="Applied Taxes"
                                            onChange={(e) => {
                                                const selected = e.target.value;
                                                const selectedIds = Array.isArray(selected) ? selected : [];
                                                setData((prev) => ({
                                                    ...prev,
                                                    tax_ids: selectedIds,
                                                    tax_id: selectedIds[0] || '',
                                                }));
                                            }}
                                            renderValue={(selected) => {
                                                const selectedIds = Array.isArray(selected) ? selected : [];
                                                if (selectedIds.length === 0) return 'None';
                                                const names = taxes
                                                    .filter((t) => selectedIds.includes(t.id))
                                                    .map((t) => t.name);
                                                return names.join(', ');
                                            }}
                                        >
                                            {taxes.map((tax) => (
                                                <MenuItem key={tax.id} value={tax.id}>
                                                    <Checkbox size="small" checked={(data.tax_ids || []).includes(tax.id)} />
                                                    <ListItemText primary={`${tax.name} (${tax.rate}%)`} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {(errors.tax_id || errors.tax_ids) && (
                                            <FormHelperText>{errors.tax_ids || errors.tax_id}</FormHelperText>
                                        )}
                                    </FormControl>
                                    <FormControl fullWidth size="small" required>
                                        <InputLabel>Tax Method</InputLabel>
                                        <Select
                                            value={data.tax_method}
                                            label="Tax Method"
                                            onChange={e => setData('tax_method', e.target.value)}
                                        >
                                            <MenuItem value="Exclusive">Exclusive</MenuItem>
                                            <MenuItem value="Inclusive">Inclusive</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="Min Stock Level"
                                        fullWidth
                                        size="small"
                                        type="number"
                                        value={data.min_stock_level}
                                        onChange={e => setData('min_stock_level', e.target.value)}
                                        error={!!errors.min_stock_level}
                                        helperText={errors.min_stock_level}
                                    />
                                    <TextField
                                        label="Product Discount %"
                                        fullWidth
                                        size="small"
                                        type="number"
                                        value={data.discount_percentage}
                                        onChange={e => setData('discount_percentage', e.target.value)}
                                        error={!!errors.discount_percentage}
                                        helperText={errors.discount_percentage}
                                        inputProps={{ min: 0, max: 100, step: '0.01' }}
                                    />
                                    <FormControl fullWidth size="small" required>
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            value={data.status}
                                            label="Status"
                                            onChange={e => setData('status', e.target.value)}
                                        >
                                            <MenuItem value="Active">Active</MenuItem>
                                            <MenuItem value="Inactive">Inactive</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1.5 }}>
                                    NOTES
                                </Typography>
                                <TextField
                                    label="Description"
                                    fullWidth
                                    size="small"
                                    multiline
                                    rows={3}
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    error={!!errors.description}
                                    helperText={errors.description}
                                />
                            </Box>
                        </Stack>
                    </DialogContent>
                    
                    {/* Unit Conversion Section (Systematic Grid) */}
                    <Box sx={{ px: 3, pb: 3 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', letterSpacing: 0.5 }}>
                                UNIT CONVERSION & PRICING
                            </Typography>
                            <Button 
                                size="small" 
                                startIcon={<AddUnitIcon />} 
                                onClick={handleAddUnit}
                                variant="contained"
                                color="primary"
                            >
                                Add Unit
                            </Button>
                        </Box>

                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 1 }}>
                            <Table size="small" sx={{ minWidth: 820 }}>
                                <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', width: '22%' }}>Unit Type</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '22%' }}>Conversion Factor</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '18%' }}>Retail Price</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '18%' }}>Wholesale Price</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '20%' }} align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.product_units.map((unit, index) => (
                                        <TableRow 
                                            key={index} 
                                            sx={{ 
                                                bgcolor: unit.is_base_unit ? 'rgba(0, 150, 136, 0.04)' : 'inherit',
                                                '&:hover': { bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.02)' }
                                            }}
                                        >
                                            <TableCell sx={{ py: 1.5 }}>
                                                <FormControl fullWidth size="small" required>
                                                    <Select
                                                        value={unit.unit_id}
                                                        onChange={(e) => handleUnitChange(index, 'unit_id', e.target.value)}
                                                        displayEmpty
                                                    >
                                                        <MenuItem value="" disabled>Select Unit</MenuItem>
                                                        {units.map(u => (
                                                            <MenuItem key={u.id} value={u.id}>{u.name} ({u.short_name})</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    {!unit.is_base_unit && (
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                                            1 Unit =
                                                        </Typography>
                                                    )}
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        type="number"
                                                        value={unit.conversion_factor}
                                                        onChange={(e) => handleUnitChange(index, 'conversion_factor', e.target.value)}
                                                        disabled={unit.is_base_unit}
                                                        placeholder={unit.is_base_unit ? "1 (Base Unit)" : "Factor"}
                                                    />
                                                    {!unit.is_base_unit && (
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                                            Base
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    type="number"
                                                    value={unit.selling_price}
                                                    onChange={(e) => handleUnitChange(index, 'selling_price', e.target.value)}
                                                    InputProps={{
                                                        startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography>,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    type="number"
                                                    value={unit.wholesale_price}
                                                    onChange={(e) => handleUnitChange(index, 'wholesale_price', e.target.value)}
                                                    InputProps={{
                                                        startAdornment: <Typography variant="caption" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography>,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }} align="right">
                                                <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                                                    <Tooltip title={unit.is_base_unit ? "Current Base Unit" : "Set as Base Unit"}>
                                                        <Button 
                                                            size="small" 
                                                            variant={unit.is_base_unit ? "contained" : "outlined"}
                                                            color={unit.is_base_unit ? "success" : "primary"}
                                                            onClick={() => handleSetBaseUnit(index)}
                                                            sx={{ 
                                                                fontSize: '10px', 
                                                                minWidth: '85px',
                                                                height: '30px'
                                                            }}
                                                        >
                                                            {unit.is_base_unit ? "Base Unit" : "Set Base"}
                                                        </Button>
                                                    </Tooltip>
                                                    {!unit.is_base_unit && (
                                                        <IconButton 
                                                            size="small" 
                                                            color="error" 
                                                            onClick={() => handleRemoveUnit(index)}
                                                            sx={{ border: '1px solid', borderColor: 'error.light' }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {errors.product_units && (
                            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                                {errors.product_units}
                            </Typography>
                        )}
                    </Box>
                    
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} size="small">Cancel</Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            size="small" 
                            disabled={processing}
                        >
                            Add Medicine
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Print Labels Dialog */}
            <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Print Product Labels
                    <IconButton size="small" onClick={() => setPrintDialogOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" gutterBottom color="text.secondary">
                        Adjust the quantity of labels to print for each selected product.
                    </Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: 100 }} align="center">Quantity</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: 50 }} align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {printItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{item.barcode}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updatePrintQuantity(item.id, e.target.value)}
                                            inputProps={{ min: 1, style: { textAlign: 'center' } }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" color="error" onClick={() => removePrintItem(item.id)}>
                                            <DeleteIcon fontSize="inherit" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setPrintDialogOpen(false)} size="small">Cancel</Button>
                    <Button 
                        onClick={handlePrint}
                        variant="contained" 
                        size="small" 
                        startIcon={<PrintIcon />}
                        disabled={printItems.length === 0}
                    >
                        Generate Labels
                    </Button>
                </DialogActions>
            </Dialog>
        </MainLayout>
    );
}
