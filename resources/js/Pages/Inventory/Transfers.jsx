import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, router } from '@/spa';
import {
    Box,
    Button,
    Chip,
    InputAdornment,
    Pagination,
    Paper,
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
    Add as AddIcon,
    CompareArrows as TransferIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

export default function StockTransfers({ auth, transfers, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const transferRows = transfers?.data || transfers || [];

    const handleSearch = (page = undefined) => {
        router.get(route('inventory.transfers.index'), { search: search || undefined, page }, { preserveState: true, replace: true });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(dateString));
    };

    return (
        <MainLayout auth={auth} header="Stock Transfers">
            <Head title="Stock Transfers" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Paper sx={{ p: 2 }}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        spacing={1.5}
                        sx={{ mb: 2 }}
                    >
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TransferIcon color="primary" />
                            Branch-to-Branch Transfers
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.visit(route('inventory.transfers.create'))}>New Transfer</Button>
                    </Stack>

                    <ReportFilterToolbar
                        ariaLabel="Stock transfer filters"
                        fieldKinds={['search']}
                        onSubmit={() => handleSearch()}
                        actions={<><Button variant="outlined" type="submit">Search</Button><CsvExportButton source={transfers} dataKey="transfers" filename="stock-transfers.csv" /></>}
                    >
                        <TextField
                            size="small"
                            placeholder="Search reference..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        />
                    </ReportFilterToolbar>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Reference</TableCell>
                                    <TableCell>From Branch</TableCell>
                                    <TableCell>To Branch</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell align="center">Items</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transferRows.map((transfer) => (
                                    <TableRow key={transfer.id} hover>
                                        <TableCell sx={{ fontWeight: 800 }}>{transfer.reference_number}</TableCell>
                                        <TableCell>{transfer.from_branch?.name}</TableCell>
                                        <TableCell>{transfer.to_branch?.name}</TableCell>
                                        <TableCell>{formatDate(transfer.transfer_date)}</TableCell>
                                        <TableCell align="center">{transfer.items_count}</TableCell>
                                        <TableCell align="center">
                                            <Chip size="small" label={transfer.status} color="success" variant="outlined" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {transferRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            No transfer records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {Number(transfers?.last_page || 1) > 1 && (
                        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Pagination
                                size="small"
                                count={transfers.last_page}
                                page={transfers.current_page}
                                onChange={(event, page) => handleSearch(page)}
                                color="primary"
                            />
                        </Stack>
                    )}
                </Paper>
            </Box>
        </MainLayout>
    );
}
