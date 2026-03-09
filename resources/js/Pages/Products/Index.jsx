import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm, router } from '@inertiajs/react';
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
    Grid,
    Tooltip,
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
} from '@mui/icons-material';

export default function ProductIndex({ auth, products, categories, taxes, filters }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Scanner State
    const scanBuffer = useRef('');
    const lastScanTime = useRef(0);

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

    const processScan = (barcode) => {
        const existingProduct = products.find(p => p.barcode === barcode);
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

    const { data, setData, post, reset, errors, processing } = useForm({
        category_id: '',
        tax_id: '',
        name: '',
        generic_name: '',
        brand_name: '',
        manufacturer: '',
        strength: '',
        barcode: '',
        description: '',
        min_stock_level: 10,
        tax_method: 'Exclusive',
        status: 'Active',
        image: null,
    });

    const handleOpen = (product = null) => {
        if (product) {
            setEditMode(true);
            setEditingProduct(product);
            setData({
                category_id: product.category_id,
                tax_id: product.tax_id || '',
                name: product.name,
                generic_name: product.generic_name || '',
                brand_name: product.brand_name || '',
                manufacturer: product.manufacturer || '',
                strength: product.strength || '',
                barcode: product.barcode || '',
                description: product.description || '',
                min_stock_level: product.min_stock_level,
                tax_method: product.tax_method,
                status: product.status,
                image: null,
            });
        } else {
            setEditMode(false);
            setEditingProduct(null);
            reset();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditMode(false);
        setEditingProduct(null);
    };

    const generateBarcode = () => {
        // Generate a random 12-digit numeric barcode (Internal standard)
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        setData('barcode', `200${timestamp}${random}`);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editMode) {
            post(route('products.update', editingProduct.id), {
                forceFormData: true,
                onSuccess: () => handleClose(),
                data: {
                    ...data,
                    _method: 'POST' // Using POST with _method isn't strictly needed for POST routes, 
                                   // but good to keep in mind for multipart updates
                }
            });
        } else {
            post(route('products.store'), {
                onSuccess: () => handleClose(),
            });
        }
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
                        </Stack>
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                        >
                            Add New Medicine
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Medicine Info</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Generic/Brand</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Manufacturer</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Tax</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product.id} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar 
                                                    src={product.image_path ? `/storage/${product.image_path}` : null}
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
                                            {product.tax ? (
                                                <Typography variant="caption">{product.tax.name} ({product.tax.rate}%)</Typography>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">No Tax</Typography>
                                            )}
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
                                            <IconButton size="small" color="primary" onClick={() => handleOpen(product)}>
                                                <EditIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDelete(product)}>
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {products.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
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
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <form onSubmit={submit}>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editMode ? 'Edit Medicine' : 'Add New Medicine'}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            {/* Image Section */}
                            <Grid item xs={12} sm={3}>
                                <Stack alignItems="center" spacing={1.5}>
                                    <Avatar
                                        src={data.image ? URL.createObjectURL(data.image) : (editingProduct?.image_path ? `/storage/${editingProduct.image_path}` : null)}
                                        variant="rounded"
                                        sx={{ width: 120, height: 120, border: '1px solid', borderColor: 'divider' }}
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
                                        {editMode ? 'Change Photo' : 'Upload Photo'}
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/*"
                                            onChange={(e) => setData('image', e.target.files[0])}
                                        />
                                    </Button>
                                    {errors.image && <Typography variant="caption" color="error">{errors.image}</Typography>}
                                </Stack>
                            </Grid>

                            {/* Basic Info */}
                            <Grid item xs={12} sm={9}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Medicine Name"
                                            fullWidth
                                            size="small"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            error={!!errors.name}
                                            helperText={errors.name}
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth size="small" error={!!errors.category_id} required sx={{ minWidth: 180 }}>
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
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Generic Name"
                                            fullWidth
                                            size="small"
                                            value={data.generic_name}
                                            onChange={e => setData('generic_name', e.target.value)}
                                            error={!!errors.generic_name}
                                            helperText={errors.generic_name}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Brand Name"
                                            fullWidth
                                            size="small"
                                            value={data.brand_name}
                                            onChange={e => setData('brand_name', e.target.value)}
                                            error={!!errors.brand_name}
                                            helperText={errors.brand_name}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            {/* Additional Details Row 1 */}
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="Manufacturer"
                                    fullWidth
                                    size="small"
                                    value={data.manufacturer}
                                    onChange={e => setData('manufacturer', e.target.value)}
                                    error={!!errors.manufacturer}
                                    helperText={errors.manufacturer}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="Strength (e.g. 500mg)"
                                    fullWidth
                                    size="small"
                                    value={data.strength}
                                    onChange={e => setData('strength', e.target.value)}
                                    error={!!errors.strength}
                                    helperText={errors.strength}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <TextField
                                        label="Barcode / SKU"
                                        fullWidth
                                        size="small"
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
                            </Grid>

                            {/* Additional Details Row 2 */}
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small" error={!!errors.tax_id} sx={{ minWidth: 150 }}>
                                    <InputLabel>Applied Tax</InputLabel>
                                    <Select
                                        value={data.tax_id}
                                        label="Applied Tax"
                                        onChange={e => setData('tax_id', e.target.value)}
                                    >
                                        <MenuItem value="">None</MenuItem>
                                        {taxes.map(tax => (
                                            <MenuItem key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
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
                            </Grid>
                            <Grid item xs={12} sm={4}>
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
                            </Grid>

                            <Grid item xs={12} sm={4}>
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
                            </Grid>

                            <Grid item xs={12} sm={8}>
                                <TextField
                                    label="Description"
                                    fullWidth
                                    size="small"
                                    multiline
                                    rows={2}
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    error={!!errors.description}
                                    helperText={errors.description}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} size="small">Cancel</Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            size="small" 
                            disabled={processing}
                        >
                            {editMode ? 'Update Medicine' : 'Add Medicine'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </MainLayout>
    );
}
