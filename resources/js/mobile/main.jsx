import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installLocalization } from './localization';
import './styles.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        const config = window.cashierPwa || {};
        navigator.serviceWorker.register(config.serviceWorkerUrl || '/cashier-sw.js', {
            scope: config.scopeUrl || '/cashier/',
        }).catch(() => undefined);
    });
}

const appRoot = document.getElementById('cashier-app');
installLocalization(appRoot);
createRoot(appRoot).render(<App />);
