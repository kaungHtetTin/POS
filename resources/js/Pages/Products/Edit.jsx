import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Stack,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Avatar,
    Grid,
    Checkbox,
    ListItemText,
    FormHelperText,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Save as SaveIcon,
    PhotoCamera as PhotoCameraIcon,
    QrCode as BarcodeIcon,
    AddCircleOutline as AddUnitIcon,
} from '@mui/icons-material';

export default function ProductEdit({ auth, product, categories, taxes, units }) {
    const { ziggy = {} } = usePage().props;
    const appBase = ziggy?.base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const storageUrl = (path) => withBase(`/storage/${String(path || '').replace(/^\/+/, '')}`);

    const { data, setData, post, errors, processing } = useForm({
        category_id: product.category_id,
        tax_id: (product.taxes?.[0]?.id) || product.tax_id || '',
        tax_ids: (product.taxes || []).map(t => t.id).length > 0 
            ? (product.taxes || []).map(t => t.id) 
            : (product.tax_id ? [product.tax_id] : []),
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
        product_units: product.product_units.map(pu => ({
            unit_id: pu.unit_id,
            conversion_factor: pu.conversion_factor,
            selling_price: pu.selling_price,
            is_base_unit: Boolean(pu.is_base_unit)
        })),
    });

    const handleAddUnit = () => {
        setData('product_units', [...data.product_units, { unit_id: '', conversion_factor: 1, selling_price: 0, is_base_unit: false }]);
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
        const newUnits = data.product_units.map((unit, i) => ({ ...unit, is_base_unit: i === index }));
        setData('product_units', newUnits);
    };

    const generateBarcode = () => {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        setData('barcode', `200${timestamp}${random}`);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('products.update', product.id), {
            forceFormData: true,
            onSuccess: () => router.visit(route('products.index')),
            data: { ...data, _method: 'POST' },
        });
    };

    return (
        <MainLayout auth={auth} header="Edit Medicine">
            <Head title={`Edit ${product.name}`} />

            <Box sx={{ maxWidth: 1100, mx: 'auto', p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <IconButton onClick={() => router.visit(route('products.index'))}>
                        <BackIcon />
                    </IconButton>
                    <Typography variant="h5" fontWeight={600}>Edit Medicine</Typography>
                </Stack>

                <Paper sx={{ p: 3 }}>
                    <form onSubmit={submit}>
                        <Grid container spacing={3}>
                            {/* Image */}
                            <Grid item xs={12} sm={3}>
                                <Stack alignItems="center" spacing={1.5}>
                                    <Avatar
                                        src={data.image ? URL.createObjectURL(data.image) : (product.image_path ? storageUrl(product.image_path) : null)}
                                        variant="rounded"
                                        sx={{ width: 120, height: 120, border: '1px solid', borderColor: 'divider' }}
                                    />
                                    <Button variant="outlined" component="label" size="small" fullWidth startIcon={<PhotoCameraIcon />}>
                                        Change Photo
                                        <input type="file" hidden accept="image/*" onChange={(e) => setData('image', e.target.files[0])} />
                                    </Button>
                                    {errors.image && <Typography variant="caption" color="error">{errors.image}</Typography>}
                                </Stack>
                            </Grid>

                            {/* Basic fields */}
                            <Grid item xs={12} sm={9}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth size="small" label="Medicine Name" value={data.name} onChange={e => setData('name', e.target.value)} error={!!errors.name} helperText={errors.name} required />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth size="small" label="Generic Name" value={data.generic_name} onChange={e => setData('generic_name', e.target.value)} error={!!errors.generic_name} helperText={errors.generic_name} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth size="small" label="Brand Name" value={data.brand_name} onChange={e => setData('brand_name', e.target.value)} error={!!errors.brand_name} helperText={errors.brand_name} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth size="small" label="Manufacturer" value={data.manufacturer} onChange={e => setData('manufacturer', e.target.value)} error={!!errors.manufacturer} helperText={errors.manufacturer} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth size="small" label="Strength" value={data.strength} onChange={e => setData('strength', e.target.value)} error={!!errors.strength} helperText={errors.strength} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth size="small" label="Barcode" value={data.barcode} onChange={e => setData('barcode', e.target.value)} error={!!errors.barcode} helperText={errors.barcode}
                                            InputProps={{ endAdornment: <IconButton size="small" onClick={generateBarcode}><BarcodeIcon /></IconButton> }} />
                                    </Grid>
                                </Grid>
                            </Grid>

                            {/* Category + Taxes */}
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small" required>
                                    <InputLabel>Category</InputLabel>
                                    <Select value={data.category_id} label="Category" onChange={e => setData('category_id', e.target.value)}>
                                        {categories.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small" error={!!errors.tax_ids}>
                                    <InputLabel>Applied Taxes</InputLabel>
                                    <Select
                                        multiple
                                        value={data.tax_ids}
                                        label="Applied Taxes"
                                        onChange={(e) => {
                                            const selectedIds = Array.isArray(e.target.value) ? e.target.value : [];
                                            setData(prev => ({ ...prev, tax_ids: selectedIds, tax_id: selectedIds[0] || '' }));
                                        }}
                                        renderValue={(selected) => {
                                            const names = taxes.filter(t => selected.includes(t.id)).map(t => t.name);
                                            return names.length ? names.join(', ') : 'None';
                                        }}
                                    >
                                        {taxes.map(tax => (
                                            <MenuItem key={tax.id} value={tax.id}>
                                                <Checkbox size="small" checked={data.tax_ids.includes(tax.id)} />
                                                <ListItemText primary={`${tax.name} (${tax.rate}%)`} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {errors.tax_ids && <FormHelperText>{errors.tax_ids}</FormHelperText>}
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small" required>
                                    <InputLabel>Tax Method</InputLabel>
                                    <Select value={data.tax_method} label="Tax Method" onChange={e => setData('tax_method', e.target.value)}>
                                        <MenuItem value="Exclusive">Exclusive</MenuItem>
                                        <MenuItem value="Inclusive">Inclusive</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Product Units */}
                            <Grid item xs={12}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2">Units & Pricing</Typography>
                                    <Button size="small" startIcon={<AddUnitIcon />} onClick={handleAddUnit}>Add Unit</Button>
                                </Stack>

                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    {data.product_units.map((unit, index) => (
                                        <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                                            <Grid item xs={12} sm={3}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Unit</InputLabel>
                                                    <Select value={unit.unit_id} onChange={e => handleUnitChange(index, 'unit_id', e.target.value)}>
                                                        {units.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={6} sm={2}>
                                                <TextField fullWidth size="small" label="Conversion" type="number" value={unit.conversion_factor} onChange={e => handleUnitChange(index, 'conversion_factor', e.target.value)} />
                                            </Grid>
                                            <Grid item xs={6} sm={2}>
                                                <TextField fullWidth size="small" label="Selling Price" type="number" value={unit.selling_price} onChange={e => handleUnitChange(index, 'selling_price', e.target.value)} />
                                            </Grid>
                                            <Grid item xs={6} sm={2}>
                                                <Button variant={unit.is_base_unit ? 'contained' : 'outlined'} size="small" onClick={() => handleSetBaseUnit(index)}>
                                                    {unit.is_base_unit ? 'Base' : 'Set Base'}
                                                </Button>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                {!unit.is_base_unit && (
                                                    <Button color="error" size="small" onClick={() => handleRemoveUnit(index)}>Remove</Button>
                                                )}
                                            </Grid>
                                        </Grid>
                                    ))}
                                </Paper>
                                {errors.product_units && <Typography color="error" variant="caption">{errors.product_units}</Typography>}
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth size="small" label="Min Stock Level" type="number" value={data.min_stock_level} onChange={e => setData('min_stock_level', e.target.value)} error={!!errors.min_stock_level} helperText={errors.min_stock_level} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small" required>
                                    <InputLabel>Status</InputLabel>
                                    <Select value={data.status} label="Status" onChange={e => setData('status', e.target.value)}>
                                        <MenuItem value="Active">Active</MenuItem>
                                        <MenuItem value="Inactive">Inactive</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField fullWidth multiline rows={3} label="Description" value={data.description} onChange={e => setData('description', e.target.value)} />
                            </Grid>
                        </Grid>

                        <Stack direction="row" spacing={2} sx={{ mt: 4 }} justifyContent="flex-end">
                            <Button variant="outlined" onClick={() => router.visit(route('products.index'))}>Cancel</Button>
                            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={processing}>
                                Save Changes
                            </Button>
                        </Stack>
                    </form>
                </Paper>
            </Box>
        </MainLayout>
    );
}