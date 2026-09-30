import React, { useState } from 'react';
import DataTableFooter from '@/Components/DataTableFooter';
import ClickableTableRow from '@/Components/ClickableTableRow';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import TransferFormDialog from '@/Pages/Inventory/Transfers/TransferFormDialog';
import { Head, router } from '@/spa';
import {
    Box,
    Button,
    Chip,
    InputAdornment,
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
    Search as SearchIcon,
} from '@mui/icons-material';

export default function StockTransfers({ auth, transfers, filters, branches = [], products = [], categories = [], open_transfer_modal = false }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [transferOpen, setTransferOpen] = useState(Boolean(open_transfer_modal));
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

            <Box>
                <Paper sx={{ p: 2 }}>
                    <ReportFilterToolbar appBar
                        ariaLabel="Stock transfer filters"
                        fieldKinds={['search']}
                        onSubmit={() => handleSearch()}
                        actions={<><Button variant="outlined" type="submit">Search</Button><CsvExportButton source={transfers} dataKey="transfers" filename="stock-transfers.csv" /><Button variant="contained" startIcon={<AddIcon />} onClick={() => setTransferOpen(true)}>New Transfer</Button></>}
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
                                    <ClickableTableRow
                                        key={transfer.id}
                                        href={route('inventory.transfers.show', transfer.id)}
                                        label={`View transfer ${transfer.reference_number}`}
                                    >
                                        <TableCell sx={{ fontWeight: 800 }}>{transfer.reference_number}</TableCell>
                                        <TableCell>{transfer.from_branch?.name}</TableCell>
                                        <TableCell>{transfer.to_branch?.name}</TableCell>
                                        <TableCell>{formatDate(transfer.transfer_date)}</TableCell>
                                        <TableCell align="center">{transfer.items_count}</TableCell>
                                        <TableCell align="center">
                                            <Chip size="small" label={transfer.status} color="success" variant="outlined" />
                                        </TableCell>
                                    </ClickableTableRow>
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
                    <DataTableFooter paginator={transfers} onPageChange={(page) => handleSearch(page)} />
                </Paper>
            </Box>
            <TransferFormDialog
                open={transferOpen}
                onClose={() => {
                    setTransferOpen(false);
                    if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        if (url.searchParams.has('create')) {
                            url.searchParams.delete('create');
                            window.history.replaceState(window.history.state, '', url.toString());
                        }
                    }
                }}
                auth={auth}
                branches={branches}
                products={products}
                categories={categories}
            />
        </MainLayout>
    );
}
