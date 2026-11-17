import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

export const statCardGridSx = {
    display: 'grid',
    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(min(100%, 220px), 260px))' },
    gap: 1.25,
    alignItems: 'stretch',
    mb: 1.5,
};

const tones = {
    default: 'primary',
    success: 'success',
    warning: 'warning',
    danger: 'error',
    info: 'info',
};

export function StatCard({ label, value, icon, tone = 'default', component, href, onClick, description, sx = {} }) {
    const paletteKey = tones[tone] || tones.default;

    return (
        <Paper
            data-stat-card
            component={component}
            href={href}
            onClick={onClick}
            variant="outlined"
            sx={{
                minWidth: 0,
                minHeight: 92,
                p: '12px',
                borderRadius: '10px',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'stretch',
                color: 'inherit',
                textDecoration: 'none',
                ...(href || onClick ? {
                    cursor: 'pointer',
                    transition: 'border-color 140ms ease, background-color 140ms ease',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                } : {}),
                ...sx,
            }}
        >
            <Stack spacing={1} sx={{ width: '100%', minWidth: 0 }}>
                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0 }}>
                    <Typography color="text.secondary" sx={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{label}</Typography>
                    {icon && <Box aria-hidden="true" sx={{ width: 28, height: 28, flex: '0 0 28px', borderRadius: '8px', display: 'grid', placeItems: 'center', color: (theme) => theme.palette.mode === 'dark' ? theme.palette[paletteKey].light : theme.palette[paletteKey].main, bgcolor: (theme) => alpha(theme.palette[paletteKey].main, theme.palette.mode === 'dark' ? 0.2 : 0.1), '& .MuiSvgIcon-root': { fontSize: 17 } }}>{icon}</Box>}
                </Stack>
                <Box sx={{ mt: 'auto !important', pt: 0.5, minWidth: 0 }}>
                    <Typography data-stat-value sx={{ fontSize: { xs: 20, sm: 22 }, fontWeight: 750, lineHeight: 1.2, color: 'text.primary', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{value}</Typography>
                    {description && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: 10.5, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{description}</Typography>}
                </Box>
            </Stack>
        </Paper>
    );
}

export default function StatCardGrid({ items = [], sx = {} }) {
    if (!items.length) return null;

    return (
        <Box
            data-stat-grid
            sx={{
                ...statCardGridSx,
                ...sx,
            }}
        >
            {items.map((item) => <StatCard key={item.key || item.label} {...item} />)}
        </Box>
    );
}
