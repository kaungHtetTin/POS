import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { AppBarBack } from '@/Components/AppBarPortal';
import { Head } from '@/spa';
import {
    Box,
    Chip,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';

export default function StockTransferShow({ auth, transfer }) {
    const formatDate = (value) => {
        if (!value) return '-';
        const datePart = String(value).slice(0, 10);
        const date = new Date(`${datePart}T00:00:00`);
        return Number.isNaN(date.getTime())
            ? value
            : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    };

    const statusColor = transfer.status === 'Completed'
        ? 'success'
        : transfer.status === 'Pending'
            ? 'warning'
            : 'error';

    return (
        <MainLayout auth={auth} header="Transfer Details">
            <Head title={`Transfer ${transfer.reference_number}`} />
            <AppBarBack href={route('inventory.transfers.index')} label="Back to Transfers" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Stack spacing={1.5}>
                    <Paper variant="outlined" sx={{ p: { xs: 1.25, md: 1.5 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{transfer.reference_number}</Typography>
                            <Chip size="small" label={transfer.status} color={statusColor} variant="outlined" />
                        </Stack>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 1, md: 1.25 } }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">From branch</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 650, fontSize: 13 }}>{transfer.from_branch?.name || '-'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">To branch</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 650, fontSize: 13 }}>{transfer.to_branch?.name || '-'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Transfer date</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 650, fontSize: 13 }}>{formatDate(transfer.transfer_date)}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Items</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 650, fontSize: 13 }}>{transfer.items?.length || 0}</Typography>
                            </Box>
                        </Box>

                        {transfer.notes && (
                            <Box sx={{ mt: 1, pt: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary">Notes</Typography>
                                <Typography variant="body2" sx={{ fontSize: 13 }}>{transfer.notes}</Typography>
                            </Box>
                        )}
                    </Paper>

                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Medicine</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Expiry</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Quantity</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(transfer.items || []).map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 650 }}>{item.product?.name || 'Deleted medicine'}</Typography>
                                                {item.product?.generic_name && (
                                                    <Typography variant="caption" color="text.secondary">{item.product.generic_name}</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>{item.product?.barcode || '-'}</TableCell>
                                            <TableCell>{item.batch?.batch_number || '-'}</TableCell>
                                            <TableCell>{formatDate(item.batch?.expiry_date)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 750 }}>{item.quantity}</TableCell>
                                        </TableRow>
                                    ))}
                                    {(!transfer.items || transfer.items.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                <Typography variant="body2" color="text.secondary">No item details are available for this transfer.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Stack>
            </Box>
        </MainLayout>
    );
}
