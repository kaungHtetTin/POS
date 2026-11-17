import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
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

import { chartColors as defaultColors, ChartLegend, useReportChartStyle, shortChartLabel } from './ReportChartStyle';

const compactNumber = (value) => new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
}).format(Number(value || 0));

function ChartCard({ title, subtitle, children, height = 208, empty = false, emptyLabel = 'No data for the selected filters.' }) {
    return (
        <Paper component="section" aria-label={title} data-chart-card variant="outlined" sx={{ p: 1.5, minWidth: 0, borderRadius: '10px', overflow: 'hidden' }}>
            <Box sx={{ mb: 1.25 }}>
                <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{title}</Typography>
                {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </Box>
            <Box sx={{ height: Math.max(height, 180), minWidth: 0, display: 'grid', placeItems: empty ? 'center' : undefined }}>
                {empty ? <Box sx={{ textAlign: 'center', p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: '8px', width: '100%' }}><Typography variant="caption" color="text.secondary">{emptyLabel}</Typography></Box> : children}
            </Box>
        </Paper>
    );
}

const axisTick = (color) => ({ fill: color, fontSize: 10 });

export function CompactLineChart({ title, subtitle, data = [], xKey, series = [], height = 208, valueFormatter = compactNumber, xFormatter }) {
    const style = useReportChartStyle();
    return (
        <ChartCard title={title} subtitle={subtitle} height={height} empty={!data.length}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={style.grid} strokeDasharray="2 5" vertical={false} />
                    <XAxis dataKey={xKey} tick={axisTick(style.text)} tickLine={false} axisLine={false} tickFormatter={xFormatter} minTickGap={20} />
                    <YAxis tick={axisTick(style.text)} tickLine={false} axisLine={false} tickFormatter={compactNumber} width={48} />
                    <Tooltip labelFormatter={xFormatter} cursor={{ stroke: style.grid, fill: style.grid }} itemStyle={{ color: style.textPrimary }} formatter={(value, name) => [valueFormatter(value, name), name]} contentStyle={style.tooltip} />
                    <Legend content={<ChartLegend />} />
                    {series.map((item, index) => (
                        <Line key={item.key} type="monotone" dataKey={item.key} name={item.label || item.key} stroke={style.color(item.color, index)} strokeWidth={2} dot={data.length <= 8 ? { r: 2.5, strokeWidth: 0 } : false} activeDot={{ r: 4, strokeWidth: 2 }} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export function CompactBarChart({ title, subtitle, data = [], xKey, series = [], height = 208, layout = 'vertical', valueFormatter = compactNumber }) {
    const style = useReportChartStyle();
    const vertical = layout === 'vertical';
    return (
        <ChartCard title={title} subtitle={subtitle} height={height} empty={!data.length}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart accessibilityLayer data={data} layout={layout} margin={{ top: 8, right: 8, left: vertical ? 4 : 0, bottom: 0 }} barGap={2}>
                    <CartesianGrid stroke={style.grid} strokeDasharray="2 5" horizontal={!vertical} vertical={vertical} />
                    <XAxis type={vertical ? 'number' : 'category'} dataKey={vertical ? undefined : xKey} tick={axisTick(style.text)} tickLine={false} axisLine={false} tickFormatter={vertical ? compactNumber : shortChartLabel} />
                    <YAxis type={vertical ? 'category' : 'number'} dataKey={vertical ? xKey : undefined} tick={axisTick(style.text)} tickLine={false} axisLine={false} tickFormatter={vertical ? shortChartLabel : compactNumber} width={vertical ? 108 : 48} />
                    <Tooltip cursor={{ stroke: style.grid, fill: style.grid }} itemStyle={{ color: style.textPrimary }} formatter={(value, name) => [valueFormatter(value, name), name]} contentStyle={style.tooltip} />
                    <Legend content={<ChartLegend />} />
                    {series.map((item, index) => (
                        <Bar key={item.key} dataKey={item.key} name={item.label || item.key} fill={style.color(item.color, index)} radius={vertical ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={18} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export function CompactDonutChart({ title, subtitle, data = [], nameKey = 'name', valueKey = 'value', colors = defaultColors, height = 208, valueFormatter = compactNumber }) {
    const style = useReportChartStyle();
    const visibleData = data.filter((item) => Number(item[valueKey] || 0) > 0);
    return (
        <ChartCard title={title} subtitle={subtitle} height={height} empty={!visibleData.length}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={visibleData} dataKey={valueKey} nameKey={nameKey} innerRadius="48%" outerRadius="78%" paddingAngle={3} cornerRadius={3} stroke="none">
                        {visibleData.map((item, index) => <Cell key={`${item[nameKey]}-${index}`} fill={style.color(colors[index % colors.length])} />)}
                    </Pie>
                    <Tooltip cursor={{ stroke: style.grid, fill: style.grid }} itemStyle={{ color: style.textPrimary }} formatter={(value, name) => [valueFormatter(value, name), name]} contentStyle={style.tooltip} />
                    <Legend content={<ChartLegend />} />
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export { ChartCard, compactNumber };
