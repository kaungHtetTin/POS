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
    Medication as ProductIcon,
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

            <Box sx={{ maxWidth: 1180, mx: 'auto', p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <IconButton onClick={() => router.visit(route('products.index'))}>
                        <BackIcon />
                    </IconButton>
                    <Typography variant="h5" fontWeight={600}>Edit Medicine</Typography>
                </Stack>

                <Paper sx={{ p: 3 }}>
                    <form onSubmit={submit}>
                        <Stack spacing={3}>
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
                                            src={data.image ? URL.createObjectURL(data.image) : (product.image_path ? storageUrl(product.image_path) : null)}
                                            variant="rounded"
                                            sx={{ width: 128, height: 128, border: '1px solid', borderColor: 'divider' }}
                                        >
                                            <ProductIcon sx={{ fontSize: 60 }} />
                                        </Avatar>
                                        <Button variant="outlined" component="label" size="small" fullWidth startIcon={<PhotoCameraIcon />}>
                                            Change Photo
                                            <input type="file" hidden accept="image/*" onChange={(e) => setData('image', e.target.files[0])} />
                                        </Button>
                                        {errors.image && <Typography variant="caption" color="error">{errors.image}</Typography>}
                                    </Stack>

                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Medicine Name"
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
                                        <Select value={data.category_id} label="Category" onChange={e => setData('category_id', e.target.value)}>
                                            {categories.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
                                        </Select>
                                        {errors.category_id && <FormHelperText>{errors.category_id}</FormHelperText>}
                                    </FormControl>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Generic Name"
                                        value={data.generic_name}
                                        onChange={e => setData('generic_name', e.target.value)}
                                        error={!!errors.generic_name}
                                        helperText={errors.generic_name}
                                        sx={{ gridColumn: { xs: '1', md: '2 / span 1' } }}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Brand Name"
                                        value={data.brand_name}
                                        onChange={e => setData('brand_name', e.target.value)}
                                        error={!!errors.brand_name}
                                        helperText={errors.brand_name}
                                        sx={{ gridColumn: { xs: '1', md: '3 / span 1' } }}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Manufacturer"
                                        value={data.manufacturer}
                                        onChange={e => setData('manufacturer', e.target.value)}
                                        error={!!errors.manufacturer}
                                        helperText={errors.manufacturer}
                                        sx={{ gridColumn: { xs: '1', md: '4 / span 1' } }}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Strength"
                                        value={data.strength}
                                        onChange={e => setData('strength', e.target.value)}
                                        error={!!errors.strength}
                                        helperText={errors.strength}
                                        sx={{ gridColumn: { xs: '1', md: '5 / span 1' } }}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Barcode"
                                        value={data.barcode}
                                        onChange={e => setData('barcode', e.target.value)}
                                        error={!!errors.barcode}
                                        helperText={errors.barcode}
                                        InputProps={{ endAdornment: <IconButton size="small" onClick={generateBarcode}><BarcodeIcon /></IconButton> }}
                                        sx={{ gridColumn: { xs: '1', md: '2 / span 4' } }}
                                    />
                                </Box>
                            </Box>

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
                                        },
                                        gap: 2,
                                    }}
                                >
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
                                    <FormControl fullWidth size="small" required>
                                        <InputLabel>Tax Method</InputLabel>
                                        <Select value={data.tax_method} label="Tax Method" onChange={e => setData('tax_method', e.target.value)}>
                                            <MenuItem value="Exclusive">Exclusive</MenuItem>
                                            <MenuItem value="Inclusive">Inclusive</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Min Stock Level"
                                        type="number"
                                        value={data.min_stock_level}
                                        onChange={e => setData('min_stock_level', e.target.value)}
                                        error={!!errors.min_stock_level}
                                        helperText={errors.min_stock_level}
                                    />
                                    <FormControl fullWidth size="small" required>
                                        <InputLabel>Status</InputLabel>
                                        <Select value={data.status} label="Status" onChange={e => setData('status', e.target.value)}>
                                            <MenuItem value="Active">Active</MenuItem>
                                            <MenuItem value="Inactive">Inactive</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1.5 }}>
                                    NOTES
                                </Typography>
                                <TextField fullWidth multiline rows={3} label="Description" value={data.description} onChange={e => setData('description', e.target.value)} />
                            </Box>

                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                        UNITS & PRICING
                                    </Typography>
                                    <Button size="small" startIcon={<AddUnitIcon />} onClick={handleAddUnit}>Add Unit</Button>
                                </Stack>

                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Stack spacing={2}>
                                        {data.product_units.map((unit, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: {
                                                        xs: '1fr',
                                                        sm: 'minmax(180px, 1.5fr) repeat(2, minmax(120px, 1fr)) minmax(120px, auto) minmax(90px, auto)',
                                                    },
                                                    gap: 2,
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Unit</InputLabel>
                                                    <Select value={unit.unit_id} label="Unit" onChange={e => handleUnitChange(index, 'unit_id', e.target.value)}>
                                                        {units.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                                                    </Select>
                                                </FormControl>
                                                <TextField fullWidth size="small" label="Conversion" type="number" value={unit.conversion_factor} onChange={e => handleUnitChange(index, 'conversion_factor', e.target.value)} />
                                                <TextField fullWidth size="small" label="Selling Price" type="number" value={unit.selling_price} onChange={e => handleUnitChange(index, 'selling_price', e.target.value)} />
                                                <Button variant={unit.is_base_unit ? 'contained' : 'outlined'} size="small" onClick={() => handleSetBaseUnit(index)}>
                                                    {unit.is_base_unit ? 'Base' : 'Set Base'}
                                                </Button>
                                                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                                                    {!unit.is_base_unit && (
                                                        <Button color="error" size="small" onClick={() => handleRemoveUnit(index)}>Remove</Button>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Paper>
                                {errors.product_units && <Typography color="error" variant="caption">{errors.product_units}</Typography>}
                            </Box>
                        </Stack>

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
