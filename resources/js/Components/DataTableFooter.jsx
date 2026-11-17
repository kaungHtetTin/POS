import React from 'react';
import SimpleIcon from '@/Components/SimpleIcon';
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
                flexWrap: 'wrap',
                mt: '-1px',
                border: 1,
                borderColor: 'divider',
                borderRadius: '0 0 6px 6px',
                bgcolor: 'background.paper',
                color: 'text.secondary',
            }}
        >
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 600 }}>
                {from}–{to} of {total} {label}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5} component="nav" aria-label="Table pagination">
                <Button
                    type="button"
                    disabled={loading || page <= 1}
                    aria-label="Previous page"
                    startIcon={<Box sx={{ display: 'flex', transform: 'rotate(180deg)' }}><SimpleIcon name="chevronRight" size={13} /></Box>}
                    onClick={() => onPageChange?.(page - 1)}
                    sx={{ minWidth: 54, minHeight: { xs: 34, md: 28 }, border: '1px solid', borderColor: 'divider', borderRadius: '6px', bgcolor: 'background.paper', fontSize: 10.5, boxShadow: 'none' }}
                >
                    Prev
                </Button>
                <Typography component="span" aria-live="polite" sx={{ px: 0.75, minWidth: 50, textAlign: 'center', fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {page} / {lastPage}
                </Typography>
                <Button
                    type="button"
                    disabled={loading || page >= lastPage}
                    aria-label="Next page"
                    endIcon={<SimpleIcon name="chevronRight" size={13} />}
                    onClick={() => onPageChange?.(page + 1)}
                    sx={{ minWidth: 54, minHeight: { xs: 34, md: 28 }, border: '1px solid', borderColor: 'divider', borderRadius: '6px', bgcolor: 'background.paper', fontSize: 10.5, boxShadow: 'none' }}
                >
                    Next
                </Button>
            </Stack>
        </Box>
    );
}
