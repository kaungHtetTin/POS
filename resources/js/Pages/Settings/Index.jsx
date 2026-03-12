import React, { useEffect } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm } from '@inertiajs/react';
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
    Receipt as InvoiceIcon
} from '@mui/icons-material';

export default function Settings({ auth, pos_behavior: posBehavior = {}, notifications: notificationSettings = {}, localization: localizationSettings = {}, invoice: invoiceSettings = {}, taxes = [] }) {
    const [tabValue, setTabValue] = React.useState(0);

    const posForm = useForm({
        default_view: posBehavior.default_view ?? 'table',
        default_payment_method: posBehavior.default_payment_method ?? 'Cash',
        auto_print_receipt: !!posBehavior.auto_print_receipt,
        barcode_focus: posBehavior.barcode_focus !== false,
        low_stock_sound: posBehavior.low_stock_sound !== false,
        show_generic_first: !!posBehavior.show_generic_first,
        receipt_width: Number(posBehavior.receipt_width ?? 80),
    });

    const notificationForm = useForm({
        expiry_alert_days: notificationSettings.expiry_alert_days ?? 90,
        low_stock_sound: !!notificationSettings.low_stock_sound,
    });

    const localizationForm = useForm({
        locale: localizationSettings.locale ?? 'en',
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

    useEffect(() => {
        posForm.setData({
            default_view: posBehavior.default_view ?? 'table',
            default_payment_method: posBehavior.default_payment_method ?? 'Cash',
            auto_print_receipt: !!posBehavior.auto_print_receipt,
            barcode_focus: posBehavior.barcode_focus !== false,
            low_stock_sound: posBehavior.low_stock_sound !== false,
            show_generic_first: !!posBehavior.show_generic_first,
            receipt_width: Number(posBehavior.receipt_width ?? 80),
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
            locale: localizationSettings.locale ?? 'en',
            date_format: localizationSettings.date_format ?? 'Y-m-d',
            time_format: localizationSettings.time_format ?? 'H:i:s',
            timezone: localizationSettings.timezone ?? 'UTC',
            currency_code: localizationSettings.currency_code ?? 'USD',
            currency_symbol: localizationSettings.currency_symbol ?? '$',
            week_start: localizationSettings.week_start ?? 0,
        });
    }, [localizationSettings]);

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

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <MainLayout auth={auth} header="System Settings">
            <Head title="Settings" />

            <Box sx={{ maxWidth: 980 }}>
                <Paper sx={{ mb: 2 }}>
                    <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tab icon={<PosIcon fontSize="small" />} iconPosition="start" label="POS Behavior" />
                        <Tab icon={<NotificationsIcon fontSize="small" />} iconPosition="start" label="Notifications" />
                        <Tab icon={<LanguageIcon fontSize="small" />} iconPosition="start" label="Localization" />
                        <Tab icon={<InvoiceIcon fontSize="small" />} iconPosition="start" label="Invoice & Receipt" />
                    </Tabs>
                </Paper>

                {tabValue === 0 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            POS BEHAVIOR
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
                                        label="Default POS View"
                                        value={posForm.data.default_view}
                                        onChange={(e) => posForm.setData('default_view', e.target.value)}
                                        error={!!posForm.errors.default_view}
                                        helperText={posForm.errors.default_view}
                                    >
                                        <MenuItem value="table">Table</MenuItem>
                                        <MenuItem value="grid">Grid</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label="Default Payment Method"
                                        value={posForm.data.default_payment_method}
                                        onChange={(e) => posForm.setData('default_payment_method', e.target.value)}
                                        error={!!posForm.errors.default_payment_method}
                                        helperText={posForm.errors.default_payment_method}
                                    >
                                        <MenuItem value="Cash">Cash</MenuItem>
                                        <MenuItem value="Card">Card</MenuItem>
                                        <MenuItem value="Mobile">Mobile</MenuItem>
                                        <MenuItem value="Wallet">Wallet</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label="Receipt Width (mm)"
                                        value={String(posForm.data.receipt_width)}
                                        onChange={(e) => posForm.setData('receipt_width', Number(e.target.value))}
                                        error={!!posForm.errors.receipt_width}
                                        helperText={posForm.errors.receipt_width}
                                    >
                                        <MenuItem value="80">80 mm</MenuItem>
                                        <MenuItem value="58">58 mm</MenuItem>
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
                                            label={<Typography variant="body2">Auto-print receipt after sale</Typography>}
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
                                        label={<Typography variant="body2">Automatic barcode focus</Typography>}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                size="small"
                                                checked={!!posForm.data.low_stock_sound}
                                                onChange={(e) => posForm.setData('low_stock_sound', e.target.checked)}
                                            />
                                        }
                                        label={<Typography variant="body2">Play low-stock alert sound</Typography>}
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
                                        label={<Typography variant="body2">Show generic name first</Typography>}
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
                                    {posForm.processing ? 'Saving…' : 'Save POS Behavior'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                )}

                {tabValue === 1 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            NOTIFICATION SETTINGS
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
                                        label="Expiry Alert Threshold (Days)"
                                        helperText="Show alerts for batches expiring within this many days."
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
                                                    <Typography variant="body2">Sound Alerts</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Play a sound when low stock or expiry alerts are triggered.
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
                                    {notificationForm.processing ? 'Saving…' : 'Save Notification Settings'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                )}

                {tabValue === 2 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            LOCALIZATION & DISPLAY
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
                                        label="Language / Locale"
                                        value={localizationForm.data.locale}
                                        onChange={(e) => localizationForm.setData('locale', e.target.value)}
                                        error={!!localizationForm.errors.locale}
                                        helperText={localizationForm.errors.locale}
                                    >
                                        <MenuItem value="en">English</MenuItem>
                                        <MenuItem value="ar">Arabic</MenuItem>
                                        <MenuItem value="fr">French</MenuItem>
                                        <MenuItem value="es">Spanish</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label="Timezone"
                                        value={localizationForm.data.timezone}
                                        onChange={(e) => localizationForm.setData('timezone', e.target.value)}
                                        error={!!localizationForm.errors.timezone}
                                        helperText={localizationForm.errors.timezone}
                                    >
                                        <MenuItem value="UTC">UTC</MenuItem>
                                        <MenuItem value="Asia/Dubai">Asia/Dubai</MenuItem>
                                        <MenuItem value="Asia/Riyadh">Asia/Riyadh</MenuItem>
                                        <MenuItem value="Europe/London">Europe/London</MenuItem>
                                        <MenuItem value="America/New_York">America/New_York</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label="Date Format"
                                        value={localizationForm.data.date_format}
                                        onChange={(e) => localizationForm.setData('date_format', e.target.value)}
                                        error={!!localizationForm.errors.date_format}
                                        helperText={localizationForm.errors.date_format}
                                    >
                                        <MenuItem value="Y-m-d">YYYY-MM-DD (2026-03-11)</MenuItem>
                                        <MenuItem value="d/m/Y">DD/MM/YYYY (11/03/2026)</MenuItem>
                                        <MenuItem value="m/d/Y">MM/DD/YYYY (03/11/2026)</MenuItem>
                                        <MenuItem value="j M, Y">D Mon, YYYY (11 Mar, 2026)</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        label="Time Format"
                                        value={localizationForm.data.time_format}
                                        onChange={(e) => localizationForm.setData('time_format', e.target.value)}
                                        error={!!localizationForm.errors.time_format}
                                        helperText={localizationForm.errors.time_format}
                                    >
                                        <MenuItem value="H:i:s">24-hour (14:30:05)</MenuItem>
                                        <MenuItem value="h:i:s A">12-hour (02:30:05 PM)</MenuItem>
                                        <MenuItem value="H:i">24-hour short (14:30)</MenuItem>
                                        <MenuItem value="h:i A">12-hour short (02:30 PM)</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Currency Code"
                                        placeholder="e.g. USD, AED, SAR"
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
                                        label="Currency Symbol"
                                        placeholder="e.g. $, £, د.إ"
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
                                        label="Week Starts On"
                                        value={localizationForm.data.week_start}
                                        onChange={(e) => localizationForm.setData('week_start', Number(e.target.value))}
                                        error={!!localizationForm.errors.week_start}
                                        helperText={localizationForm.errors.week_start}
                                    >
                                        <MenuItem value={0}>Sunday</MenuItem>
                                        <MenuItem value={1}>Monday</MenuItem>
                                        <MenuItem value={6}>Saturday</MenuItem>
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
                                    {localizationForm.processing ? 'Saving…' : 'Save Localization Settings'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                )}

                {tabValue === 3 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            INVOICE & RECEIPT SETTINGS
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
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Pharmacy Store Name"
                                        value={invoiceForm.data.pharmacy_name}
                                        onChange={(e) => invoiceForm.setData('pharmacy_name', e.target.value)}
                                        error={!!invoiceForm.errors.pharmacy_name}
                                        helperText={invoiceForm.errors.pharmacy_name || "This name will appear on the receipt."}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        {invoiceSettings.logo_path && (
                                            <Box
                                                component="img"
                                                src={`/storage/${invoiceSettings.logo_path}`}
                                                alt="Logo"
                                                sx={{ width: 50, height: 50, objectFit: 'contain', border: '1px solid', borderColor: 'divider' }}
                                            />
                                        )}
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            size="small"
                                        >
                                            Upload Logo
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
                                        label="Default Tax for New Products"
                                        value={invoiceForm.data.default_tax_id}
                                        onChange={(e) => invoiceForm.setData('default_tax_id', e.target.value)}
                                        error={!!invoiceForm.errors.default_tax_id}
                                        helperText={invoiceForm.errors.default_tax_id || "This tax will be pre-selected when adding new medicines."}
                                    >
                                        <MenuItem value="">None</MenuItem>
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
                                        label="Invoice Number Prefix"
                                        placeholder="e.g. S, INV, PH"
                                        value={invoiceForm.data.invoice_prefix}
                                        onChange={(e) => invoiceForm.setData('invoice_prefix', e.target.value)}
                                        error={!!invoiceForm.errors.invoice_prefix}
                                        helperText={invoiceForm.errors.invoice_prefix || "Prefix for generated invoice numbers (e.g. S20260311...)"}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        multiline
                                        rows={3}
                                        label="Receipt Header Text"
                                        placeholder="e.g. Welcome to Our Pharmacy"
                                        value={invoiceForm.data.receipt_header}
                                        onChange={(e) => invoiceForm.setData('receipt_header', e.target.value)}
                                        error={!!invoiceForm.errors.receipt_header}
                                        helperText="Appears at the very top of printed thermal receipts."
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        multiline
                                        rows={3}
                                        label="Receipt Footer Text"
                                        placeholder="e.g. Thank you for your visit! Medicines are non-returnable."
                                        value={invoiceForm.data.receipt_footer}
                                        onChange={(e) => invoiceForm.setData('receipt_footer', e.target.value)}
                                        error={!!invoiceForm.errors.receipt_footer}
                                        helperText="Appears at the very bottom of printed thermal receipts."
                                    />
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
                                    {invoiceForm.processing ? 'Saving…' : 'Save Invoice Settings'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                )}
            </Box>
        </MainLayout>
    );
}
