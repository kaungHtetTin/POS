import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

export default function DataTableFooter({ paginator, onPageChange, loading = false, label = 'records' }) {
    const rows = Array.isArray(paginator?.data) ? paginator.data : [];
    const total = Math.max(0, Number(paginator?.total ?? rows.length));
    const perPage = Math.max(1, Number(paginator?.per_page || rows.length || 1));
    const lastPage = Math.max(1, Number(paginator?.last_page || Math.ceil(total / perPage) || 1));
    const page = Math.min(Math.max(1, Number(paginator?.current_page || 1)), lastPage);
    const from = total ? Number(paginator?.from || ((page - 1) * perPage) + 1) : 0;
    const to = total ? Number(paginator?.to || Math.min(page * perPage, total)) : 0;

    return (
        <Box
            className="data-table-footer"
            sx={{
                minHeight: 44,
                px: '10px',
                py: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                mt: '-1px',
                border: 1,
                borderColor: 'divider',
                borderRadius: '0 0 6px 6px',
                bgcolor: 'background.paper',
                color: 'text.secondary',
            }}
        >
            <Typography component="span" sx={{ fontSize: 10, fontWeight: 650 }}>
                {from}–{to} of {total} {label}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.875} aria-label="Table pagination">
                <Button
                    type="button"
                    disabled={loading || page <= 1}
                    onClick={() => onPageChange?.(page - 1)}
                    sx={{ minWidth: 54, minHeight: 28, height: 28, border: 0, bgcolor: 'transparent', fontSize: 10, boxShadow: 'none' }}
                >
                    Prev
                </Button>
                <Typography component="span" sx={{ minWidth: 56, textAlign: 'center', fontSize: 10, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
                    {page} / {lastPage}
                </Typography>
                <Button
                    type="button"
                    disabled={loading || page >= lastPage}
                    onClick={() => onPageChange?.(page + 1)}
                    sx={{ minWidth: 54, minHeight: 28, height: 28, border: 0, bgcolor: 'transparent', fontSize: 10, boxShadow: 'none' }}
                >
                    Next
                </Button>
            </Stack>
        </Box>
    );
}
