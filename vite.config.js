import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const port = Number(env.VITE_DEV_SERVER_PORT || 5173);
    const hmrHost = env.VITE_DEV_SERVER_HOST || 'localhost';
    let productionBase = '/build/';

    if (env.APP_URL) {
        try {
            const appPath = new URL(env.APP_URL).pathname.replace(/\/+$/, '');
            productionBase = `${appPath || ''}/build/`;
        } catch {
            productionBase = '/build/';
        }
    }

    return {
        base: mode === 'production' ? productionBase : '/',
        server: {
            host: '0.0.0.0',
            port,
            strictPort: true,
            cors: true,
            hmr: {
                host: hmrHost,
                port,
                protocol: 'ws',
            },
        },
        plugins: [
            laravel({
                input: 'resources/js/app.jsx',
                refresh: true,
            }),
            react(),
        ],
    };
});
