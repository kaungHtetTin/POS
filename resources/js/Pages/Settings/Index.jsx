import React, { useEffect } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import {
    Alert,
    Box,
    Button,
    Divider,
    FormControlLabel,
    Grid,
    MenuItem,
    Paper,
    Stack,
    Switch,
    TextField,
    Typography,
    Tab,
    Tabs,
} from '@mui/material';
import { 
    Save as SaveIcon,
    SettingsApplications as PosIcon,
    Notifications as NotificationsIcon,
    Language as LanguageIcon,
    Receipt as InvoiceIcon,
    QrCode as LabelIcon
} from '@mui/icons-material';

export default function Settings({ auth, pos_behavior: posBehavior = {}, notifications: notificationSettings = {}, localization: localizationSettings = {}, invoice: invoiceSettings = {}, labels: labelSettings = {}, taxes = [] }) {
    const { locale, translations = {}, ziggy = {} } = usePage().props;
    const __ = (key) => translations[key] || key;
    const appBase = ziggy?.base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const storageUrl = (path) => withBase(`/storage/${String(path || '').replace(/^\/+/, '')}`);
    const [tabValue, setTabValue] = React.useState(0);
    const [invoiceLogoPreview, setInvoiceLogoPreview] = React.useState(invoiceSettings.logo_path ? storageUrl(invoiceSettings.logo_path) : '');

    const posForm = useForm({
        default_view: posBehavior.default_view ?? 'table',
        default_payment_method: posBehavior.default_payment_method ?? 'Cash',
        auto_print_receipt: !!posBehavior.auto_print_receipt,
        barcode_focus: posBehavior.barcode_focus !== false,
        show_generic_first: !!posBehavior.show_generic_first,
        receipt_width: Number(posBehavior.receipt_width ?? 80),
        silent_print: !!posBehavior.silent_print,
        silent_printer_name: posBehavior.silent_printer_name ?? '',
    });

    const notificationForm = useForm({
        expiry_alert_days: notificationSettings.expiry_alert_days ?? 90,
        low_stock_sound: !!notificationSettings.low_stock_sound,
    });

    const localizationForm = useForm({
        locale: locale ?? localizationSettings.locale ?? 'en',
        date_format: localizationSettings.date_format ?? 'Y-m-d',
        time_format: localizationSettings.time_format ?? 'H:i:s',
        timezone: localizationSettings.timezone ?? 'UTC',
        currency_code: localizationSettings.currency_code ?? 'USD',
        currency_symbol: localizationSettings.currency_symbol ?? '$',
        week_start: localizationSettings.week_start ?? 0,
    });

    const invoiceForm = useForm({
        pharmacy_name: invoiceSettings.pharmacy_name ?? '',
        logo: null,
        default_tax_id: invoiceSettings.default_tax_id ?? '',
        receipt_header: invoiceSettings.receipt_header ?? '',
        receipt_footer: invoiceSettings.receipt_footer ?? '',
        invoice_prefix: invoiceSettings.invoice_prefix ?? 'S',
    });

    const labelForm = useForm({
        width: labelSettings.width ?? 40,
        height: labelSettings.height ?? 30,
        labels_per_row: labelSettings.labels_per_row ?? 1,
        show_pharmacy_name: !!labelSettings.show_pharmacy_name,
        show_product_name: !!labelSettings.show_product_name,
        show_generic_name: !!labelSettings.show_generic_name,
        show_price: !!labelSettings.show_price,
        show_expiry: !!labelSettings.show_expiry,
        show_batch: !!labelSettings.show_batch,
        font_size: labelSettings.font_size ?? 8,
        barcode_height: labelSettings.barcode_height ?? 10,
        symbology: labelSettings.symbology ?? 'CODE_128',
    });

    const LabelPreview = () => {
        const { data } = labelForm;
        const pharmacyName = invoiceSettings.pharmacy_name || __('Your Pharmacy');
        const currencySymbol = localizationSettings.currency_symbol || '$';

        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                mt: 2, 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider'
            }}>
                <Typography variant="caption" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>{__('LIVE PREVIEW')}</Typography>
                <Box sx={{ 
                    width: `${data.width * 3.78}px`, // mm to px conversion (approx)
                    height: `${data.height * 3.78}px`,
                    bgcolor: 'white',
                    boxShadow: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: '2mm',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textAlign: 'center',
                    border: '1px solid #ccc'
                }}>
                    {data.show_pharmacy_name && (
                        <Typography sx={{ fontSize: `${data.font_size - 2}pt`, fontWeight: 'bold', whiteSpace: 'nowrap', lineHeight: 1 }}>
                            {pharmacyName}
                        </Typography>
                    )}
                    {data.show_product_name && (
                        <Typography sx={{ fontSize: `${data.font_size}pt`, fontWeight: 'bold', lineHeight: 1.1, mt: 0.5 }}>
                            {__('Sample Medicine Name')}
                        </Typography>
                    )}
                    {data.show_generic_name && (
                        <Typography sx={{ fontSize: `${data.font_size - 1}pt`, fontStyle: 'italic', color: 'text.secondary', lineHeight: 1 }}>
                            Generic Name
                        </Typography>
                    )}
                    
                    {/* Mock Barcode */}
                    <Box sx={{ 
                        width: '80%', 
                        height: `${data.barcode_height * 3.78}px`, 
                        mt: 0.5, 
                        mb: 0.2,
                        display: 'flex',
                        gap: '1px',
                        alignItems: 'flex-end'
                    }}>
                        {[...Array(20)].map((_, i) => (
                            <Box key={i} sx={{ 
                                flex: 1, 
                                height: `${Math.random() * 20 + 80}%`, 
                                bgcolor: 'black',
                                width: i % 3 === 0 ? '2px' : '1px'
                            }} />
                        ))}
                    </Box>
                    <Typography sx={{ fontSize: '6pt', lineHeight: 1 }}>123456789012</Typography>

                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        width: '100%', 
                        mt: 0.5,
                        px: 0.5
                    }}>
                        {data.show_price && (
                            <Typography sx={{ fontSize: `${data.font_size - 1}pt`, fontWeight: 'bold' }}>
                                {currencySymbol}10.00
                            </Typography>
                        )}
                        {data.show_expiry && (
                            <Typography sx={{ fontSize: `${data.font_size - 2}pt` }}>
                                {__('Exp')}: 31/12/26
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                    {__('Approximate size')}: {data.width}mm x {data.height}mm
                </Typography>
            </Box>
        );
    };

    const InvoicePreview = () => {
        const currencySymbol = localizationSettings.currency_symbol || '$';
        const pharmacyName = invoiceForm.data.pharmacy_name || invoiceSettings.pharmacy_name || __('Your Pharmacy');
        const selectedTax = taxes.find((tax) => String(tax.id) === String(invoiceForm.data.default_tax_id));
        const taxRate = Number(selectedTax?.rate || 0);
        const subTotal = 12000;
        const taxAmount = (subTotal * taxRate) / 100;
        const grandTotal = subTotal + taxAmount;
        const invoiceNo = `${invoiceForm.data.invoice_prefix || 'S'}20260317-001`;

        return (
            <Box sx={{ mt: { xs: 2, md: 0 }, p: 2, bgcolor: 'grey.100', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary', display: 'block' }}>
                    {__('LIVE PREVIEW')}
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    {invoiceLogoPreview && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.75 }}>
                            <Box
                                component="img"
                                src={invoiceLogoPreview}
                                alt={__('Logo')}
                                sx={{ width: 56, height: 56, objectFit: 'contain' }}
                            />
                        </Box>
                    )}
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {pharmacyName}
                    </Typography>
                    {invoiceForm.data.receipt_header && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {invoiceForm.data.receipt_header}
                        </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">{__('Invoice Number')}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{invoiceNo}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">{__('Date')}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>2026-03-17</Typography>
                    </Stack>

                    <Divider sx={{ my: 1 }} />

                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">{__('Description')}</Typography>
                        <Typography variant="caption" color="text.secondary">{__('Qty')} x {__('Amount')}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{__('Sample Medicine Name')}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>1 x {currencySymbol}{subTotal.toFixed(2)}</Typography>
                    </Stack>

                    <Divider sx={{ my: 1 }} />

                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">{__('Subtotal')}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{currencySymbol}{subTotal.toFixed(2)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                            {__('Tax')}{selectedTax ? ` (${selectedTax.name} ${taxRate}%)` : ''}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{currencySymbol}{taxAmount.toFixed(2)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{__('Grand Total')}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{currencySymbol}{grandTotal.toFixed(2)}</Typography>
                    </Stack>

                    {invoiceForm.data.receipt_footer && (
                        <>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption" color="text.secondary">
                                {invoiceForm.data.receipt_footer}
                            </Typography>
                        </>
                    )}
                </Paper>
            </Box>
        );
    };

    useEffect(() => {
        posForm.setData({
            default_view: posBehavior.default_view ?? 'table',
            default_payment_method: posBehavior.default_payment_method ?? 'Cash',
            auto_print_receipt: !!posBehavior.auto_print_receipt,
            barcode_focus: posBehavior.barcode_focus !== false,
            show_generic_first: !!posBehavior.show_generic_first,
            receipt_width: Number(posBehavior.receipt_width ?? 80),
            silent_print: !!posBehavior.silent_print,
            silent_printer_name: posBehavior.silent_printer_name ?? '',
        });
    }, [posBehavior]);

    useEffect(() => {
        notificationForm.setData({
            expiry_alert_days: notificationSettings.expiry_alert_days ?? 90,
            low_stock_sound: !!notificationSettings.low_stock_sound,
        });
    }, [notificationSettings]);

    useEffect(() => {
        localizationForm.setData({
            locale: locale ?? localizationSettings.locale ?? 'en',
            date_format: localizationSettings.date_format ?? 'Y-m-d',
            time_format: localizationSettings.time_format ?? 'H:i:s',
            timezone: localizationSettings.timezone ?? 'UTC',
            currency_code: localizationSettings.currency_code ?? 'USD',
            currency_symbol: localizationSettings.currency_symbol ?? '$',
            week_start: localizationSettings.week_start ?? 0,
        });
    }, [localizationSettings, locale]);

    useEffect(() => {
        invoiceForm.setData({
            pharmacy_name: invoiceSettings.pharmacy_name ?? '',
            logo: null,
            default_tax_id: invoiceSettings.default_tax_id ?? '',
            receipt_header: invoiceSettings.receipt_header ?? '',
            receipt_footer: invoiceSettings.receipt_footer ?? '',
            invoice_prefix: invoiceSettings.invoice_prefix ?? 'S',
        });
    }, [invoiceSettings]);

    useEffect(() => {
        if (invoiceForm.data.logo instanceof File) {
            const objectUrl = URL.createObjectURL(invoiceForm.data.logo);
            setInvoiceLogoPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }

        setInvoiceLogoPreview(invoiceSettings.logo_path ? storageUrl(invoiceSettings.logo_path) : '');
    }, [invoiceForm.data.logo, invoiceSettings.logo_path, appBase]);

    useEffect(() => {
        labelForm.setData({
            width: labelSettings.width ?? 40,
            height: labelSettings.height ?? 30,
            labels_per_row: labelSettings.labels_per_row ?? 1,
            show_pharmacy_name: !!labelSettings.show_pharmacy_name,
            show_product_name: !!labelSettings.show_product_name,
            show_generic_name: !!labelSettings.show_generic_name,
            show_price: !!labelSettings.show_price,
            show_expiry: !!labelSettings.show_expiry,
            show_batch: !!labelSettings.show_batch,
            font_size: labelSettings.font_size ?? 8,
            barcode_height: labelSettings.barcode_height ?? 10,
            symbology: labelSettings.symbology ?? 'CODE_128',
        });
    }, [labelSettings]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <MainLayout auth={auth} header={__('System Settings')}>
            <Head title={__('Settings')} />

            <Box sx={{ maxWidth: 980 }}>
                <Paper sx={{ mb: 2 }}>
                    <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tab icon={<PosIcon fontSize="small" />} iconPosition="start" label={__('POS Behavior')} />
                        <Tab icon={<NotificationsIcon fontSize="small" />} iconPosition="start" label={__('Notifications')} />
                        <Tab icon={<LanguageIcon fontSize="small" />} iconPosition="start" label={__('Localization')} />
                        <Tab icon={<InvoiceIcon fontSize="small" />} iconPosition="start" label={__('Invoice & Receipt')} />
                        <Tab icon={<LabelIcon fontSize="small" />} iconPosition="start" label={__('Labels & Barcodes')} />
                    </Tabs>
                </Paper>

                {tabValue === 0 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {__('POS BEHAVIOR')}
                        </Typography>
                        <Divider sx={{ my: 1.5 }} />

                        <Box
                            component="form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                posForm.patch(route('settings.pos-behavior.update'));
                            }}
                        >
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={__('Default POS View')}
                                        value={posForm.data.default_view}
                                        onChange={(e) => posForm.setData('default_view', e.target.value)}
                                        error={!!posForm.errors.default_view}
                                        helperText={posForm.errors.default_view}
                                    >
                                        <MenuItem value="table">{__('Table')}</MenuItem>
                                        <MenuItem value="grid">{__('Grid')}</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={__('Default Payment Method')}
                                        value={posForm.data.default_payment_method}
                                        onChange={(e) => posForm.setData('default_payment_method', e.target.value)}
                                        error={!!posForm.errors.default_payment_method}
                                        helperText={posForm.errors.default_payment_method}
                                    >
                                        <MenuItem value="Cash">{__('Cash')}</MenuItem>
                                        <MenuItem value="Card">{__('Card')}</MenuItem>
                                        <MenuItem value="Mobile">{__('Mobile')}</MenuItem>
                                        <MenuItem value="Wallet">{__('Wallet')}</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={__('Receipt Width (mm)')}
                                        value={String(posForm.data.receipt_width)}
                                        onChange={(e) => posForm.setData('receipt_width', Number(e.target.value))}
                                        error={!!posForm.errors.receipt_width}
                                        helperText={posForm.errors.receipt_width}
                                    >
                                        <MenuItem value="80">{__('80 mm')}</MenuItem>
                                        <MenuItem value="58">{__('58 mm')}</MenuItem>
                                    </TextField>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Stack sx={{ height: '100%' }} justifyContent="center">
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={!!posForm.data.auto_print_receipt}
                                                    onChange={(e) => posForm.setData('auto_print_receipt', e.target.checked)}
                                                />
                                            }
                                            label={<Typography variant="body2">{__('Auto-print receipt after sale')}</Typography>}
                                        />
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Stack sx={{ height: '100%' }} justifyContent="center">
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={!!posForm.data.silent_print}
                                                    onChange={(e) => posForm.setData('silent_print', e.target.checked)}
                                                />
                                            }
                                            label={<Typography variant="body2">{__('Silent print via QZ Tray')}</Typography>}
                                        />
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                size="small"
                                                checked={!!posForm.data.barcode_focus}
                                                onChange={(e) => posForm.setData('barcode_focus', e.target.checked)}
                                            />
                                        }
                                        label={<Typography variant="body2">{__('Automatic barcode focus')}</Typography>}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                size="small"
                                                checked={!!posForm.data.show_generic_first}
                                                onChange={(e) => posForm.setData('show_generic_first', e.target.checked)}
                                            />
                                        }
                                        label={<Typography variant="body2">{__('Show generic name first')}</Typography>}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={__('QZ Tray Printer Name')}
                                        placeholder={__('Example: EPSON TM-T82X Receipt')}
                                        value={posForm.data.silent_printer_name}
                                        onChange={(e) => posForm.setData('silent_printer_name', e.target.value)}
                                        error={!!posForm.errors.silent_printer_name}
                                        helperText={posForm.errors.silent_printer_name || __('Exact Windows printer name used by QZ Tray for silent printing.')}
                                    />
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon />}
                                    disabled={posForm.processing}
                                >
                                    {posForm.processing ? __('Saving…') : __('Save POS Behavior')}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                )}

                {tabValue === 1 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {__('NOTIFICATION SETTINGS')}
                        </Typography>
                        <Divider sx={{ my: 1.5 }} />

                        <Box
                            component="form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                notificationForm.patch(route('settings.notifications.update'));
                            }}
                        >
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        label={__('Expiry Alert Threshold (Days)')}
                                        helperText={__('Show alerts for batches expiring within this many days.')}
                                        value={notificationForm.data.expiry_alert_days}
                                        onChange={(e) => notificationForm.setData('expiry_alert_days', e.target.value)}
                                        error={!!notificationForm.errors.expiry_alert_days}
                                        inputProps={{ min: 1, max: 365 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Stack sx={{ height: '100%' }} justifyContent="flex-start">
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={!!notificationForm.data.low_stock_sound}
                                                    onChange={(e) => notificationForm.setData('low_stock_sound', e.target.checked)}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="body2">{__('Sound Alerts')}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {__('Play a sound when low stock or expiry alerts are triggered.')}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Stack>
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 3 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon />}
                                    disabled={notificationForm.processing}
                                >
                                    {notificationForm.processing ? __('Saving…') : __('Save Notification Settings')}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                )}

                {tabValue === 2 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {__('LOCALIZATION & DISPLAY')}
                        </Typography>
                        <Divider sx={{ my: 1.5 }} />

                        <Box
                            component="form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                localizationForm.patch(route('settings.localization.update'));
                            }}
                        >
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={__('Language / Locale')}
                                        value={localizationForm.data.locale}
                                        onChange={(e) => localizationForm.setData('locale', e.target.value)}
                                        error={!!localizationForm.errors.locale}
                                        helperText={localizationForm.errors.locale}
                                    >
                                        <MenuItem value="en">{__('English')}</MenuItem>
                                        <MenuItem value="my">{__('Myanmar')}</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={__('Timezone')}
                                        value={localizationForm.data.timezone}
                                        onChange={(e) => localizationForm.setData('timezone', e.target.value)}
                                        error={!!localizationForm.errors.timezone}
                                        helperText={localizationForm.errors.timezone}
                                    >
                                        <MenuItem value="UTC">UTC</MenuItem>
                                        <MenuItem value="Asia/Yangon">Asia/Yangon</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={__('Date Format')}
                                        value={localizationForm.data.date_format}
                                        onChange={(e) => localizationForm.setData('date_format', e.target.value)}
                                        error={!!localizationForm.errors.date_format}
                                        helperText={localizationForm.errors.date_format}
                                    >
                                        <MenuItem value="Y-m-d">{__('YYYY-MM-DD (2026-03-11)')}</MenuItem>
                                        <MenuItem value="d/m/Y">{__('DD/MM/YYYY (11/03/2026)')}</MenuItem>
                                        <MenuItem value="m/d/Y">{__('MM/DD/YYYY (03/11/2026)')}</MenuItem>
                                        <MenuItem value="j M, Y">{__('D Mon, YYYY (11 Mar, 2026)')}</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={__('Time Format')}
                                        value={localizationForm.data.time_format}
                                        onChange={(e) => localizationForm.setData('time_format', e.target.value)}
                                        error={!!localizationForm.errors.time_format}
                                        helperText={localizationForm.errors.time_format}
                                    >
                                        <MenuItem value="H:i:s">{__('24-hour (14:30:05)')}</MenuItem>
                                        <MenuItem value="h:i:s A">{__('12-hour (02:30:05 PM)')}</MenuItem>
                                        <MenuItem value="H:i">{__('24-hour short (14:30)')}</MenuItem>
                                        <MenuItem value="h:i A">{__('12-hour short (02:30 PM)')}</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={__('Currency Code')}
                                        placeholder={__('e.g. USD, AED, SAR')}
                                        value={localizationForm.data.currency_code}
                                        onChange={(e) => localizationForm.setData('currency_code', e.target.value)}
                                        error={!!localizationForm.errors.currency_code}
                                        helperText={localizationForm.errors.currency_code}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={__('Currency Symbol')}
                                        placeholder={__('e.g. $, £, د.إ')}
                                        value={localizationForm.data.currency_symbol}
                                        onChange={(e) => localizationForm.setData('currency_symbol', e.target.value)}
                                        error={!!localizationForm.errors.currency_symbol}
                                        helperText={localizationForm.errors.currency_symbol}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={__('Week Starts On')}
                                        value={localizationForm.data.week_start}
                                        onChange={(e) => localizationForm.setData('week_start', Number(e.target.value))}
                                        error={!!localizationForm.errors.week_start}
                                        helperText={localizationForm.errors.week_start}
                                    >
                                        <MenuItem value={0}>{__('Sunday')}</MenuItem>
                                        <MenuItem value={1}>{__('Monday')}</MenuItem>
                                        <MenuItem value={6}>{__('Saturday')}</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 3 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon />}
                                    disabled={localizationForm.processing}
                                >
                                    {localizationForm.processing ? __('Saving…') : __('Save Localization Settings')}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                )}

                {tabValue === 3 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {__('INVOICE & RECEIPT SETTINGS')}
                        </Typography>
                        <Divider sx={{ my: 1.5 }} />

                        <Box
                            component="form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                invoiceForm.post(route('settings.invoice.update'));
                            }}
                        >
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={8}>
                                    <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={__('Pharmacy Store Name')}
                                        value={invoiceForm.data.pharmacy_name}
                                        onChange={(e) => invoiceForm.setData('pharmacy_name', e.target.value)}
                                        error={!!invoiceForm.errors.pharmacy_name}
                                        helperText={invoiceForm.errors.pharmacy_name || __('This name will appear on the receipt.')}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        {invoiceLogoPreview && (
                                            <Box
                                                component="img"
                                                src={invoiceLogoPreview}
                                                alt={__('Logo')}
                                                sx={{ width: 50, height: 50, objectFit: 'contain', border: '1px solid', borderColor: 'divider' }}
                                            />
                                        )}
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            size="small"
                                        >
                                            {__('Upload Logo')}
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={(e) => invoiceForm.setData('logo', e.target.files[0])}
                                            />
                                        </Button>
                                        {invoiceForm.data.logo && (
                                            <Typography variant="caption">
                                                {invoiceForm.data.logo.name}
                                            </Typography>
                                        )}
                                    </Stack>
                                    {invoiceForm.errors.logo && (
                                        <Typography variant="caption" color="error">
                                            {invoiceForm.errors.logo}
                                        </Typography>
                                    )}
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label={__('Default Tax for New Products')}
                                        value={invoiceForm.data.default_tax_id}
                                        onChange={(e) => invoiceForm.setData('default_tax_id', e.target.value)}
                                        error={!!invoiceForm.errors.default_tax_id}
                                        helperText={invoiceForm.errors.default_tax_id || __('This tax will be pre-selected when adding new medicines.')}
                                    >
                                        <MenuItem value="">{__('None')}</MenuItem>
                                        {taxes.map((tax) => (
                                            <MenuItem key={tax.id} value={tax.id}>
                                                {tax.name} ({tax.rate}%)
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={__('Invoice Number Prefix')}
                                        placeholder={__('e.g. S, INV, PH')}
                                        value={invoiceForm.data.invoice_prefix}
                                        onChange={(e) => invoiceForm.setData('invoice_prefix', e.target.value)}
                                        error={!!invoiceForm.errors.invoice_prefix}
                                        helperText={invoiceForm.errors.invoice_prefix || __('Prefix for generated invoice numbers (e.g. S20260311...)')}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        multiline
                                        rows={3}
                                        label={__('Receipt Header Text')}
                                        placeholder={__('e.g. Welcome to Our Pharmacy')}
                                        value={invoiceForm.data.receipt_header}
                                        onChange={(e) => invoiceForm.setData('receipt_header', e.target.value)}
                                        error={!!invoiceForm.errors.receipt_header}
                                        helperText={__('Appears at the very top of printed thermal receipts.')}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        multiline
                                        rows={3}
                                        label={__('Receipt Footer Text')}
                                        placeholder={__('e.g. Thank you for your visit! Medicines are non-returnable.')}
                                        value={invoiceForm.data.receipt_footer}
                                        onChange={(e) => invoiceForm.setData('receipt_footer', e.target.value)}
                                        error={!!invoiceForm.errors.receipt_footer}
                                        helperText={__('Appears at the very bottom of printed thermal receipts.')}
                                    />
                                </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <InvoicePreview />
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 3 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon />}
                                    disabled={invoiceForm.processing}
                                >
                                    {invoiceForm.processing ? __('Saving…') : __('Save Invoice Settings')}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                )}

                {tabValue === 4 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {__('LABELS & BARCODES')}
                        </Typography>
                        <Divider sx={{ my: 1.5 }} />

                        <Box
                            component="form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                labelForm.patch(route('settings.labels.update'));
                            }}
                        >
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={8}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <Typography variant="caption" color="primary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                                                {__('Paper Dimensions (mm)')}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label={__('Label Width (mm)')}
                                                value={labelForm.data.width}
                                                onChange={(e) => labelForm.setData('width', e.target.value)}
                                                error={!!labelForm.errors.width}
                                                helperText={labelForm.errors.width || __('e.g. 50')}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label={__('Label Height (mm)')}
                                                value={labelForm.data.height}
                                                onChange={(e) => labelForm.setData('height', e.target.value)}
                                                error={!!labelForm.errors.height}
                                                helperText={labelForm.errors.height || __('e.g. 30')}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label={__('Labels Per Row')}
                                                value={labelForm.data.labels_per_row}
                                                onChange={(e) => labelForm.setData('labels_per_row', e.target.value)}
                                                error={!!labelForm.errors.labels_per_row}
                                                helperText={labelForm.errors.labels_per_row || __('1 for roll, >1 for A4 sheets')}
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Divider />
                                            <Typography variant="caption" color="primary" sx={{ fontWeight: 700, textTransform: 'uppercase', mt: 2, display: 'block' }}>
                                                {__('Content & Style')}
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <Stack spacing={1}>
                                                <FormControlLabel
                                                    control={<Switch size="small" checked={labelForm.data.show_pharmacy_name} onChange={e => labelForm.setData('show_pharmacy_name', e.target.checked)} />}
                                                    label={<Typography variant="body2">{__('Show Pharmacy Name')}</Typography>}
                                                />
                                                <FormControlLabel
                                                    control={<Switch size="small" checked={labelForm.data.show_product_name} onChange={e => labelForm.setData('show_product_name', e.target.checked)} />}
                                                    label={<Typography variant="body2">{__('Show Product Name')}</Typography>}
                                                />
                                                <FormControlLabel
                                                    control={<Switch size="small" checked={labelForm.data.show_generic_name} onChange={e => labelForm.setData('show_generic_name', e.target.checked)} />}
                                                    label={<Typography variant="body2">{__('Show Generic Name')}</Typography>}
                                                />
                                            </Stack>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Stack spacing={1}>
                                                <FormControlLabel
                                                    control={<Switch size="small" checked={labelForm.data.show_price} onChange={e => labelForm.setData('show_price', e.target.checked)} />}
                                                    label={<Typography variant="body2">{__('Show Selling Price')}</Typography>}
                                                />
                                                <FormControlLabel
                                                    control={<Switch size="small" checked={labelForm.data.show_expiry} onChange={e => labelForm.setData('show_expiry', e.target.checked)} />}
                                                    label={<Typography variant="body2">{__('Show Expiry Date')}</Typography>}
                                                />
                                                <FormControlLabel
                                                    control={<Switch size="small" checked={labelForm.data.show_batch} onChange={e => labelForm.setData('show_batch', e.target.checked)} />}
                                                    label={<Typography variant="body2">{__('Show Batch Number')}</Typography>}
                                                />
                                            </Stack>
                                        </Grid>

                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label={__('Font Size (pt)')}
                                                value={labelForm.data.font_size}
                                                onChange={(e) => labelForm.setData('font_size', e.target.value)}
                                                error={!!labelForm.errors.font_size}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label={__('Barcode Height (mm)')}
                                                value={labelForm.data.barcode_height}
                                                onChange={(e) => labelForm.setData('barcode_height', e.target.value)}
                                                error={!!labelForm.errors.barcode_height}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                select
                                                fullWidth
                                                size="small"
                                                label={__('Barcode Type')}
                                                value={labelForm.data.symbology}
                                                onChange={(e) => labelForm.setData('symbology', e.target.value)}
                                                error={!!labelForm.errors.symbology}
                                            >
                                                <MenuItem value="CODE_128">{__('Code 128 (Standard)')}</MenuItem>
                                                <MenuItem value="EAN_13">{__('EAN-13 (Retail)')}</MenuItem>
                                                <MenuItem value="QR_CODE">{__('QR Code')}</MenuItem>
                                            </TextField>
                                        </Grid>
                                    </Grid>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <LabelPreview />
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 3 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon />}
                                    disabled={labelForm.processing}
                                >
                                    {labelForm.processing ? __('Saving…') : __('Save Label Settings')}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                )}
            </Box>
        </MainLayout>
    );
}
