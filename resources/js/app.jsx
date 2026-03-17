import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import getTheme from './Theme/theme';
import { useState, useMemo, createContext } from 'react';
import { router } from '@inertiajs/react';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

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
        if (normalizedPath === parsed.pathname) {
            return url;
        }

        parsed.pathname = normalizedPath;
        return isAbsolute
            ? `${parsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
            : `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return url;
    }
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

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        // Fix for subfolder routing duplication
        const base = props.initialPage.props.ziggy?.base || '';
        props.initialPage.url = normalizeDuplicatedBase(props.initialPage.url, base);

        const correctedCurrentPath = normalizeDuplicatedBasePath(window.location.pathname, base);
        if (correctedCurrentPath !== window.location.pathname) {
            window.history.replaceState(null, '', `${correctedCurrentPath}${window.location.search}${window.location.hash}`);
        }

        if (!window.__inertiaNormalizeBound) {
            window.__inertiaNormalizeBound = true;

            if (typeof window.route === 'function' && !window.__routeNormalizePatched) {
                const originalRoute = window.route.bind(window);
                const wrappedRoute = (...args) => {
                    const result = originalRoute(...args);
                    if (typeof result === 'string') {
                        return normalizeDuplicatedBase(result, base);
                    }
                    return result;
                };
                Object.assign(wrappedRoute, originalRoute);
                window.route = wrappedRoute;
                window.__routeNormalizePatched = true;
            }

            if (!window.__inertiaVisitPatched && typeof router.visit === 'function') {
                const originalVisit = router.visit.bind(router);
                router.visit = (url, options = {}) => originalVisit(normalizeDuplicatedBase(url, base), options);
                window.__inertiaVisitPatched = true;
            }

            router.on('navigate', (event) => {
                const page = event?.detail?.page;
                if (!page || !page.url) {
                    return;
                }

                const pageBase = page.props?.ziggy?.base || base;
                page.url = normalizeDuplicatedBase(page.url, pageBase);
            });
        }

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
