import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, useForm } from '@/spa';
import { Alert, Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Download, UploadFile } from '@mui/icons-material';
import { AppBarBack } from '@/Components/AppBarPortal';

export default function SupplierImport({ auth }) {
    const form = useForm({ file: null });
    const errors = Object.values(form.errors).flat().filter(Boolean);

    return (
        <MainLayout auth={auth} header="Import Suppliers">
            <Head title="Import Suppliers" />
            <AppBarBack href={route('suppliers.index')} label="Back to Suppliers" />
            <Stack spacing={1.5} sx={{ maxWidth: 820, mx: 'auto' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="body2" color="text.secondary">Download the template, fill in your suppliers, and save as CSV UTF-8.</Typography>
                </Stack>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                        <Typography variant="h6" fontWeight={700}>1. Prepare your file</Typography>
                        <Button component="a" href={route('suppliers.import.template')} variant="outlined" startIcon={<Download />} sx={{ alignSelf: 'flex-start' }}>Download supplier template</Button>
                        <Typography variant="body2">Upload either the five-column supplier template or a suppliers.csv file created by Supplier Export. Keep its column names unchanged. Replace or delete the template example row.</Typography>
                        <Typography variant="body2" color="text.secondary">Name is required (up to 255 characters). Phone (20), email (255), address (500), and payment terms (500) are optional. Format phone numbers as text in Excel to preserve leading zeros.</Typography>
                        <Alert severity="info">An exported supplier with a matching Id is updated; other rows create suppliers. Outstanding balances and credit limits are preserved. Nonempty phone numbers and emails must remain unique. Names may repeat.</Alert>
                        <Typography variant="h6" fontWeight={700}>2. Upload and import</Typography>
                        <Typography variant="body2" color="text.secondary">Up to 10,000 suppliers per CSV, maximum 10 MB. Blank rows are skipped. If any row has an error, no suppliers are saved.</Typography>
                        <Box component="form" onSubmit={(event) => {
                            event.preventDefault();
                            form.post(route('suppliers.import.store'), { forceFormData: true, preserveScroll: true });
                        }}>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography component="label" htmlFor="supplier_csv" variant="body2" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>Supplier CSV file</Typography>
                                    <Box component="input" id="supplier_csv" type="file" accept=".csv,text/csv" disabled={form.processing}
                                        onChange={(event) => { form.setData('file', event.target.files?.[0] || null); form.clearErrors(); }}
                                        sx={{ maxWidth: '100%', fontSize: '0.875rem' }} />
                                </Box>
                                {errors.length > 0 && <Alert severity="error" sx={{ whiteSpace: 'pre-line', maxHeight: 320, overflow: 'auto' }}>{errors.join('\n')}</Alert>}
                                {form.processing && <Box role="status"><Typography variant="body2" sx={{ mb: 1 }}>Uploading and processing CSV...</Typography><LinearProgress /></Box>}
                                <Button type="submit" variant="contained" startIcon={<UploadFile />} disabled={form.processing || !form.data.file} sx={{ alignSelf: 'flex-start' }}>
                                    {form.processing ? 'Importing...' : 'Import suppliers'}
                                </Button>
                            </Stack>
                        </Box>
                    </Stack>
                </Paper>
            </Stack>
        </MainLayout>
    );
}
