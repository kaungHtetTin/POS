import './bootstrap';
import useSpreadsheetNavigation from './Components/useSpreadsheetNavigation';
import '../css/app.css';

import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import getTheme from './Theme/theme';
import { ColorModeContext } from './contexts/ColorModeContext';
import PersistentShellContext from './contexts/PersistentShellContext';
import ContentTransition from './Components/PageLoadingState';
import MainLayout from './Layouts/MainLayout';
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

function Application() {
    useSpreadsheetNavigation();
    const defaultPrimaryColor = initialPage.props?.settings?.app?.theme_primary_color || '#176B5B';
    const [mode, setMode] = useState(() => {
        const stored = window.localStorage.getItem('app.theme');
        return stored === 'dark' || stored === 'light' ? stored : 'light';
    });
    const [primaryColor, setPrimaryColor] = useState(() => {
        const stored = window.localStorage.getItem('app.brand');
        return /^#[0-9A-Fa-f]{6}$/.test(stored || '') ? stored.toUpperCase() : defaultPrimaryColor;
    });
    const [shellHeader, setShellHeader] = useState('');
    const [appBarTarget, setAppBarTarget] = useState(null);
    const [appBarBackTarget, setAppBarBackTarget] = useState(null);
    const shellContext = useMemo(() => ({ setHeader: setShellHeader, appBarTarget, appBarBackTarget }), [appBarTarget, appBarBackTarget]);

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
                    {({ PageComponent, page, loading, preservingState, pendingPage, navigationError }) => {
                        const content = (
                            <ContentTransition
                                loading={loading}
                                keepContent={preservingState || pendingPage?.samePage}
                                hasContent={Boolean(PageComponent)}
                                component={pendingPage?.component || (!PageComponent ? page.component : '')}
                                url={pendingPage?.url || page.url}
                                error={navigationError}
                            >
                                {PageComponent && <PageComponent {...page.props} />}
                            </ContentTransition>
                        );
                        const isAuthenticated = Boolean(page.props?.auth?.user);
                        if (!isAuthenticated) return content;

                        return (
                            <MainLayout header={shellHeader} setAppBarTarget={setAppBarTarget} setAppBarBackTarget={setAppBarBackTarget}>
                                <PersistentShellContext.Provider value={shellContext}>
                                    {content}
                                </PersistentShellContext.Provider>
                            </MainLayout>
                        );
                    }}
                </SpaProvider>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}

createRoot(document.getElementById('app')).render(<Application />);
