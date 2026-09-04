import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        const config = window.cashierPwa || {};
        navigator.serviceWorker.register(config.serviceWorkerUrl || '/cashier-sw.js', {
            scope: config.scopeUrl || '/cashier/',
        }).catch(() => undefined);
    });
}

createRoot(document.getElementById('cashier-app')).render(<App />);
