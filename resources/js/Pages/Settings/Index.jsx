import React, { useEffect, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm, usePage } from '@/spa';
import { Alert, Box, Button, Chip, FormControlLabel, Grid, MenuItem, Paper, Stack, Switch, TextField, Typography, useMediaQuery } from '@mui/material';
import Business from '@mui/icons-material/Business';
import Language from '@mui/icons-material/Language';
import PointOfSale from '@mui/icons-material/PointOfSale';
import ReceiptLong from '@mui/icons-material/ReceiptLong';
import QrCode2 from '@mui/icons-material/QrCode2';
import NotificationsActive from '@mui/icons-material/NotificationsActive';
import Palette from '@mui/icons-material/Palette';
import Save from '@mui/icons-material/Save';
import Undo from '@mui/icons-material/Undo';
import { compressImage } from '@/Utils/compressImage';

const sections = [
    ['business', 'Business Profile', 'Identity used across the application', Business],
    ['regional', 'Regional & Currency', 'Language, time and money formats', Language],
    ['pos', 'POS & Branch Devices', 'Workflow defaults and branch hardware', PointOfSale],
    ['receipts', 'Receipts & Invoices', 'Tax, numbering and receipt content', ReceiptLong],
    ['labels', 'Labels & Barcodes', 'Medicine label layout and content', QrCode2],
    ['alerts', 'Inventory Alerts', 'Expiry and low-stock behavior', NotificationsActive],
    ['appearance', 'Appearance', 'Organization accent color', Palette],
];

function SectionHeader({ title, description, scope }) {
    return <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
        <Box><Typography variant="h6" sx={{ fontWeight: 900 }}>{title}</Typography><Typography variant="body2" color="text.secondary">{description}</Typography></Box>
        <Chip size="small" variant="outlined" label={scope} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }} />
    </Stack>;
}

function Actions({ form, label, save }) {
    return <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1} sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        {form.recentlySuccessful && <Typography variant="caption" color="success.main">Saved successfully</Typography>}
        {form.isDirty && <Typography variant="caption" color="warning.main">Unsaved changes</Typography>}
        <Button size="small" variant="outlined" startIcon={<Undo />} disabled={!form.isDirty || form.processing} onClick={() => form.reset()}>Discard</Button>
        <Button size="small" variant="contained" startIcon={<Save />} disabled={!form.isDirty || form.processing} onClick={save}>{form.processing ? 'Saving…' : label}</Button>
    </Stack>;
}

function Toggle({ label, description, checked, onChange }) {
    return <Box sx={{ py: .55 }}><FormControlLabel control={<Switch size="small" checked={checked} onChange={onChange} />} label={<Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>} />{description && <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 5 }}>{description}</Typography>}</Box>;
}

function Group({ title, description, children }) {
    return <Box sx={{ '& + &': { mt: 2.5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' } }}><Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{title}</Typography>{description && <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>{description}</Typography>}{children}</Box>;
}

export default function Settings({ auth, pos_behavior = {}, branch_preferences = {}, active_branch, notifications = {}, localization = {}, invoice = {}, labels = {}, taxes = [] }) {
    const { translations = {}, ziggy = {} } = usePage().props;
    const __ = (key) => translations[key] || key;
    const mobile = useMediaQuery((theme) => theme.breakpoints.down('md'));
    const [section, setSection] = useState('business');
    const storageUrl = (path) => `${ziggy?.base || ''}/storage/${String(path || '').replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/');

    const business = useForm({ expiry_alert_days: notifications.expiry_alert_days ?? 90, low_stock_sound: !!branch_preferences.low_stock_sound, pharmacy_name: invoice.pharmacy_name ?? '', logo: null, theme_primary_color: localization.theme_primary_color ?? '#00796B' });
    const regional = useForm({ locale: localization.locale ?? 'en', date_format: localization.date_format ?? 'Y-m-d', time_format: localization.time_format ?? 'H:i:s', timezone: localization.timezone ?? 'UTC', currency_code: localization.currency_code ?? 'USD', currency_symbol: localization.currency_symbol ?? '$', theme_primary_color: localization.theme_primary_color ?? '#00796B', week_start: localization.week_start ?? 0 });
    const pos = useForm({ default_view: pos_behavior.default_view ?? 'table', default_payment_method: pos_behavior.default_payment_method ?? 'Cash', barcode_focus: pos_behavior.barcode_focus !== false, show_generic_first: !!pos_behavior.show_generic_first });
    const branch = useForm({ auto_print_receipt: !!branch_preferences.auto_print_receipt, receipt_width: Number(branch_preferences.receipt_width ?? 80), silent_print: !!branch_preferences.silent_print, silent_printer_name: branch_preferences.silent_printer_name ?? '', low_stock_sound: !!branch_preferences.low_stock_sound });
    const receipts = useForm({ pharmacy_name: invoice.pharmacy_name ?? '', logo: null, default_tax_id: invoice.default_tax_id ?? '', receipt_header: invoice.receipt_header ?? '', receipt_footer: invoice.receipt_footer ?? '', invoice_prefix: invoice.invoice_prefix ?? 'S', enable_tax: invoice.enable_tax ?? true });
    const label = useForm({ width: labels.width ?? 40, height: labels.height ?? 30, labels_per_row: labels.labels_per_row ?? 1, show_pharmacy_name: !!labels.show_pharmacy_name, show_product_name: !!labels.show_product_name, show_generic_name: !!labels.show_generic_name, show_price: !!labels.show_price, show_expiry: !!labels.show_expiry, show_batch: !!labels.show_batch, font_size: labels.font_size ?? 8, barcode_height: labels.barcode_height ?? 10, symbology: labels.symbology ?? 'CODE_128' });
    const alerts = useForm({ expiry_alert_days: notifications.expiry_alert_days ?? 90 });
    const appearance = useForm({ expiry_alert_days: notifications.expiry_alert_days ?? 90, low_stock_sound: !!branch_preferences.low_stock_sound, pharmacy_name: invoice.pharmacy_name ?? '', logo: null, theme_primary_color: localization.theme_primary_color ?? '#00796B' });
    const forms = { business, regional, pos, receipts, labels: label, alerts, appearance };
    const anyDirty = [business, regional, pos, branch, receipts, label, alerts, appearance].some((form) => form.isDirty);

    useEffect(() => {
        const warn = (event) => { if (anyDirty) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
    }, [anyDirty]);

    const changeSection = (next) => {
        const dirty = forms[section]?.isDirty || (section === 'pos' && branch.isDirty);
        if (next !== section && dirty && !window.confirm(__('Discard unsaved changes in this section?'))) return;
        if (next !== section && dirty) { forms[section]?.reset(); if (section === 'pos') branch.reset(); }
        setSection(next);
    };
    const fp = (form, name) => ({ size: 'small', fullWidth: true, value: form.data[name], onChange: (e) => form.setData(name, e.target.value), error: !!form.errors[name], helperText: form.errors[name] });
    const panel = (children) => <Paper sx={{ p: { xs: 1.5, md: 2 }, minWidth: 0 }}>{children}</Paper>;

    return <MainLayout auth={auth} header={__('System Settings')}><Head title={__('Settings')} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '230px minmax(0,1fr)' }, gap: 1.5, alignItems: 'start' }}>
            <Paper component="nav" aria-label={__('Settings sections')} sx={{ p: .75, position: { md: 'sticky' }, top: { md: 76 }, zIndex: 1 }}>
                {mobile ? <TextField select fullWidth size="small" label={__('Settings section')} value={section} onChange={(e) => changeSection(e.target.value)}>{sections.map(([id, name]) => <MenuItem key={id} value={id}>{__(name)}</MenuItem>)}</TextField> : sections.map(([id, name, description, Icon]) => {
                    const selected = section === id; const dirty = forms[id]?.isDirty || (id === 'pos' && branch.isDirty);
                    return <Button key={id} fullWidth onClick={() => changeSection(id)} sx={{ justifyContent: 'flex-start', textAlign: 'left', px: 1, py: .8, mb: .35, color: selected ? 'primary.main' : 'text.secondary', bgcolor: selected ? 'primary.soft' : 'transparent', '&:hover': { bgcolor: selected ? 'primary.soft' : 'action.hover' } }}><Icon sx={{ mr: 1, flexShrink: 0 }} /><Box sx={{ minWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 800 }}>{__(name)}{dirty ? ' •' : ''}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'normal', lineHeight: 1.2 }}>{__(description)}</Typography></Box></Button>;
                })}
            </Paper>
            <Box sx={{ minWidth: 0 }}>
                {section === 'business' && panel(<><SectionHeader title={__('Business Profile')} description={__('Identity displayed throughout the application and on printed documents.')} scope={__('Organization-wide')} /><Grid container spacing={1.5}><Grid item xs={12} sm={7}><TextField {...fp(business, 'pharmacy_name')} label={__('Pharmacy Name')} required /></Grid><Grid item xs={12} sm={5}><Button component="label" variant="outlined" size="small" fullWidth sx={{ minHeight: 40 }}>{business.data.logo?.name || __('Choose Logo')}<input hidden type="file" accept="image/*" onChange={async (e) => { try { business.setData('logo', await compressImage(e.target.files?.[0])); business.clearErrors('logo'); } catch (error) { business.setError('logo', error.message); } }} /></Button>{business.errors.logo && <Typography variant="caption" color="error">{business.errors.logo}</Typography>}</Grid>{invoice.logo_path && <Grid item xs={12}><Box component="img" src={storageUrl(invoice.logo_path)} alt={__('Current logo')} sx={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid', borderColor: 'divider', p: .5 }} /></Grid>}</Grid><Actions form={business} label={__('Save Business Profile')} save={() => business.post(route('settings.business-profile.update'))} /></>)}

                {section === 'regional' && panel(<><SectionHeader title={__('Regional & Currency')} description={__('Organization defaults for language, dates, time and monetary values.')} scope={__('Organization-wide')} /><Alert severity="info" sx={{ mb: 2 }}>{__('Saving the default language also switches your current session. URLs remain locale-independent.')}</Alert><Grid container spacing={1.5}><Grid item xs={12} sm={6}><TextField select {...fp(regional, 'locale')} label={__('Default Language')}><MenuItem value="en">English</MenuItem><MenuItem value="my">မြန်မာ</MenuItem></TextField></Grid><Grid item xs={12} sm={6}><TextField select {...fp(regional, 'timezone')} label={__('Timezone')}><MenuItem value="UTC">UTC</MenuItem><MenuItem value="Asia/Yangon">Asia/Yangon</MenuItem></TextField></Grid><Grid item xs={12} sm={6}><TextField select {...fp(regional, 'date_format')} label={__('Date Format')}><MenuItem value="Y-m-d">YYYY-MM-DD</MenuItem><MenuItem value="d/m/Y">DD/MM/YYYY</MenuItem><MenuItem value="m/d/Y">MM/DD/YYYY</MenuItem></TextField></Grid><Grid item xs={12} sm={6}><TextField select {...fp(regional, 'time_format')} label={__('Time Format')}><MenuItem value="H:i:s">24 hour</MenuItem><MenuItem value="h:i A">12 hour</MenuItem></TextField></Grid><Grid item xs={12} sm={4}><TextField {...fp(regional, 'currency_code')} label={__('Currency Code')} /></Grid><Grid item xs={12} sm={4}><TextField {...fp(regional, 'currency_symbol')} label={__('Currency Symbol')} /></Grid><Grid item xs={12} sm={4}><TextField select {...fp(regional, 'week_start')} onChange={(e) => regional.setData('week_start', Number(e.target.value))} label={__('Week Starts On')}><MenuItem value={0}>{__('Sunday')}</MenuItem><MenuItem value={1}>{__('Monday')}</MenuItem><MenuItem value={6}>{__('Saturday')}</MenuItem></TextField></Grid></Grid><Actions form={regional} label={__('Save Regional Settings')} save={() => regional.patch(route('settings.localization.update'))} /></>)}

                {section === 'pos' && <Stack spacing={1.5}>{panel(<><SectionHeader title={__('POS Defaults')} description={__('Starting behavior used in POS workflows.')} scope={__('Organization-wide')} /><Grid container spacing={1.5}><Grid item xs={12} sm={6}><TextField select {...fp(pos, 'default_view')} label={__('Default POS View')}><MenuItem value="table">{__('Table')}</MenuItem><MenuItem value="grid">{__('Grid')}</MenuItem></TextField></Grid><Grid item xs={12} sm={6}><TextField select {...fp(pos, 'default_payment_method')} label={__('Default Payment Method')}><MenuItem value="Cash">{__('Cash')}</MenuItem><MenuItem value="Card">{__('Card')}</MenuItem><MenuItem value="Mobile">{__('Mobile')}</MenuItem><MenuItem value="Wallet">{__('Wallet')}</MenuItem></TextField></Grid></Grid><Toggle label={__('Keep barcode input focused')} checked={pos.data.barcode_focus} onChange={(e) => pos.setData('barcode_focus', e.target.checked)} /><Toggle label={__('Show generic name first')} checked={pos.data.show_generic_first} onChange={(e) => pos.setData('show_generic_first', e.target.checked)} /><Actions form={pos} label={__('Save POS Defaults')} save={() => pos.patch(route('settings.pos-behavior.update'))} /></>)}
                    {panel(<><SectionHeader title={__('Branch Devices & Notifications')} description={__('Printing and sound behavior shared by every POS device at this branch.')} scope={`${__('Branch')}: ${active_branch?.name || __('Current branch')}`} /><Alert severity="info" sx={{ mb: 1.5 }}>{__('These values apply to the entire branch. Switching branches loads that branch’s settings.')}</Alert><Grid container spacing={1.5}><Grid item xs={12} sm={6}><TextField select {...fp(branch, 'receipt_width')} onChange={(e) => branch.setData('receipt_width', Number(e.target.value))} label={__('Receipt Width')}><MenuItem value={58}>58 mm</MenuItem><MenuItem value={80}>80 mm</MenuItem></TextField></Grid><Grid item xs={12} sm={6}><TextField {...fp(branch, 'silent_printer_name')} label={__('Printer Name')} disabled={!branch.data.silent_print} /></Grid></Grid><Toggle label={__('Automatically print receipts')} checked={branch.data.auto_print_receipt} onChange={(e) => branch.setData('auto_print_receipt', e.target.checked)} /><Toggle label={__('Use silent printing')} description={__('Requires printer integration on branch devices.')} checked={branch.data.silent_print} onChange={(e) => branch.setData('silent_print', e.target.checked)} /><Toggle label={__('Play low-stock alert sound')} checked={branch.data.low_stock_sound} onChange={(e) => branch.setData('low_stock_sound', e.target.checked)} /><Actions form={branch} label={__('Save Branch Settings')} save={() => branch.patch(route('settings.branch-preferences.update'))} /></>)}</Stack>}

                {section === 'receipts' && panel(<><SectionHeader title={__('Receipts & Invoices')} description={__('Configure tax defaults, invoice numbering and printed content.')} scope={__('Organization-wide')} /><Group title={__('Tax & Numbering')}><Grid container spacing={1.5}><Grid item xs={12} sm={6}><TextField {...fp(receipts, 'invoice_prefix')} label={__('Invoice Prefix')} /></Grid><Grid item xs={12} sm={6}><TextField select {...fp(receipts, 'default_tax_id')} label={__('Default Tax')}><MenuItem value="">{__('None')}</MenuItem>{taxes.map((tax) => <MenuItem key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</MenuItem>)}</TextField></Grid></Grid><Toggle label={__('Enable tax feature')} checked={receipts.data.enable_tax} onChange={(e) => receipts.setData('enable_tax', e.target.checked)} /></Group><Group title={__('Receipt Content')}><Grid container spacing={1.5}><Grid item xs={12}><TextField {...fp(receipts, 'receipt_header')} label={__('Receipt Header')} multiline minRows={2} /></Grid><Grid item xs={12}><TextField {...fp(receipts, 'receipt_footer')} label={__('Receipt Footer')} multiline minRows={2} /></Grid></Grid></Group><Actions form={receipts} label={__('Save Receipt Settings')} save={() => receipts.post(route('settings.invoice.update'))} /></>)}

                {section === 'labels' && panel(<><SectionHeader title={__('Labels & Barcodes')} description={__('Control medicine label size, barcode and visible product information.')} scope={__('Organization-wide')} /><Grid container spacing={1.5}>{['width','height','labels_per_row','font_size','barcode_height'].map((name) => <Grid item xs={6} sm={4} key={name}><TextField type="number" {...fp(label, name)} onChange={(e) => label.setData(name, Number(e.target.value))} label={__(name.replaceAll('_', ' '))} /></Grid>)}<Grid item xs={12} sm={4}><TextField select {...fp(label, 'symbology')} label={__('Barcode Type')}><MenuItem value="CODE_128">CODE 128</MenuItem><MenuItem value="EAN_13">EAN 13</MenuItem><MenuItem value="QR_CODE">QR Code</MenuItem></TextField></Grid></Grid><Group title={__('Visible Information')}><Grid container>{[['show_pharmacy_name','Pharmacy name'],['show_product_name','Product name'],['show_generic_name','Generic name'],['show_price','Price'],['show_expiry','Expiry date'],['show_batch','Batch number']].map(([name,text]) => <Grid item xs={12} sm={6} key={name}><Toggle label={__(text)} checked={label.data[name]} onChange={(e) => label.setData(name, e.target.checked)} /></Grid>)}</Grid></Group><Actions form={label} label={__('Save Label Settings')} save={() => label.patch(route('settings.labels.update'))} /></>)}

                {section === 'alerts' && panel(<><SectionHeader title={__('Inventory Alerts')} description={__('Define when staff are warned about expiring stock.')} scope={__('Organization-wide')} /><TextField type="number" {...fp(alerts, 'expiry_alert_days')} onChange={(e) => alerts.setData('expiry_alert_days', Number(e.target.value))} label={__('Expiry Alert Days')} sx={{ maxWidth: 360 }} /><Alert severity="info" sx={{ mt: 2 }}>{__('Low-stock sound is configured per branch under POS & Branch Devices.')}</Alert><Actions form={alerts} label={__('Save Inventory Alerts')} save={() => alerts.patch(route('settings.notifications.update'))} /></>)}

                {section === 'appearance' && panel(<><SectionHeader title={__('Appearance')} description={__('Set the organization accent color used throughout the application.')} scope={__('Organization-wide')} /><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}><TextField type="color" size="small" label={__('Accent Color')} value={appearance.data.theme_primary_color} onChange={(e) => appearance.setData('theme_primary_color', e.target.value.toUpperCase())} InputLabelProps={{ shrink: true }} sx={{ width: 120 }} /><TextField {...fp(appearance, 'theme_primary_color')} label={__('HEX Color')} sx={{ maxWidth: 260 }} /><Box sx={{ width: 44, height: 44, bgcolor: appearance.data.theme_primary_color, border: '1px solid', borderColor: 'divider' }} /></Stack><Actions form={appearance} label={__('Save Appearance')} save={() => appearance.patch(route('settings.appearance.update'))} /></>)}
            </Box>
        </Box>
    </MainLayout>;
}
