import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { AppBarBack } from '@/Components/AppBarPortal';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import DataTableFooter from '@/Components/DataTableFooter';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, router } from '@/spa';
import { Alert, Autocomplete, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';

export default function StockMovements({ auth, movements, branches, products, types, filters, timezone = 'UTC' }) {
    const empty = { search: '', branch_id: '', product_id: '', type: '', date_from: '', date_to: '' };
    const [draft, setDraft] = useState({ ...empty, ...filters });
    const setFilter = (name, value) => setDraft(current => ({ ...current, [name]: value }));
    const visit = (values) => router.get(route('inventory.movements.index'), values, { preserveState: true, replace: true });
    const reset = () => {
        setDraft(empty);
        visit({});
    };
    const backBranch = filters.branch_id ? { branch_id: filters.branch_id } : {};
    const backUrl = filters.product_id
        ? route('inventory.show', { product: filters.product_id, ...backBranch })
        : route('inventory.index', backBranch);
    const exportColumns = [
        { key: 'created_at', label: `Recorded at (${timezone})`, value: row => new Date(row.created_at).toLocaleString(undefined, { timeZone: timezone }) },
        { key: 'product_name', label: 'Product' }, { key: 'branch_name', label: 'Branch' },
        { key: 'type', label: 'Action' }, { key: 'reference', label: 'Reference' }, { key: 'batch_number', label: 'Batch' },
        { key: 'quantity', label: 'In', value: row => Math.max(0, row.quantity) },
        { key: 'quantity', label: 'Out', value: row => Math.max(0, -row.quantity) },
        { key: 'balance_before', label: 'Before' }, { key: 'balance_after', label: 'After' },
        { key: 'user_name', label: 'Performed by' }, { key: 'notes', label: 'Notes' },
    ];

    return (
        <MainLayout auth={auth} header="Stock Movement History">
            <Head title="Stock Movement History" />
            <AppBarBack href={backUrl} label="Back to Inventory" />
            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">Stock Movement History</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {movements.total} movements · Quantities and balances are in base units, per product and branch. Times: {timezone}.
                    </Typography>
                    <ReportFilterToolbar ariaLabel="Stock movement filters"
                        fieldKinds={['search', 'wide', 'select', 'select', 'date', 'date']}
                        onSubmit={() => visit(draft)}
                        actions={<><Button type="submit" variant="contained">Apply</Button><Button variant="outlined" onClick={reset}>Reset</Button><CsvExportButton source={movements} dataKey="movements" columns={exportColumns} filename="stock-movements.csv" /></>}
                    >
                        <TextField size="small" label="Search" placeholder="Product, reference or batch" value={draft.search} onChange={e => setFilter('search', e.target.value)} />
                        <Autocomplete size="small" options={products} value={products.find(product => product.id === draft.product_id) || null}
                            getOptionLabel={product => product.name} getOptionKey={product => product.id}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            onChange={(_, product) => setFilter('product_id', product?.id || '')}
                            renderInput={params => <TextField {...params} label="Product" placeholder="All products" />} />
                        <TextField select size="small" label="Branch" value={draft.branch_id} onChange={e => setFilter('branch_id', e.target.value)}>
                            <MenuItem value="">All branches</MenuItem>
                            {branches.map(branch => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Action" value={draft.type} onChange={e => setFilter('type', e.target.value)}>
                            <MenuItem value="">All actions</MenuItem>
                            {types.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                        </TextField>
                        <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={draft.date_from} onChange={e => setFilter('date_from', e.target.value)} />
                        <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={draft.date_to} onChange={e => setFilter('date_to', e.target.value)} />
                    </ReportFilterToolbar>
                    <Alert severity="info" sx={{ my: 1.5 }}>Opening balances mark when tracking started. Earlier movements are not reconstructed. Only actions that change stock appear here.</Alert>
                    <TableContainer>
                        <Table size="small" sx={{ minWidth: 1100 }}>
                            <TableHead><TableRow>
                                {['Recorded at', 'Product', 'Branch', 'Action', 'Reference', 'Batch', 'In', 'Out', 'Before', 'After', 'Performed by', 'Notes'].map(label => (
                                    <TableCell key={label} align={['In', 'Out', 'Before', 'After'].includes(label) ? 'right' : 'left'} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</TableCell>
                                ))}
                            </TableRow></TableHead>
                            <TableBody>
                                {movements.data.map(movement => <TableRow key={movement.id} hover>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(movement.created_at).toLocaleString(undefined, { timeZone: timezone })}</TableCell>
                                    <TableCell>{movement.product_name}</TableCell><TableCell>{movement.branch_name}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{movement.type}</TableCell><TableCell>{movement.reference || '—'}</TableCell>
                                    <TableCell>{movement.batch_number || '—'}</TableCell>
                                    <TableCell align="right" sx={{ color: 'success.main' }}>{movement.quantity > 0 ? movement.quantity : '—'}</TableCell>
                                    <TableCell align="right" sx={{ color: 'error.main' }}>{movement.quantity < 0 ? -movement.quantity : '—'}</TableCell>
                                    <TableCell align="right">{movement.balance_before}</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>{movement.balance_after}</TableCell>
                                    <TableCell>{movement.user_name || 'System'}</TableCell><TableCell>{movement.notes || '—'}</TableCell>
                                </TableRow>)}
                                {movements.data.length === 0 && <TableRow><TableCell colSpan={12} align="center" sx={{ py: 3 }}>No stock movements found for the selected filters.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <DataTableFooter paginator={movements} onPageChange={page => visit({ ...filters, page })} />
                </Paper>
            </Box>
        </MainLayout>
    );
}
