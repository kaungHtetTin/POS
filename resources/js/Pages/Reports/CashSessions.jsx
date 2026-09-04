import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import ReportFilterToolbar from '@/Components/ReportFilterToolbar';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, router } from '@/spa';
import {
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
import { FilterAlt as FilterIcon, PointOfSale as CashSessionIcon } from '@mui/icons-material';

export default function CashSessionsReport({ auth, branches = [], filters = {}, summary = {}, by_branch = [], by_date = [], sessions = [] }) {
    const [branchId, setBranchId] = useState(filters?.branch_id || auth.user?.current_branch_id || '');
    const [fromDate, setFromDate] = useState(filters?.from_date || '');
    const [toDate, setToDate] = useState(filters?.to_date || '');
    const [status, setStatus] = useState(filters?.status || 'all');
    const sessionRows = sessions?.data || sessions || [];

    const money = (n) => Number(n || 0).toFixed(2);
    const diffColor = (value) => {
        const n = Number(value || 0);
        if (n === 0) return 'success.main';
        return n > 0 ? 'warning.main' : 'error.main';
    };

    const applyFilters = (page = undefined) => {
        router.get(
            route('reports.cash-sessions'),
            {
                branch_id: branchId || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                status: status || undefined,
                page,
            },
            { preserveState: true, replace: true }
        );
    };

    const resetFilters = () => {
        router.get(route('reports.cash-sessions'));
    };

    const branchTrend = useMemo(() => by_branch || [], [by_branch]);
    const dateTrend = useMemo(() => by_date || [], [by_date]);

    return (
        <MainLayout auth={auth} header="Cash Session Report">
            <Head title="Cash Session Report" />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CashSessionIcon fontSize="small" color="primary" />
                            CASH SESSION HISTORY
                        </Typography>
                    </Stack>

                    <ReportFilterToolbar
                        ariaLabel="Cash session report filters"
                        fieldKinds={['wide', 'date', 'date', 'select']}
                        onSubmit={applyFilters}
                        actions={(
                            <>
                                <Button variant="contained" size="small" startIcon={<FilterIcon fontSize="small" />} type="submit">Apply</Button>
                                <Button variant="outlined" size="small" onClick={resetFilters}>Reset</Button>
                                <CsvExportButton source={sessions} dataKey="sessions" filename="cash-sessions.csv" />
                            </>
                        )}
                    >
                        <FormControl size="small" sx={{ flex: '1 1 220px', minWidth: { xs: '100%', sm: 220 } }}>
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
                            label="From"
                            InputLabelProps={{ shrink: true }}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            sx={{ flex: '1 1 170px', minWidth: { xs: '100%', sm: 170 } }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="To"
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            sx={{ flex: '1 1 170px', minWidth: { xs: '100%', sm: 170 } }}
                        />

                        <FormControl size="small" sx={{ flex: '1 1 180px', minWidth: { xs: '100%', sm: 180 } }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="open">Open</MenuItem>
                                <MenuItem value="closed">Closed</MenuItem>
                            </Select>
                        </FormControl>

                    </ReportFilterToolbar>

                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                        <Chip size="small" variant="outlined" label={`Sessions: ${summary.sessions_count || 0}`} />
                        <Chip size="small" variant="outlined" label={`Open: ${summary.open_sessions || 0}`} />
                        <Chip size="small" variant="outlined" label={`Closed: ${summary.closed_sessions || 0}`} />
                        <Chip size="small" variant="outlined" label={`Sales: ${summary.sale_count || 0}`} />
                        <Chip size="small" variant="outlined" label={`Opening Total: ${money(summary.opening_amount_total)}`} />
                        <Chip size="small" color="success" variant="outlined" label={`Cash Sales: ${money(summary.cash_sales_total)}`} />
                        <Chip size="small" color="info" variant="outlined" label={`Card Sales: ${money(summary.card_sales_total)}`} />
                        <Chip size="small" color="secondary" variant="outlined" label={`Mobile Sales: ${money(summary.mobile_sales_total)}`} />
                        <Chip size="small" color="warning" variant="outlined" label={`Wallet Sales: ${money(summary.wallet_sales_total)}`} />
                        <Chip size="small" color="primary" label={`All Sales: ${money(summary.total_sales)}`} />
                        <Chip size="small" variant="outlined" label={`Cash Received: ${money(summary.cash_received_total)}`} />
                        <Chip size="small" variant="outlined" label={`Change Given: ${money(summary.change_given_total)}`} />
                        <Chip size="small" variant="outlined" label={`Net Cash Sales: ${money(summary.net_cash_sales_total)}`} color="primary" />
                        <Chip size="small" variant="outlined" label={`Expected Total: ${money(summary.expected_amount_total)}`} />
                        <Chip size="small" variant="outlined" label={`Counted Total: ${money(summary.counted_amount_total)}`} />
                        <Chip
                            size="small"
                            variant="outlined"
                            label={`Diff Total: ${money(summary.difference_total)}`}
                            sx={{ color: diffColor(summary.difference_total), borderColor: diffColor(summary.difference_total) }}
                        />
                    </Stack>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: '1 1 calc(50% - 6px)' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                Totals by Branch
                            </Typography>
                            <TableContainer sx={{ maxHeight: 220 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Sessions</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Net Cash</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Diff</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {branchTrend.map((row) => (
                                            <TableRow key={row.branch_id} hover>
                                                <TableCell>{row.branch_name}</TableCell>
                                                <TableCell align="right">{row.sessions_count}</TableCell>
                                                <TableCell align="right">{money(row.net_cash_sales_total)}</TableCell>
                                                <TableCell align="right" sx={{ color: diffColor(row.difference_total), fontWeight: 700 }}>
                                                    {money(row.difference_total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {branchTrend.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center">
                                                    <Typography variant="body2" color="text.secondary">No branch data.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 1.5, flex: '1 1 calc(50% - 6px)' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                Totals by Date
                            </Typography>
                            <TableContainer sx={{ maxHeight: 220 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Sessions</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Net Cash</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Diff</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dateTrend.map((row) => (
                                            <TableRow key={row.session_date} hover>
                                                <TableCell>{row.session_date}</TableCell>
                                                <TableCell align="right">{row.sessions_count}</TableCell>
                                                <TableCell align="right">{money(row.net_cash_sales_total)}</TableCell>
                                                <TableCell align="right" sx={{ color: diffColor(row.difference_total), fontWeight: 700 }}>
                                                    {money(row.difference_total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {dateTrend.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center">
                                                    <Typography variant="body2" color="text.secondary">No date data.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Box>

                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Session History
                        </Typography>
                        <TableContainer sx={{ maxHeight: 460 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Opened By</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Closed By</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Opened At</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Closed At</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Sales</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Cash</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Card</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Mobile</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Wallet</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Total Sales</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Opening</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Expected</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Counted</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Diff</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sessionRows.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>{row.branch_name}</TableCell>
                                            <TableCell>{row.opened_by}</TableCell>
                                            <TableCell>{row.closed_by || '-'}</TableCell>
                                            <TableCell>{row.opened_at || '-'}</TableCell>
                                            <TableCell>{row.closed_at || '-'}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={row.status} color={row.status === 'open' ? 'warning' : 'success'} />
                                            </TableCell>
                                            <TableCell align="right">{row.sale_count || 0}</TableCell>
                                            <TableCell align="right">{money(row.cash_sales_total)}</TableCell>
                                            <TableCell align="right">{money(row.card_sales_total)}</TableCell>
                                            <TableCell align="right">{money(row.mobile_sales_total)}</TableCell>
                                            <TableCell align="right">{money(row.wallet_sales_total)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>{money(row.total_sales)}</TableCell>
                                            <TableCell align="right">{money(row.opening_amount)}</TableCell>
                                            <TableCell align="right">{money(row.expected_amount)}</TableCell>
                                            <TableCell align="right">{row.closing_counted_amount == null ? '-' : money(row.closing_counted_amount)}</TableCell>
                                            <TableCell align="right" sx={{ color: row.difference == null ? 'text.secondary' : diffColor(row.difference), fontWeight: 700 }}>
                                                {row.difference == null ? '-' : money(row.difference)}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {row.notes || '-'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sessionRows.length === 0 && (
                                        <TableRow>
                                                <TableCell colSpan={17} align="center" sx={{ py: 3 }}>
                                                <Typography variant="body2" color="text.secondary italic">
                                                    No session history for selected filters.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {Number(sessions?.last_page || 1) > 1 && (
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                                <Pagination
                                    size="small"
                                    count={sessions.last_page}
                                    page={sessions.current_page}
                                    onChange={(event, page) => applyFilters(page)}
                                    color="primary"
                                />
                            </Stack>
                        )}
                    </Paper>
                </Paper>
            </Box>
        </MainLayout>
    );
}
