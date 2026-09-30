import React, { useState } from 'react';
import DataTableFooter from '@/Components/DataTableFooter';
import { Head, router } from '@/spa';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { CompactDonutChart } from '@/Components/CompactReportChart';
import {
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
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

export default function ExpiryReport({ auth, branches = [], batches = [], summary = {}, filters = {} }) {
    const [branchId, setBranchId] = useState(filters.branch_id ?? auth.user?.current_branch_id ?? '');
    const [search, setSearch] = useState(filters.search ?? '');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');
    const batchRows = batches?.data || batches || [];
    const expiryChartData = [
        { name: 'Expired', value: Number(summary.expired || 0) },
        { name: 'Within 30 days', value: Number(summary.near30 || 0) },
        { name: 'Later', value: Math.max(Number(summary.total || 0) - Number(summary.expired || 0) - Number(summary.near30 || 0), 0) },
    ];

    const applyFilters = (page = undefined) => {
        router.get(
            route('reports.expiry'),
            {
                branch_id: branchId || undefined,
                search: search || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                page,
            },
            { preserveState: true, replace: true }
        );
    };

    const resetFilters = () => {
        setBranchId(auth.user?.current_branch_id || '');
        setSearch('');
        setFromDate('');
        setToDate('');
        router.get(route('reports.expiry'));
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

                    <ReportFilterToolbar appBar
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

                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search medicine name, generic, or barcode..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
                            sx={{
                                flex: { xs: '1 1 100%', sm: '2 1 320px', lg: '2 1 300px' },
                                minWidth: 0,
                            }}
                        />

                    </ReportFilterToolbar>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                        <Chip size="small" variant="outlined" label={`Total Batches: ${summary.total}`} />
                        <Chip size="small" color="error" variant="outlined" label={`Expired: ${summary.expired}`} />
                        <Chip size="small" color="warning" variant="outlined" label={`<=30 days: ${summary.near30}`} />
                    </Stack>

                    <Box sx={{ maxWidth: 520, mb: 1.5 }}>
                        <CompactDonutChart title="Expiry Status" data={expiryChartData} colors={['#ce4444', '#b77700', '#0E684E']} height={168} />
                    </Box>

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
                    <DataTableFooter paginator={batches} onPageChange={(page) => applyFilters(page)} />
                </Paper>
            </Box>
        </MainLayout>
    );
}
