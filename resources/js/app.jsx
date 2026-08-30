import './bootstrap';
import '../css/app.css';

import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { Alert, Box, CircularProgress, CssBaseline, LinearProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';
import getTheme from './Theme/theme';
import { ColorModeContext } from './contexts/ColorModeContext';
import PersistentShellContext from './contexts/PersistentShellContext';
import PageContainer from './Components/PageContainer';
import MainLayout from './Layouts/MainLayout';
import PosLayout from './Layouts/PosLayout';
import { SpaProvider, router } from './spa';

const pages = import.meta.glob('./Pages/**/*.jsx');
const initialPage = JSON.parse(document.getElementById('spa-page')?.textContent || '{}');
const translatableAttributes = ['title', 'placeholder', 'aria-label', 'alt'];
let currentTranslations = initialPage.props?.translations || {};

const resolvePage = (name) => {
    const importer = pages[`./Pages/${name}.jsx`];
    if (!importer) throw new Error(`React page not found: ${name}`);
    return importer();
};

const translateValue = (value, translations) => {
    if (!value || typeof value !== 'string') return value;
    const trimmed = value.trim();
    const translated = translations?.[trimmed];
    if (translated) return value.replace(trimmed, translated);

    const colonMatch = trimmed.match(/^(.+?)(:\s.*)$/);
    if (colonMatch && translations?.[colonMatch[1]]) return value.replace(trimmed, `${translations[colonMatch[1]]}${colonMatch[2]}`);
    const countMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    if (countMatch && translations?.[countMatch[2]]) return value.replace(trimmed, `${countMatch[1]} ${translations[countMatch[2]]}`);
    const parentheticalMatch = trimmed.match(/^(.+?)\s+\((.+)\)$/);
    if (parentheticalMatch && translations?.[parentheticalMatch[1]]) {
        return value.replace(trimmed, `${translations[parentheticalMatch[1]]} (${parentheticalMatch[2]})`);
    }
    return value;
};

const applyStaticTranslations = (translations) => {
    if (!translations || typeof document === 'undefined') return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
        const tag = node.parentElement?.tagName;
        if (tag && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) node.nodeValue = translateValue(node.nodeValue, translations);
    });
    translatableAttributes.forEach((attribute) => {
        document.querySelectorAll(`[${attribute}]`).forEach((element) => {
            const current = element.getAttribute(attribute);
            const next = translateValue(current, translations);
            if (next && next !== current) element.setAttribute(attribute, next);
        });
    });
};

const scheduleTranslations = (page) => {
    currentTranslations = page?.props?.locale === 'my' ? (page.props.translations || {}) : {};
    if (page?.props?.locale !== 'my') return;
    [0, 150, 400].forEach((delay) => window.setTimeout(() => applyStaticTranslations(currentTranslations), delay));
};

const updateZiggy = (page) => {
    window.Ziggy = {
        ...(window.Ziggy || {}),
        ...(page.props.ziggy || {}),
    };
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta && page?.props?.csrf_token) csrfMeta.content = page.props.csrf_token;
};

function PageLoadingState({ initial = false }) {
    return (
        <Box role="status" aria-live="polite" sx={{ minHeight: initial ? '100vh' : 240, display: 'grid', placeItems: 'center', p: 3 }}>
            <Paper variant="outlined" sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={22} />
                <Box>
                    <Typography variant="subtitle2" fontWeight={800}>Loading page</Typography>
                    <Typography variant="caption" color="text.secondary">Getting the latest data…</Typography>
                </Box>
            </Paper>
        </Box>
    );
}

function PageContentSkeleton() {
    return (
        <PageContainer
            role="status"
            aria-live="polite"
            aria-label="Loading page content"
            sx={{ position: 'relative', minHeight: 360 }}
        >
            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
            <Stack spacing={1.25}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Skeleton variant="rounded" width="min(32%, 260px)" height={28} />
                    <Skeleton variant="rounded" width={112} height={32} />
                </Stack>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                        gap: 1,
                    }}
                >
                    {[0, 1, 2].map((item) => (
                        <Skeleton key={item} variant="rounded" height={68} />
                    ))}
                </Box>
                <Paper variant="outlined" sx={{ p: 1.25 }}>
                    <Stack spacing={1}>
                        <Skeleton variant="rounded" width="42%" height={30} />
                        {[0, 1, 2, 3, 4].map((item) => (
                            <Skeleton key={item} variant="rounded" height={38} />
                        ))}
                    </Stack>
                </Paper>
            </Stack>
        </PageContainer>
    );
}

function ContentTransition({ loading, error, children }) {
    if (loading) return <PageContentSkeleton />;

    return (
        <Box sx={{ minHeight: 240 }}>
            {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
            {children}
            {loading && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'start center', pt: 8, zIndex: 5 }}>
                    <Paper variant="outlined" sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2" fontWeight={700}>Loading latest data…</Typography>
                    </Paper>
                </Box>
            )}
        </Box>
    );
}

function Application() {
    const defaultPrimaryColor = initialPage.props?.settings?.app?.theme_primary_color || '#087f74';
    const [mode, setMode] = useState(() => {
        const stored = window.localStorage.getItem('app.theme');
        return stored === 'dark' || stored === 'light' ? stored : 'light';
    });
    const [primaryColor, setPrimaryColor] = useState(() => {
        const stored = window.localStorage.getItem('app.brand');
        return /^#[0-9A-Fa-f]{6}$/.test(stored || '') ? stored.toUpperCase() : defaultPrimaryColor;
    });
    const [shellHeader, setShellHeader] = useState('');
    const shellContext = useMemo(() => ({ setHeader: setShellHeader }), []);

    const colorMode = useMemo(() => ({
        mode,
        primaryColor,
        setMode,
        setPrimaryColor: (color) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(color || '')) setPrimaryColor(color.toUpperCase());
        },
        toggleColorMode: () => setMode((current) => current === 'light' ? 'dark' : 'light'),
    }), [mode, primaryColor]);
    const theme = useMemo(() => getTheme(mode, primaryColor), [mode, primaryColor]);

    useEffect(() => {
        document.documentElement.dataset.theme = mode;
        document.documentElement.style.setProperty('--color-primary', primaryColor);
        window.localStorage.setItem('app.theme', mode);
        window.localStorage.setItem('app.brand', primaryColor);
    }, [mode, primaryColor]);

    useEffect(() => {
        updateZiggy(initialPage);
        scheduleTranslations(initialPage);
        return router.on('navigate', (event) => {
            const nextPage = event.detail.page;
            updateZiggy(nextPage);
            scheduleTranslations(nextPage);
            if (!window.localStorage.getItem('app.brand')) {
                const color = nextPage?.props?.settings?.app?.theme_primary_color;
                if (/^#[0-9A-Fa-f]{6}$/.test(color || '')) setPrimaryColor(color.toUpperCase());
            }
        });
    }, []);

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <SpaProvider initialPage={initialPage} resolve={resolvePage}>
                    {({ PageComponent, page, loading, navigationError }) => {
                        if (!PageComponent) return <PageLoadingState initial />;
                        const content = (
                            <ContentTransition loading={loading} error={navigationError}>
                                <PageComponent {...page.props} />
                            </ContentTransition>
                        );
                        const isAuthenticated = Boolean(page.props?.auth?.user);
                        if (!isAuthenticated) return content;

                        const ShellLayout = page.component === 'POS/Index' ? PosLayout : MainLayout;

                        return (
                            <ShellLayout header={shellHeader}>
                                <PersistentShellContext.Provider value={shellContext}>
                                    {content}
                                </PersistentShellContext.Provider>
                            </ShellLayout>
                        );
                    }}
                </SpaProvider>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}

createRoot(document.getElementById('app')).render(<Application />);
