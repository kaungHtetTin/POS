import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

const tones = {
    default: 'primary',
    success: 'success',
    warning: 'warning',
    danger: 'error',
    info: 'info',
};

export function StatCard({ label, value, icon, tone = 'default', component, href, onClick, sx = {} }) {
    const paletteKey = tones[tone] || tones.default;

    return (
        <Paper
            component={component}
            href={href}
            onClick={onClick}
            variant="outlined"
            sx={{
                minWidth: 0,
                minHeight: 76,
                p: '12px',
                borderRadius: '10px',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
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
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ width: '100%', minWidth: 0 }}>
                {icon && (
                    <Box
                        aria-hidden="true"
                        sx={{
                            width: 32,
                            height: 32,
                            flex: '0 0 32px',
                            borderRadius: '12px',
                            display: 'grid',
                            placeItems: 'center',
                            color: `${paletteKey}.main`,
                            bgcolor: (theme) => alpha(theme.palette[paletteKey].main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
                            '& .MuiSvgIcon-root': { fontSize: 19 },
                        }}
                    >
                        {icon}
                    </Box>
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25 }} noWrap>
                        {label}
                    </Typography>
                    <Typography sx={{ mt: 0.75, fontSize: 22, fontWeight: 800, lineHeight: 1.15, color: 'text.primary' }} noWrap>
                        {value}
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
}

export default function StatCardGrid({ items = [], sx = {} }) {
    if (!items.length) return null;

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 1.25,
                mb: 1.5,
                ...sx,
            }}
        >
            {items.map((item) => <StatCard key={item.key || item.label} {...item} />)}
        </Box>
    );
}
