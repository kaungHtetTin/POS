import React, { useMemo, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router } from '@inertiajs/react';
import {
    Box,
    Button,
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
import { FilterAlt as FilterIcon, History as HistoryIcon } from '@mui/icons-material';

export default function ActivityLogsIndex({ auth, users = [], filters = {}, logs }) {
    const [fromDate, setFromDate] = useState(filters?.from_date || '');
    const [toDate, setToDate] = useState(filters?.to_date || '');
    const [userId, setUserId] = useState(filters?.user_id || '');
    const [method, setMethod] = useState(filters?.method || '');
    const [action, setAction] = useState(filters?.action || '');

    const rows = useMemo(() => logs?.data || [], [logs]);

    const applyFilters = () => {
        router.get(
            route('activity-logs.index'),
            {
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                user_id: userId || undefined,
                method: method || undefined,
                action: action || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const resetFilters = () => {
        setFromDate('');
        setToDate('');
        setUserId('');
        setMethod('');
        setAction('');
        router.get(route('activity-logs.index'));
    };

    const goToPage = (url) => {
        if (!url) return;
        router.visit(url, { preserveState: true, preserveScroll: true });
    };

    return (
        <MainLayout auth={auth} header="Activity Logs">
            <Head title="Activity Logs" />

            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <HistoryIcon fontSize="small" color="primary" />
                            USER ACTIVITY LOGS
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Total: {logs?.total || 0}
                        </Typography>
                    </Stack>

                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
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

                        <FormControl size="small" sx={{ flex: '1 1 220px', minWidth: { xs: '100%', sm: 220 } }}>
                            <InputLabel>User</InputLabel>
                            <Select value={userId} label="User" onChange={(e) => setUserId(e.target.value)}>
                                <MenuItem value="">All users</MenuItem>
                                {users.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>
                                        {u.name} ({u.email})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flex: '1 1 140px', minWidth: { xs: '100%', sm: 140 } }}>
                            <InputLabel>Method</InputLabel>
                            <Select value={method} label="Method" onChange={(e) => setMethod(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="POST">POST</MenuItem>
                                <MenuItem value="PATCH">PATCH</MenuItem>
                                <MenuItem value="PUT">PUT</MenuItem>
                                <MenuItem value="DELETE">DELETE</MenuItem>
                                <MenuItem value="GET">GET</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            label="Action keyword"
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            sx={{ flex: '1 1 220px', minWidth: { xs: '100%', sm: 220 } }}
                        />

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<FilterIcon fontSize="small" />}
                            onClick={applyFilters}
                            sx={{ minWidth: 120, width: { xs: '100%', sm: 'auto' } }}
                        >
                            Apply
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={resetFilters}
                            sx={{ minWidth: 120, width: { xs: '100%', sm: 'auto' } }}
                        >
                            Reset
                        </Button>
                    </Box>

                    <TableContainer sx={{ maxHeight: '68vh' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>IP</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>
                                            <Typography variant="caption">{row.created_at || '-'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.user_name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{row.user_email}</Typography>
                                        </TableCell>
                                        <TableCell>{row.branch_name || '-'}</TableCell>
                                        <TableCell>{row.method || '-'}</TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{row.action}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 260 }}>
                                            <Typography variant="caption">{row.description}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{row.ip_address || '-'}</Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary italic">
                                                No activity found for selected filters.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Page {logs?.current_page || 1} / {logs?.last_page || 1}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={!logs?.prev_page_url}
                                onClick={() => goToPage(logs?.prev_page_url)}
                            >
                                Previous
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={!logs?.next_page_url}
                                onClick={() => goToPage(logs?.next_page_url)}
                            >
                                Next
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Box>
        </MainLayout>
    );
}
