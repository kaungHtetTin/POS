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

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

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
    },
    progress: {
        color: '#4B5563',
    },
});
