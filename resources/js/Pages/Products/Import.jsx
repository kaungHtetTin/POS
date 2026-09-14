import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, useForm } from '@/spa';
import {
    Alert, Box, Button, Checkbox, Chip, FormControlLabel, LinearProgress,
    Paper, Stack, Typography, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { ArrowBack, Download, ExpandMore, UploadFile } from '@mui/icons-material';

function UploadForm({ form, field, label, routeName, children, disabled }) {
    const errors = Object.values(form.errors).flat().filter(Boolean);
    return (
        <Box component="form" onSubmit={(event) => {
            event.preventDefault();
            form.post(route(routeName), { forceFormData: true, preserveScroll: true });
        }}>
            <Stack spacing={2}>
                {children}
                <Box>
                    <Typography component="label" htmlFor={field} variant="body2" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>{label}</Typography>
                    <Box component="input" id={field} type="file" accept=".csv,text/csv" disabled={form.processing || disabled}
                        onChange={(event) => { form.setData(field, event.target.files?.[0] || null); form.clearErrors(); }}
                        sx={{ maxWidth: '100%', fontSize: '0.875rem' }} />
                </Box>
                {errors.length > 0 && <Alert severity="error" sx={{ whiteSpace: 'pre-line', maxHeight: 320, overflow: 'auto' }}>{errors.join('\n')}</Alert>}
                {form.processing && <Box role="status"><Typography variant="body2" sx={{ mb: 1 }}>Uploading and processing CSV…</Typography><LinearProgress /></Box>}
                <Button type="submit" variant="contained" startIcon={<UploadFile />} disabled={form.processing || disabled || !form.data[field]} sx={{ alignSelf: 'flex-start' }}>
                    {form.processing ? 'Importing…' : label}
                </Button>
            </Stack>
        </Box>
    );
}

export default function ProductImport({ auth, categories, taxes }) {
    const products = useForm({ file: null, create_missing_categories: true, create_missing_units: true });
    const prices = useForm({ unit_price_file: null, create_missing_units: true });
    return (
        <MainLayout auth={auth} header="Import Medicines">
            <Head title="Import Medicines" />
            <Stack spacing={2} sx={{ maxWidth: 1100, mx: 'auto' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Box><Typography variant="h5" fontWeight={700}>Import medicines, units and prices</Typography>
                        <Typography variant="body2" color="text.secondary">Download a template, edit it in Excel, then save as CSV UTF-8.</Typography></Box>
                    <Button startIcon={<ArrowBack />} onClick={() => router.visit(route('products.index'))} sx={{ flexShrink: 0 }}>Medicines</Button>
                </Stack>
                <Alert severity="info">Keep the column names unchanged. Format barcodes as text to preserve leading zeros. If any row fails validation, the entire import is rolled back.</Alert>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
                    <Paper variant="outlined" sx={{ p: 3 }}>
                        <Stack spacing={2}>
                            <Box><Chip label="New medicines" size="small" sx={{ mb: 1 }} /><Typography variant="h6" fontWeight={700}>Import products</Typography></Box>
                            <Typography variant="body2" color="text.secondary">One row creates one medicine with a base unit, starting buying cost, selling price and wholesale price. Type the unit name and short name in the CSV; new unit pairs are created automatically.</Typography>
                            <Button component="a" href={route('products.import.template')} variant="outlined" startIcon={<Download />} sx={{ alignSelf: 'flex-start' }}>Download product template</Button>
                            <Typography variant="body2" color="text.secondary">Generic name, brand name, category, base unit name/short name, buying cost and selling price are required. Buying cost is per base unit and supports up to six decimal places. A blank barcode is generated automatically. A blank wholesale price uses the selling price.</Typography>
                            <Typography variant="body2" color="text.secondary">Blank values default to minimum stock 10, expiry alert 90 days, discount 0%, Active status and Exclusive tax. Use active tax names separated by |; blank tax names use Tax Free. Replace or delete the example row.</Typography>
                            <Typography variant="caption" color="text.secondary">Up to 10,000 medicines · CSV up to 10 MB. The imported buying cost is used by automatic pricing until the first purchase. Stock quantities and batch expiry dates are managed through purchases/inventory.</Typography>
                            <UploadForm form={products} field="file" label="Import medicines" routeName="products.import.store" disabled={prices.processing}>
                                <Box>
                                    <FormControlLabel control={<Checkbox checked={products.data.create_missing_categories} disabled={products.processing} onChange={(event) => products.setData('create_missing_categories', event.target.checked)} />} label="Create missing categories" />
                                </Box>
                            </UploadForm>
                        </Stack>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 3 }}>
                        <Stack spacing={2}>
                            <Box><Chip label="Existing medicines" size="small" sx={{ mb: 1 }} /><Typography variant="h6" fontWeight={700}>Import units and prices</Typography></Box>
                            <Typography variant="body2" color="text.secondary">Download current units and prices, edit the prices or add rows for new units, then upload. Each row contains both selling and wholesale prices. Imported amounts switch those unit prices to Manual mode.</Typography>
                            <Button component="a" href={route('products.import.unit-prices.template')} variant="outlined" startIcon={<Download />} sx={{ alignSelf: 'flex-start' }}>Export unit and price template</Button>
                            <Typography variant="body2" color="text.secondary">Keep product_id unchanged; barcode and product_name are reference columns. For a new unit, copy the product ID into a new row and enter any unit name and short name. The pair is created automatically for that medicine.</Typography>
                            <Typography variant="body2" color="text.secondary">Conversion factors are whole numbers: tablet 1, strip 10, box 100, for example. Existing conversion factors and base-unit flags cannot change. Use yes/no for flags and nonnegative prices with up to two decimal places.</Typography>
                            <Typography variant="body2" color="text.secondary">You can upload only the rows you need to change. Omitted units stay unchanged. Keep exactly one base and one default selling unit per medicine; include both rows when switching the default.</Typography>
                            <Typography variant="caption" color="text.secondary">Up to 50,000 rows · CSV up to 20 MB. Existing units are updated in place; no units are deleted.</Typography>
                            <UploadForm form={prices} field="unit_price_file" label="Import units and prices" routeName="products.import.unit-prices.store" disabled={products.processing} />
                        </Stack>
                    </Paper>
                </Box>
                <Accordion variant="outlined" disableGutters>
                    <AccordionSummary expandIcon={<ExpandMore />}><Typography fontWeight={600}>Existing categories and active taxes</Typography></AccordionSummary>
                    <AccordionDetails><Stack spacing={1}>
                        <Typography variant="body2"><strong>Categories:</strong> {categories.map((item) => item.name).join(', ') || 'None'}</Typography>
                        <Typography variant="body2"><strong>Active taxes:</strong> {taxes.map((item) => item.name).join(', ') || 'None — configure an active tax before importing medicines.'}</Typography>
                    </Stack></AccordionDetails>
                </Accordion>
            </Stack>
        </MainLayout>
    );
}
