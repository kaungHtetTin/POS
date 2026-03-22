import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import getTheme from './Theme/theme';
import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { ColorModeContext } from './contexts/ColorModeContext';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Laravel';
const translatableAttributes = ['title', 'placeholder', 'aria-label'];

const normalizeDuplicatedBasePath = (pathname, base) => {
    if (!pathname || !base || base === '/') {
        return pathname;
    }

    const cleanBase = `/${String(base).replace(/^\/+|\/+$/g, '')}`;
    if (cleanBase === '/') {
        return pathname;
    }

    const doubled = `${cleanBase}${cleanBase}`;
    let nextPath = pathname;

    while (nextPath === doubled || nextPath.startsWith(`${doubled}/`)) {
        nextPath = nextPath.substring(cleanBase.length);
    }

    return nextPath;
};

const normalizeDuplicatedBase = (url, base) => {
    if (!url) {
        return url;
    }

    const isAbsolute = /^https?:\/\//i.test(url);

    try {
        const parsed = new URL(url, window.location.origin);
        const normalizedPath = normalizeDuplicatedBasePath(parsed.pathname, base);
        parsed.pathname = normalizedPath;
        return isAbsolute
            ? `${parsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
            : `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return url;
    }
};

const coerceNavigationUrl = (url, base) => {
    if (url === undefined || url === null || url === '') {
        return url;
    }

    const raw = String(url);
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
    const normalizedInput = hasScheme || raw.startsWith('/')
        ? raw
        : `/${raw.replace(/^\/+/, '')}`;

    return normalizeDuplicatedBase(normalizedInput, base);
};

const translateValue = (value, translations) => {
    if (!value || typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    const translated = translations?.[trimmed];
    if (!translated) {
        return value;
    }

    return value.replace(trimmed, translated);
};

const applyStaticTranslations = (translations) => {
    if (!translations || typeof document === 'undefined') {
        return;
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
        const parentTag = node.parentElement?.tagName;
        if (!parentTag || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parentTag)) {
            return;
        }

        node.nodeValue = translateValue(node.nodeValue, translations);
    });

    translatableAttributes.forEach((attribute) => {
        document.querySelectorAll(`[${attribute}]`).forEach((element) => {
            const current = element.getAttribute(attribute);
            const next = translateValue(current, translations);
            if (next && next !== current) {
                element.setAttribute(attribute, next);
            }
        });
    });
};

const scheduleStaticTranslations = (translations) => {
    [0, 150, 400, 800].forEach((delay) => {
        window.setTimeout(() => applyStaticTranslations(translations), delay);
    });
};

const normalizeCurrentBrowserUrl = (base) => {
    const correctedPath = normalizeDuplicatedBasePath(window.location.pathname, base);
    if (correctedPath !== window.location.pathname) {
        window.history.replaceState(null, '', `${correctedPath}${window.location.search}${window.location.hash}`);
    }
};

const buildGetUrl = (rawUrl, data = {}) => {
    const parsed = new URL(rawUrl, window.location.origin);
    const params = new URLSearchParams(parsed.search);

    Object.entries(data || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            params.delete(key);
            return;
        }

        if (Array.isArray(value)) {
            params.delete(key);
            value.forEach((item) => {
                if (item !== undefined && item !== null && item !== '') {
                    params.append(`${key}[]`, String(item));
                }
            });
            return;
        }

        params.set(key, String(value));
    });

    const query = params.toString();
    parsed.search = query ? `?${query}` : '';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        // Fix for subfolder routing duplication
        const base = props.initialPage.props.ziggy?.base || '';
        props.initialPage.url = normalizeDuplicatedBase(props.initialPage.url, base);
        normalizeCurrentBrowserUrl(base);

        if (!window.__forceBrowserGetNavigation && typeof router.visit === 'function') {
            const originalVisit = router.visit.bind(router);
            window.__forceBrowserGetNavigation = true;

            router.visit = (url, options = {}) => {
                const method = String(options?.method || 'get').toLowerCase();
                const rawUrl = typeof url === 'string' ? url : (url?.url || String(url));
                const withQuery = method === 'get' ? buildGetUrl(rawUrl, options?.data || {}) : rawUrl;
                const target = coerceNavigationUrl(withQuery, base);

                if (method === 'get') {
                    window.location.assign(target);
                    return;
                }

                return originalVisit(target, options);
            };
        }

        if (!window.__historyUrlGuardBound) {
            const originalPushState = window.history.pushState.bind(window.history);
            const originalReplaceState = window.history.replaceState.bind(window.history);

            window.history.pushState = (state, title, url) => (
                originalPushState(state, title, coerceNavigationUrl(url, base))
            );

            window.history.replaceState = (state, title, url) => (
                originalReplaceState(state, title, coerceNavigationUrl(url, base))
            );

            window.__historyUrlGuardBound = true;
        }

        // Force browser-native navigation for GET requests to avoid SPA history
        // rewriting duplicated base paths in subfolder deployments.

        // Set global locale/defaults for Ziggy
        if (props.initialPage.props.locale) {
            const locale = props.initialPage.props.locale;
            window.Ziggy = window.Ziggy || {};
            window.Ziggy.locale = locale;
            window.Ziggy.defaults = {
                ...(window.Ziggy.defaults || {}),
                locale,
            };
        }

        if (props.initialPage.props.locale === 'my') {
            scheduleStaticTranslations(props.initialPage.props.translations || {});
        }

        if (!window.__inertiaUrlGuardBound) {
            window.__inertiaUrlGuardBound = true;
            router.on('navigate', (event) => {
                const pageBase = event?.detail?.page?.props?.ziggy?.base || base;
                normalizeCurrentBrowserUrl(pageBase);
            });
        }

        if (!el.dataset.rendered) {
            const root = createRoot(el);
            el.dataset.rendered = 'true';

            const Root = () => {
                const [mode, setMode] = useState('light');
                const colorMode = useMemo(
                    () => ({
                        toggleColorMode: () => {
                            setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
                        },
                    }),
                    [],
                );

                const theme = useMemo(() => getTheme(mode), [mode]);

                return (
                    <ColorModeContext.Provider value={colorMode}>
                        <ThemeProvider theme={theme}>
                            <CssBaseline />
                            <App {...props} />
                        </ThemeProvider>
                    </ColorModeContext.Provider>
                );
            };

            root.render(<Root />);
        }
    },
    progress: {
        color: '#4B5563',
    },
});

router.on('navigate', (event) => {
    const page = event?.detail?.page;
    if (!page || page.props?.locale !== 'my') {
        return;
    }

    scheduleStaticTranslations(page.props.translations || {});
});
