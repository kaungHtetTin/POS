import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import getTheme from './Theme/theme';
import { useState, useMemo, createContext } from 'react';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Laravel';

// Fix for subfolder routing duplication (XAMPP)
if (window.laravel_base) {
    const base = new URL(window.laravel_base).pathname.replace(/\/$/, '');
    if (base && base !== '/' && window.location.pathname.startsWith(base + base)) {
        const correctPath = window.location.pathname.substring(base.length);
        window.history.replaceState(null, '', correctPath);
    }
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        // Ensure initialPage.url is also corrected if duplication happened
        const base = props.initialPage.props.ziggy?.base || '';
        if (base && base !== '/' && props.initialPage.url.startsWith(base + base)) {
            props.initialPage.url = props.initialPage.url.substring(base.length);
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
