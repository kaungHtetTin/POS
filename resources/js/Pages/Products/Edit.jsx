import React from 'react';
import { automaticPrice } from '@/Utils/automaticPricing';
import MainLayout from '@/Layouts/MainLayout';
import CategorySelect from '@/Components/CategorySelect';
import { AppBarBack } from '@/Components/AppBarPortal';
import { Head, useForm, router, usePage } from '@/spa';
import { compressImage } from '@/Utils/compressImage';
import {
    Alert,
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
    Radio,
    ToggleButton,
} from '@mui/material';
import {
    Save as SaveIcon,
    PhotoCamera as PhotoCameraIcon,
    QrCode as BarcodeIcon,
    AddCircleOutline as AddUnitIcon,
    Medication as ProductIcon,
} from '@mui/icons-material';

export default function ProductEdit({ auth, product = null, categories, taxes, units, default_tax_id: defaultTaxId = '', initial_barcode: initialBarcode = '', pricing_rules = [] }) {
    const isCreating = !product;
    const pricingRules = Object.fromEntries(pricing_rules.map((rule) => [rule.code, rule]));
    const medicine = product || {
        category_id: '',
        tax_id: defaultTaxId,
        taxes: [],
        generic_name: '',
        brand_name: '',
        name: '',
        manufacturer: '',
        strength: '',
        barcode: initialBarcode,
        description: '',
        min_stock_level: 10,
        discount_percentage: 0,
        tax_method: 'Exclusive',
        status: 'Active',
        image_path: null,
        product_units: [{ unit_id: '', unit_name: '', unit_short_name: '', conversion_factor: 1, selling_price: 0, wholesale_price: 0, is_base_unit: true, is_default_selling_unit: true }],
    };
    const { ziggy = {} } = usePage().props;
    const appBase = ziggy?.base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const storageUrl = (path) => withBase(`/storage/${String(path || '').replace(/^\/+/, '')}`);

    const { data, setData, post, errors, processing, setError, clearErrors } = useForm({
        pricing_base_cost: medicine.pricing_base_cost ?? '',
        pricing_version: medicine.pricing_version ?? 1,
        category_id: medicine.category_id,
        tax_id: (medicine.taxes?.[0]?.id) || medicine.tax_id || '',
        tax_ids: (medicine.taxes || []).map(t => t.id).length > 0
            ? (medicine.taxes || []).map(t => t.id)
            : (medicine.tax_id ? [medicine.tax_id] : []),
        generic_name: medicine.generic_name || '',
        brand_name: medicine.brand_name || medicine.name || '',
        manufacturer: medicine.manufacturer || '',
        strength: medicine.strength || '',
        barcode: medicine.barcode || '',
        description: medicine.description || '',
        min_stock_level: medicine.min_stock_level,
        discount_percentage: medicine.discount_percentage || 0,
        tax_method: medicine.tax_method,
        status: medicine.status,
        image: null,
        product_units: [...medicine.product_units]
            .sort((a, b) => Number(Boolean(b.is_base_unit)) - Number(Boolean(a.is_base_unit)))
            .map((pu, index) => ({
            unit_id: pu.unit_id,
            unit_name: pu.unit?.name || pu.unit_name || '',
            unit_short_name: pu.unit?.short_name || pu.unit_short_name || '',
            conversion_factor: pu.conversion_factor,
            selling_price: pu.selling_price,
            selling_price_mode: pu.selling_price_mode ?? (isCreating ? pricingRules.selling_price?.pricing_mode : 'manual') ?? 'manual',
            wholesale_price_mode: pu.wholesale_price_mode ?? (isCreating ? pricingRules.wholesale_price?.pricing_mode : 'manual') ?? 'manual',
            wholesale_price: pu.wholesale_price ?? pu.selling_price,
            is_base_unit: index === 0,
            is_default_selling_unit: pu.is_default_selling_unit === undefined
                ? index === 0
                : Boolean(pu.is_default_selling_unit),
        })),
    });

    const handleAddUnit = () => {
        setData('product_units', [...data.product_units, { unit_id: '', unit_name: '', unit_short_name: '', conversion_factor: 1, selling_price: 0, wholesale_price: 0, selling_price_mode: pricingRules.selling_price?.pricing_mode || 'manual', wholesale_price_mode: pricingRules.wholesale_price?.pricing_mode || 'manual', is_base_unit: false, is_default_selling_unit: false }]);
    };

    const handleRemoveUnit = (index) => {
        if (data.product_units[index].is_base_unit) return;
        const removedDefault = data.product_units[index].is_default_selling_unit;
        const newUnits = data.product_units.filter((_, i) => i !== index);
        if (removedDefault && newUnits.length > 0) newUnits[0].is_default_selling_unit = true;
        setData('product_units', newUnits);
    };

    const handleUnitChange = (index, field, value) => {
        if (index === 0 && field === 'conversion_factor') return;
        const newUnits = [...data.product_units];
        newUnits[index] = { ...newUnits[index], [field]: value };
        if (field === 'unit_name' || field === 'unit_short_name') newUnits[index].unit_id = '';
        setData('product_units', newUnits);
    };

    const handleSetDefaultSellingUnit = (index) => {
        const newUnits = data.product_units.map((unit, i) => ({ ...unit, is_default_selling_unit: i === index }));
        setData('product_units', newUnits);
    };

    const pricingCost = medicine.pricing_has_purchase ? medicine.pricing_buying_cost : data.pricing_base_cost;
    const unitGridColumns = 'minmax(132px, 1fr) 64px 52px 96px 82px 102px 82px 58px 76px 50px';
    const unitCellSx = {
        minWidth: 0,
        px: 0.25,
        py: 0.15,
        position: 'relative',
        borderRight: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        transition: 'background-color 120ms ease, box-shadow 120ms ease',
        '&:focus-within': {
            zIndex: 1,
            bgcolor: 'background.paper',
            boxShadow: (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`,
        },
        '&:has(.Mui-error)': {
            zIndex: 1,
            boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.error.main}`,
        },
        '&:has(.Mui-error):focus-within': {
            boxShadow: (theme) => `inset 0 0 0 2px ${theme.palette.error.main}`,
        },
        '&:last-of-type': { borderRight: 0 },
    };
    const unitInputSx = {
        width: '100%',
        minWidth: 0,
        '& .MuiInputBase-root': { height: 26, minHeight: '26px !important', borderRadius: 0, fontSize: 10.5 },
        '& .MuiInputBase-input': { px: 0.4, py: 0.15, fontWeight: 700 },
        '& .MuiSelect-select': { py: '3px', pr: '18px !important' },
        '& .MuiSelect-icon': { right: 1, fontSize: 17 },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
        '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
        '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
        '& .MuiInputBase-root.Mui-error .MuiOutlinedInput-notchedOutline': { borderWidth: 1, borderColor: 'error.main' },
        '& .MuiFormHelperText-root': { display: 'none' },
        '& input[type=number]': { MozAppearance: 'textfield' },
        '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', m: 0 },
    };
    const generateBarcode = () => {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        setData('barcode', `200${timestamp}${random}`);
    };

    const submit = (e) => {
        e.preventDefault();
        post(isCreating ? route('products.store') : route('products.update', medicine.id), {
            forceFormData: true,
            onSuccess: () => router.visit(route('products.index')),
            data,
        });
    };

    return (
        <MainLayout auth={auth} header={isCreating ? 'Add New Medicine' : 'Edit Medicine'}>
            <Head title={isCreating ? 'Add New Medicine' : `Edit ${medicine.name}`} />
            <AppBarBack href={route('products.index')} label="Back to Medicines" />

            <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
                <Paper
                    sx={{
                        p: { xs: 1.5, md: 1.25 },
                        '& .MuiInputBase-root:not(.MuiInputBase-multiline)': { minHeight: 36, fontSize: 12.5 },
                        '& .MuiInputLabel-root': { fontSize: 12 },
                        '& .MuiFormHelperText-root': { mt: 0.25, mx: 0.25, fontSize: 10, lineHeight: 1.15 },
                        '& .MuiButton-root': { minHeight: 32, fontSize: 11.5 },
                    }}
                >
                    <form onSubmit={submit}>
                        {errors.pricing && <Alert severity="error" sx={{ mb: 1, py: 0 }}>{errors.pricing}</Alert>}
                        <Stack spacing={1.5}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 'bold', color: 'primary.main', mb: 0.75 }}>
                                    MEDICINE IDENTITY
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            md: '160px repeat(4, minmax(0, 1fr))',
                                        },
                                        gap: 1,
                                        alignItems: 'start',
                                    }}
                                >
                                    <Stack
                                        alignItems="center"
                                        spacing={0.75}
                                        sx={{
                                            gridColumn: { xs: '1', md: '1 / 2' },
                                            gridRow: { md: '1 / span 3' },
                                            height: '100%',
                                            p: 1,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Avatar
                                            src={data.image ? URL.createObjectURL(data.image) : (medicine.image_path ? storageUrl(medicine.image_path) : null)}
                                            variant="rounded"
                                            sx={{ width: 92, height: 92, border: '1px solid', borderColor: 'divider' }}
                                        >
                                            <ProductIcon sx={{ fontSize: 42 }} />
                                        </Avatar>
                                        <Button variant="outlined" component="label" size="small" fullWidth startIcon={<PhotoCameraIcon />}>
                                            {isCreating ? 'Upload Photo' : 'Change Photo'}
                                            <input type="file" hidden accept="image/*" onChange={async (e) => {
                                                try { setData('image', await compressImage(e.target.files[0])); clearErrors('image'); }
                                                catch (error) { setError('image', error.message); }
                                            }} />
                                        </Button>
                                        {errors.image && <Typography variant="caption" color="error">{errors.image}</Typography>}
                                    </Stack>

                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Brand Name"
                                        value={data.brand_name}
                                        onChange={e => setData('brand_name', e.target.value)}
                                        error={!!errors.brand_name}
                                        helperText={errors.brand_name}
                                        required
                                        sx={{ gridColumn: { xs: '1', md: '2 / span 2' } }}
                                    />
                                    <CategorySelect
                                        categories={categories}
                                        value={data.category_id}
                                        onChange={(categoryId) => setData('category_id', categoryId)}
                                        error={errors.category_id}
                                        sx={{ gridColumn: { xs: '1', md: '4 / span 2' } }}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Chemical Name"
                                        value={data.generic_name}
                                        onChange={e => setData('generic_name', e.target.value)}
                                        error={!!errors.generic_name}
                                        helperText={errors.generic_name}
                                        required
                                        sx={{ gridColumn: { xs: '1', md: '2 / span 2' } }}
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
                                <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 'bold', color: 'primary.main', mb: 0.75 }}>
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
                                        gap: 1,
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
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Product Discount %"
                                        type="number"
                                        value={data.discount_percentage}
                                        onChange={e => setData('discount_percentage', e.target.value)}
                                        error={!!errors.discount_percentage}
                                        helperText={errors.discount_percentage}
                                        inputProps={{ min: 0, max: 100, step: '0.01' }}
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
                                <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 'bold', color: 'primary.main', mb: 0.75 }}>
                                    NOTES
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    maxRows={8}
                                    label="Description"
                                    value={data.description}
                                    onChange={(event) => setData('description', event.target.value)}
                                />
                            </Box>

                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                    <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 'bold', color: 'primary.main' }}>
                                        UNITS & PRICING
                                    </Typography>
                                    <Button size="small" startIcon={<AddUnitIcon />} onClick={handleAddUnit}>Add Unit</Button>
                                </Stack>

                                <Stack spacing={0.5} sx={{ mb: 1 }}>
                                    <TextField size="small" type="number" label="Starting buying cost per base unit" value={data.pricing_base_cost} onChange={(event) => setData('pricing_base_cost', event.target.value)} error={!!errors.pricing_base_cost} helperText={errors.pricing_base_cost || 'Used for automatic pricing until the first purchase. Leave blank if unknown.'} inputProps={{ min: 0, step: '0.000001' }} sx={{ maxWidth: 400 }} />
                                    <Typography variant="caption" color="text.secondary">Current pricing cost: {pricingCost || 'Not available'} per base unit. Purchase costs exclude free quantities. Automatic prices follow Settings ? Automatic Pricing.</Typography>
                                </Stack>
                                <Box
                                    sx={{
                                        overflowX: 'auto',
                                        pb: 0.5,
                                        scrollbarWidth: 'thin',
                                        '&::-webkit-scrollbar': { height: 7 },
                                        '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 4 },
                                    }}
                                >
                                    <Paper variant="outlined" sx={{ p: 0, minWidth: 900, overflow: 'hidden' }}>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: unitGridColumns, bgcolor: 'action.hover' }}>
                                            {['Unit name', 'Short', 'Factor', 'Selling mode', 'Selling price', 'Wholesale mode', 'Wholesale', 'Type', 'Default', ''].map((label) => (
                                                <Box
                                                    key={label || 'actions'}
                                                    sx={{
                                                        ...unitCellSx,
                                                        minHeight: 27,
                                                        py: 0,
                                                        fontSize: 9,
                                                        lineHeight: 1.05,
                                                        fontWeight: 800,
                                                        color: 'text.secondary',
                                                        textTransform: 'uppercase',
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                    {label}
                                                </Box>
                                            ))}
                                        </Box>
                                        {data.product_units.map((unit, index) => {
                                            const sellingAutomatic = unit.selling_price_mode === 'automatic';
                                            const wholesaleAutomatic = unit.wholesale_price_mode === 'automatic';
                                            const sellingCalculated = automaticPrice(pricingCost, pricingRules.selling_price || {}, String(unit.conversion_factor));
                                            const wholesaleCalculated = automaticPrice(pricingCost, pricingRules.wholesale_price || {}, String(unit.conversion_factor));

                                            return (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: unitGridColumns,
                                                        '&:last-of-type > *': { borderBottom: 0 },
                                                        '&:last-of-type > *:first-of-type': {
                                                            borderBottomLeftRadius: 1,
                                                            overflow: 'hidden',
                                                        },
                                                        '&:last-of-type > *:last-of-type': {
                                                            borderBottomRightRadius: 1,
                                                            overflow: 'hidden',
                                                        },
                                                    }}
                                                >
                                                    <Box sx={unitCellSx}>
                                                        <TextField
                                                            size="small"
                                                            placeholder="Unit name"
                                                            value={unit.unit_name}
                                                            onChange={(event) => handleUnitChange(index, 'unit_name', event.target.value)}
                                                            error={!!errors[`product_units.${index}.unit_name`]}
                                                            sx={unitInputSx}
                                                        />
                                                    </Box>
                                                    <Box sx={unitCellSx}>
                                                        <TextField
                                                            size="small"
                                                            placeholder="Short"
                                                            value={unit.unit_short_name}
                                                            onChange={(event) => handleUnitChange(index, 'unit_short_name', event.target.value)}
                                                            error={!!errors[`product_units.${index}.unit_short_name`]}
                                                            sx={unitInputSx}
                                                        />
                                                    </Box>
                                                    <Box sx={unitCellSx}>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={index === 0 ? 1 : unit.conversion_factor}
                                                            disabled={index === 0}
                                                            onChange={(event) => handleUnitChange(index, 'conversion_factor', event.target.value)}
                                                            error={!!errors[`product_units.${index}.conversion_factor`]}
                                                            inputProps={{ min: 1 }}
                                                            sx={unitInputSx}
                                                        />
                                                    </Box>
                                                    <Box sx={unitCellSx}>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            value={unit.selling_price_mode}
                                                            onChange={(event) => handleUnitChange(index, 'selling_price_mode', event.target.value)}
                                                            error={!!errors[`product_units.${index}.selling_price_mode`]}
                                                            sx={unitInputSx}
                                                        >
                                                            <MenuItem value="manual">Manual</MenuItem>
                                                            <MenuItem value="automatic" disabled={pricingRules.selling_price?.pricing_mode !== 'automatic'}>Automatic</MenuItem>
                                                        </TextField>
                                                    </Box>
                                                    <Box sx={unitCellSx}>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={sellingAutomatic ? (sellingCalculated ?? unit.selling_price) : unit.selling_price}
                                                            disabled={sellingAutomatic}
                                                            onChange={(event) => handleUnitChange(index, 'selling_price', event.target.value)}
                                                            error={!!errors[`product_units.${index}.selling_price`]}
                                                            inputProps={{ min: 0, step: '0.01' }}
                                                            sx={unitInputSx}
                                                        />
                                                    </Box>
                                                    <Box sx={unitCellSx}>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            value={unit.wholesale_price_mode}
                                                            onChange={(event) => handleUnitChange(index, 'wholesale_price_mode', event.target.value)}
                                                            error={!!errors[`product_units.${index}.wholesale_price_mode`]}
                                                            sx={unitInputSx}
                                                        >
                                                            <MenuItem value="manual">Manual</MenuItem>
                                                            <MenuItem value="automatic" disabled={pricingRules.wholesale_price?.pricing_mode !== 'automatic'}>Automatic</MenuItem>
                                                        </TextField>
                                                    </Box>
                                                    <Box sx={unitCellSx}>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={wholesaleAutomatic ? (wholesaleCalculated ?? unit.wholesale_price) : unit.wholesale_price}
                                                            disabled={wholesaleAutomatic}
                                                            onChange={(event) => handleUnitChange(index, 'wholesale_price', event.target.value)}
                                                            error={!!errors[`product_units.${index}.wholesale_price`]}
                                                            inputProps={{ min: 0, step: '0.01' }}
                                                            sx={unitInputSx}
                                                        />
                                                    </Box>
                                                    <Box sx={{ ...unitCellSx, justifyContent: 'center' }}>
                                                        <Typography variant="caption" sx={{ fontSize: 9, lineHeight: 1, fontWeight: 800, color: index === 0 ? 'primary.main' : 'text.secondary' }}>
                                                            {index === 0 ? 'Base' : 'Additional'}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ ...unitCellSx, justifyContent: 'center' }}>
                                                        <ToggleButton
                                                            value={index}
                                                            selected={unit.is_default_selling_unit}
                                                            size="small"
                                                            onClick={() => handleSetDefaultSellingUnit(index)}
                                                            aria-label={`Use row ${index + 1} as default selling unit`}
                                                            sx={{ width: '100%', height: 25, minHeight: '25px !important', px: 0.15, gap: 0.15, border: 0, borderRadius: 0, fontSize: 8.5, fontWeight: 800 }}
                                                        >
                                                            <Radio checked={unit.is_default_selling_unit} size="small" sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 15 } }} />
                                                            Selling
                                                        </ToggleButton>
                                                    </Box>
                                                    <Box sx={{ ...unitCellSx, justifyContent: 'center' }}>
                                                        {!unit.is_base_unit && (
                                                            <Button color="error" size="small" onClick={() => handleRemoveUnit(index)} sx={{ minWidth: 0, height: 25, minHeight: '25px !important', px: 0.15, fontSize: 8 }}>
                                                                Remove
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Paper>
                                </Box>
                                {errors.product_units && <Typography color="error" variant="caption">{errors.product_units}</Typography>}
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
                            <Button variant="outlined" onClick={() => router.visit(route('products.index'))}>Cancel</Button>
                            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={processing}>
                                {isCreating ? 'Create Medicine' : 'Save Changes'}
                            </Button>
                        </Stack>
                    </form>
                </Paper>
            </Box>
        </MainLayout>
    );
}
