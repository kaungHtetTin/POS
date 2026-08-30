import React, { useState } from 'react';
import { Alert, Button, CircularProgress, Snackbar } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

const getPath = (value, path) => String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, key) => current?.[key], value);

const csvCell = (value) => {
    if (value === null || value === undefined) return '';
    let normalized = typeof value === 'boolean'
        ? (value ? 'Yes' : 'No')
        : (typeof value === 'object' ? JSON.stringify(value) : String(value));
    if (typeof value === 'string' && /^[=+\-@]/.test(normalized)) normalized = `'${normalized}`;
    return `"${normalized.replace(/"/g, '""')}"`;
};

const humanize = (value) => String(value || '')
    .replace(/\./g, ' / ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const flattenKeys = (row, prefix = '', depth = 0) => Object.entries(row || {}).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && depth < 1) {
        return flattenKeys(value, path, depth + 1);
    }
    return [path];
});

const inferColumns = (rows) => [...new Set(rows.flatMap((row) => flattenKeys(row)))]
    .filter((key) => !key.endsWith('.pivot'))
    .map((key) => ({ key, label: humanize(key) }));

const downloadCsv = (filename, columns, rows) => {
    const header = columns.map((column) => csvCell(column.label)).join(',');
    const body = rows.map((row) => columns.map((column) => {
        const value = typeof column.value === 'function'
            ? column.value(row)
            : getPath(row, column.key);
        return csvCell(value);
    }).join(','));
    const blob = new Blob([`\uFEFF${[header, ...body].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const fetchPage = async (url) => {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-SPA': 'true',
        },
        credentials: 'same-origin',
    });
    if (!response.ok) throw new Error(`Export request failed (${response.status}).`);
    return response.json();
};

export default function CsvExportButton({
    source,
    dataKey,
    columns,
    filename = 'export.csv',
    pageParam = 'page',
    label = 'Export CSV',
    size = 'small',
    variant = 'outlined',
    sx,
}) {
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');

    const handleExport = async () => {
        if (exporting) return;
        setExporting(true);
        setError('');
        try {
            let rows = Array.isArray(source) ? source : (source?.data || []);
            const lastPage = Number(source?.last_page || 1);

            if (dataKey && lastPage > 1) {
                const pages = Array.from({ length: lastPage }, (_, index) => index + 1);
                const payloads = [];
                for (const page of pages) {
                    const url = new URL(window.location.href);
                    url.searchParams.set(pageParam, String(page));
                    payloads.push(await fetchPage(`${url.pathname}${url.search}`));
                }
                rows = payloads.flatMap((payload) => {
                    const result = getPath(payload?.props, dataKey);
                    return Array.isArray(result) ? result : (result?.data || []);
                });
            }

            const exportColumns = columns?.length ? columns : inferColumns(rows);
            downloadCsv(filename, exportColumns, rows);
        } catch (exportError) {
            setError(exportError?.message || 'Unable to export CSV.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
        <Button
            type="button"
            size={size}
            variant={variant}
            startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon fontSize="small" />}
            onClick={handleExport}
            disabled={exporting}
            sx={sx}
        >
            {exporting ? 'Exporting…' : label}
        </Button>
        <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')}>
            <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Snackbar>
        </>
    );
}
