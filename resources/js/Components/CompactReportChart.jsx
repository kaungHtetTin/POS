import React from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const defaultColors = ['#0E684E', '#2874bc', '#b77700', '#ce4444', '#7b8795'];

const compactNumber = (value) => new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
}).format(Number(value || 0));

function ChartCard({ title, subtitle, children, height = 184, empty = false, emptyLabel = 'No data for the selected filters.' }) {
    return (
        <Paper variant="outlined" sx={{ p: 1.25, minWidth: 0, overflow: 'hidden' }}>
            <Box sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1.35 }}>{title}</Typography>
                {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </Box>
            <Box sx={{ height, minWidth: 0, display: 'grid', placeItems: empty ? 'center' : undefined }}>
                {empty ? <Typography variant="caption" color="text.secondary">{emptyLabel}</Typography> : children}
            </Box>
        </Paper>
    );
}

function useChartStyle() {
    const theme = useTheme();
    return {
        grid: theme.palette.divider,
        text: theme.palette.text.secondary,
        tooltip: {
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 6,
            boxShadow: theme.shadows[2],
            fontSize: 11,
            padding: '6px 8px',
        },
    };
}

const axisTick = (color) => ({ fill: color, fontSize: 10 });
const legendStyle = { fontSize: 10, lineHeight: '16px' };

export function CompactLineChart({ title, subtitle, data = [], xKey, series = [], height = 184, valueFormatter = compactNumber, xFormatter }) {
    const style = useChartStyle();
    return (
        <ChartCard title={title} subtitle={subtitle} height={height} empty={!data.length}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={style.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey={xKey} tick={axisTick(style.text)} tickLine={false} axisLine={false} tickFormatter={xFormatter} minTickGap={20} />
                    <YAxis tick={axisTick(style.text)} tickLine={false} axisLine={false} tickFormatter={compactNumber} width={48} />
                    <Tooltip formatter={(value, name) => [valueFormatter(value, name), name]} contentStyle={style.tooltip} />
                    <Legend iconSize={8} wrapperStyle={legendStyle} />
                    {series.map((item, index) => (
                        <Line key={item.key} type="monotone" dataKey={item.key} name={item.label || item.key} stroke={item.color || defaultColors[index % defaultColors.length]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export function CompactBarChart({ title, subtitle, data = [], xKey, series = [], height = 184, layout = 'vertical', valueFormatter = compactNumber }) {
    const style = useChartStyle();
    const vertical = layout === 'vertical';
    return (
        <ChartCard title={title} subtitle={subtitle} height={height} empty={!data.length}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, left: vertical ? 4 : -16, bottom: 0 }} barGap={2}>
                    <CartesianGrid stroke={style.grid} strokeDasharray="3 3" horizontal={!vertical} vertical={vertical} />
                    <XAxis type={vertical ? 'number' : 'category'} dataKey={vertical ? undefined : xKey} tick={axisTick(style.text)} tickLine={false} axisLine={false} tickFormatter={vertical ? compactNumber : undefined} />
                    <YAxis type={vertical ? 'category' : 'number'} dataKey={vertical ? xKey : undefined} tick={axisTick(style.text)} tickLine={false} axisLine={false} tickFormatter={vertical ? undefined : compactNumber} width={vertical ? 92 : 48} />
                    <Tooltip formatter={(value, name) => [valueFormatter(value, name), name]} contentStyle={style.tooltip} />
                    <Legend iconSize={8} wrapperStyle={legendStyle} />
                    {series.map((item, index) => (
                        <Bar key={item.key} dataKey={item.key} name={item.label || item.key} fill={item.color || defaultColors[index % defaultColors.length]} radius={vertical ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={18} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export function CompactDonutChart({ title, subtitle, data = [], nameKey = 'name', valueKey = 'value', colors = defaultColors, height = 184, valueFormatter = compactNumber }) {
    const style = useChartStyle();
    const visibleData = data.filter((item) => Number(item[valueKey] || 0) > 0);
    return (
        <ChartCard title={title} subtitle={subtitle} height={height} empty={!visibleData.length}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={visibleData} dataKey={valueKey} nameKey={nameKey} innerRadius="48%" outerRadius="72%" paddingAngle={2} stroke="none">
                        {visibleData.map((item, index) => <Cell key={`${item[nameKey]}-${index}`} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [valueFormatter(value, name), name]} contentStyle={style.tooltip} />
                    <Legend iconSize={8} wrapperStyle={legendStyle} />
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export { ChartCard, compactNumber };
