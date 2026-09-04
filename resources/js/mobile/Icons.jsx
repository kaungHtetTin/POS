import React from 'react';

export default function Icon({ name, size = 22, strokeWidth = 2, className = '' }) {
    const paths = {
        cart: <><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.4 10.5a2 2 0 0 0 2 1.5h8.8a2 2 0 0 0 2-1.6L22 8H6"/></>,
        history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
        user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
        search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
        plus: <path d="M12 5v14M5 12h14"/>,
        minus: <path d="M5 12h14"/>,
        close: <path d="m6 6 12 12M18 6 6 18"/>,
        chevron: <path d="m9 18 6-6-6-6"/>,
        arrow: <path d="m15 18-6-6 6-6"/>,
        store: <><path d="M4 10v10h16V10"/><path d="M3 4h18l-1 6a3 3 0 0 1-5 1 3 3 0 0 1-6 0 3 3 0 0 1-5-1Z"/></>,
        wifiOff: <><path d="m2 2 20 20M8.5 8.5A9.7 9.7 0 0 1 21 10M3 10a15 15 0 0 1 3-2M6.5 14a8 8 0 0 1 7.5-2M10 18a3 3 0 0 1 4 0M12 21h.01"/></>,
        check: <path d="m5 12 4 4L19 6"/>,
        sync: <><path d="M20 7h-5V2"/><path d="M20 7a9 9 0 0 0-15-2M4 17h5v5"/><path d="M4 17a9 9 0 0 0 15 2"/></>,
        receipt: <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 5h6M9 11h6M9 15h4"/>,
        lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
        eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
        camera: <><path d="M4 7h3l2-3h6l2 3h3v13H4Z"/><circle cx="12" cy="13" r="4"/></>,
        logout: <><path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></>,
        download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></>,
        share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>,
        cash: <><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9H5v1M18 15h1v-1"/></>,
        language: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
    };

    return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[name] || paths.receipt}
        </svg>
    );
}
