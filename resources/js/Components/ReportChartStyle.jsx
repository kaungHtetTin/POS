import React from 'react';
import { Box, useTheme } from '@mui/material';
import { alpha, lighten } from '@mui/material/styles';

export const shortChartLabel = (value) => { const label = String(value ?? ''); return label.length > 18 ? `${label.slice(0, 17)}…` : label; };

export const chartColors = ['#176B5B', '#2874BC', '#B77700', '#CE4444', '#8056B3', '#64748B'];
export function useReportChartStyle() {
    const theme = useTheme();
    const canonical = (color, index) => { const input = color || chartColors[index % chartColors.length]; return ({ '#1976d2': '#2874BC', '#2e7d32': '#176B5B', '#f57c00': '#B77700', '#6a1b9a': '#8056B3' })[input.toLowerCase()] || input; };
    return {
        text: theme.palette.text.secondary,
        textPrimary: theme.palette.text.primary,
        grid: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08),
        color: (color, index = 0) => theme.palette.mode === 'dark' ? lighten(canonical(color, index), 0.35) : canonical(color, index),
        tooltip: { backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`, borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.12)', fontFamily: theme.typography.fontFamily, fontSize: 11, padding: '10px 12px', maxWidth: 260, whiteSpace: 'normal', overflowWrap: 'anywhere' },
    };
}

export function ChartLegend({ payload = [] }) {
    return <Box component="ul" sx={{ m: 0, pt: 1, px: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 1.5, rowGap: 0.5, maxHeight: 56, overflowY: 'auto', fontSize: 10.5, color: 'text.secondary', lineHeight: 1.4 }}>
        {payload.map((item, index) => <Box component="li" key={`${item.dataKey || item.value}-${index}`} sx={{ display: 'flex', gap: 0.6, alignItems: 'center', maxWidth: '100%', minWidth: 0 }}><Box aria-hidden="true" sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: item.color, flexShrink: 0 }} /><Box component="span" sx={{ overflowWrap: 'anywhere', minWidth: 0 }}>{item.value}</Box></Box>)}
    </Box>;
}
