import React, { useMemo, useState } from 'react';
import { Head, router } from '@/spa';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import {
    FilterAlt as FilterIcon,
    RestartAlt as ResetIcon,
    WarningAmber as WarnIcon,
} from '@mui/icons-material';

export default function ExpiryReport({ auth, branches = [], products = [], batches = [], summary = {}, filters = {} }) {
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [productId, setProductId] = useState(filters.product_id ?? '');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');
    const batchRows = batches?.data || batches || [];

    const applyFilters = (page = undefined) => {
        router.get(
            route('reports.expiry'),
            {
                branch_id: branchId || undefined,
                product_id: productId || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                page,
            },
            { preserveState: true, replace: true }
        );
    };

    const resetFilters = () => {
        setBranchId(auth.user?.current_branch_id || '');
        setProductId('');
        setFromDate('');
        setToDate('');
        router.get(route('reports.expiry'));
    };

    const selectedProduct = useMemo(
        () => products.find((product) => product.id === productId) || null,
        [products, productId]
    );

    const filterProducts = (options, { inputValue }) => {
        const query = inputValue.trim().toLowerCase();
        if (!query) {
            return options.slice(0, 50);
        }

        return options
            .filter((product) => [
                product.name,
                product.generic_name,
                product.barcode,
            ].some((value) => String(value || '').toLowerCase().includes(query)))
            .slice(0, 50);
    };

    return (
        <MainLayout auth={auth} header="Expiry Report">
            <Head title="Expiry Report" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WarnIcon fontSize="small" color="warning" />
                            EXPIRY REPORT
                        </Typography>
                    </Stack>

                    <ReportFilterToolbar
                        ariaLabel="Expiry report filters"
                        fieldKinds={['wide', 'date', 'date', 'search']}
                        onSubmit={applyFilters}
                        actions={(
                            <>
                                <Button variant="contained" size="small" startIcon={<FilterIcon />} type="submit">Apply</Button>
                                <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={resetFilters}>Reset</Button>
                                <CsvExportButton source={batches} dataKey="batches" filename="expiry-report.csv" />
                            </>
                        )}
                    >
                        <FormControl
                            size="small"
                            sx={{
                                flex: { xs: '1 1 100%', sm: '1 1 220px', lg: '1 1 210px' },
                                minWidth: 0,
                                maxWidth: { lg: 290 },
                            }}
                        >
                            <InputLabel>Branch</InputLabel>
                            <Select value={branchId} label="Branch" onChange={(e) => setBranchId(e.target.value)}>
                                <MenuItem value="">Current Branch</MenuItem>
                                <MenuItem value="all">All Accessible</MenuItem>
                                {branches.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>
                                        {b.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            type="date"
                            label="From Expiry Date"
                            InputLabelProps={{ shrink: true }}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            sx={{
                                flex: { xs: '1 1 100%', sm: '1 1 180px', lg: '0 1 185px' },
                                minWidth: 0,
                                maxWidth: { lg: 220 },
                            }}
                        />

                        <TextField
                            size="small"
                            type="date"
                            label="To Expiry Date"
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            sx={{
                                flex: { xs: '1 1 100%', sm: '1 1 180px', lg: '0 1 185px' },
                                minWidth: 0,
                                maxWidth: { lg: 220 },
                            }}
                        />

                        <Autocomplete
                            size="small"
                            options={products}
                            value={selectedProduct}
                            onChange={(event, value) => setProductId(value?.id || '')}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            getOptionLabel={(option) => option?.name || ''}
                            filterOptions={filterProducts}
                            autoHighlight
                            clearOnEscape
                            noOptionsText="No matching products"
                            ListboxProps={{ style: { maxHeight: 320 } }}
                            sx={{
                                flex: { xs: '1 1 100%', sm: '2 1 320px', lg: '2 1 300px' },
                                minWidth: 0,
                            }}
                            renderOption={(props, option) => {
                                const { key, ...optionProps } = props;

                                return (
                                    <Box component="li" key={key} {...optionProps}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                                {option.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {[option.generic_name, option.barcode].filter(Boolean).join(' / ') || 'No barcode'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Product"
                                    placeholder="Search name, generic, or barcode"
                                />
                            )}
                        />

                    </ReportFilterToolbar>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                        <Chip size="small" variant="outlined" label={`Total Batches: ${summary.total}`} />
                        <Chip size="small" color="error" variant="outlined" label={`Expired: ${summary.expired}`} />
                        <Chip size="small" color="warning" variant="outlined" label={`<=30 days: ${summary.near30}`} />
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Batch #</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Qty</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Expiry Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {batchRows.map((b) => (
                                    <TableRow key={b.id} hover>
                                        <TableCell>{b.batch_number}</TableCell>
                                        <TableCell>{b.product_name}</TableCell>
                                        <TableCell>{b.branch_name}</TableCell>
                                        <TableCell align="right">{b.quantity}</TableCell>
                                        <TableCell>{b.expiry_date}</TableCell>
                                        <TableCell align="center">
                                            {b.days_left < 0 ? (
                                                <Chip size="small" color="error" label="Expired" />
                                            ) : b.days_left <= 30 ? (
                                                <Chip size="small" color="warning" label={`${b.days_left} days left`} />
                                            ) : (
                                                <Chip size="small" variant="outlined" label={`${b.days_left} days left`} />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {batchRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                No batches found for selected filters.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {Number(batches?.last_page || 1) > 1 && (
                        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Pagination
                                size="small"
                                count={batches.last_page}
                                page={batches.current_page}
                                onChange={(event, page) => applyFilters(page)}
                                color="primary"
                            />
                        </Stack>
                    )}
                </Paper>
            </Box>
        </MainLayout>
    );
}
