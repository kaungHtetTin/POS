import React from 'react';

const icons = {
    grid: [
        ['rect', { x: 3, y: 3, width: 7, height: 7, rx: 1 }],
        ['rect', { x: 14, y: 3, width: 7, height: 7, rx: 1 }],
        ['rect', { x: 3, y: 14, width: 7, height: 7, rx: 1 }],
        ['rect', { x: 14, y: 14, width: 7, height: 7, rx: 1 }],
    ],
    box: [
        ['path', { d: 'M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z' }],
        ['path', { d: 'm4.5 8.5 7.5 4 7.5-4' }],
        ['path', { d: 'M12 12.5V20' }],
    ],
    bag: [
        ['path', { d: 'M6 8h12l-1 12H7L6 8Z' }],
        ['path', { d: 'M9 8V6a3 3 0 0 1 6 0v2' }],
    ],
    card: [
        ['rect', { x: 3, y: 6, width: 18, height: 12, rx: 2 }],
        ['path', { d: 'M3 10h18' }],
        ['path', { d: 'M7 15h4' }],
    ],
    receipt: [
        ['path', { d: 'M7 3h10v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V3Z' }],
        ['path', { d: 'M9 8h6M9 12h6M9 16h4' }],
    ],
    chart: [
        ['path', { d: 'M4 19V5' }],
        ['path', { d: 'M8 19v-7' }],
        ['path', { d: 'M12 19V9' }],
        ['path', { d: 'M16 19v-4' }],
        ['path', { d: 'M20 19V7' }],
    ],
    wallet: [
        ['path', { d: 'M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12' }],
        ['path', { d: 'M16 12h5v4h-5a2 2 0 0 1 0-4Z' }],
    ],
    users: [
        ['path', { d: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20' }],
        ['circle', { cx: 10, cy: 8, r: 3 }],
        ['path', { d: 'M20 20v-1a3 3 0 0 0-2.4-2.9' }],
        ['path', { d: 'M16.5 5.2a3 3 0 0 1 0 5.6' }],
    ],
    user: [
        ['circle', { cx: 12, cy: 8, r: 4 }],
        ['path', { d: 'M4 21a8 8 0 0 1 16 0' }],
    ],
    truck: [
        ['path', { d: 'M3 6h11v10H3V6Z' }],
        ['path', { d: 'M14 10h4l3 3v3h-7v-6Z' }],
        ['circle', { cx: 7, cy: 18, r: 2 }],
        ['circle', { cx: 17, cy: 18, r: 2 }],
    ],
    pill: [
        ['path', { d: 'M10.5 20.5 20.5 10.5a4.2 4.2 0 0 0-6-6L4.5 14.5a4.2 4.2 0 0 0 6 6Z' }],
        ['path', { d: 'm8 11 5 5' }],
    ],
    tag: [
        ['path', { d: 'M20 13 13 20 4 11V4h7l9 9Z' }],
        ['circle', { cx: 8.5, cy: 8.5, r: 1 }],
    ],
    ruler: [
        ['path', { d: 'M4 17 17 4l3 3L7 20l-3-3Z' }],
        ['path', { d: 'm8 13 2 2M11 10l2 2M14 7l2 2' }],
    ],
    percent: [
        ['path', { d: 'm19 5-14 14' }],
        ['circle', { cx: 7, cy: 7, r: 2 }],
        ['circle', { cx: 17, cy: 17, r: 2 }],
    ],
    arrows: [
        ['path', { d: 'M7 7h12l-3-3' }],
        ['path', { d: 'm16 10 3-3' }],
        ['path', { d: 'M17 17H5l3 3' }],
        ['path', { d: 'm8 14-3 3' }],
    ],
    rotate: [
        ['path', { d: 'M4 12a8 8 0 0 1 13.6-5.7L20 8' }],
        ['path', { d: 'M20 4v4h-4' }],
        ['path', { d: 'M20 12a8 8 0 0 1-13.6 5.7L4 16' }],
        ['path', { d: 'M4 20v-4h4' }],
    ],
    sliders: [
        ['path', { d: 'M4 7h10' }],
        ['path', { d: 'M18 7h2' }],
        ['circle', { cx: 16, cy: 7, r: 2 }],
        ['path', { d: 'M4 17h2' }],
        ['path', { d: 'M10 17h10' }],
        ['circle', { cx: 8, cy: 17, r: 2 }],
    ],
    store: [
        ['path', { d: 'M4 10h16l-1.5-5h-13L4 10Z' }],
        ['path', { d: 'M5 10v10h14V10' }],
        ['path', { d: 'M9 20v-6h6v6' }],
    ],
    shieldCheck: [
        ['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z' }],
        ['path', { d: 'm9 12 2 2 4-5' }],
    ],
    id: [
        ['rect', { x: 4, y: 5, width: 16, height: 14, rx: 2 }],
        ['circle', { cx: 9, cy: 11, r: 2 }],
        ['path', { d: 'M13 10h4M13 14h3M7 16a4 4 0 0 1 4 0' }],
    ],
    history: [
        ['path', { d: 'M4 7v5h5' }],
        ['path', { d: 'M5.5 15A7 7 0 1 0 6 7.1L4 12' }],
        ['path', { d: 'M12 8v5l3 2' }],
    ],
    settings: [
        ['circle', { cx: 12, cy: 12, r: 3 }],
        ['path', { d: 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3-.2-.1a1.7 1.7 0 0 0-1.9-.3 8 8 0 0 1-1.5.6 1.7 1.7 0 0 0-1.2 1.6V22h-3v-.2a1.7 1.7 0 0 0-1.2-1.6 8 8 0 0 1-1.5-.6 1.7 1.7 0 0 0-1.9.3l-.2.1-2-3 .1-.1a1.7 1.7 0 0 0 .3-1.9 8 8 0 0 1-.6-1.5A1.7 1.7 0 0 0 1.4 12H1V9h.4A1.7 1.7 0 0 0 3 7.8a8 8 0 0 1 .6-1.5 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3 .2.1a1.7 1.7 0 0 0 1.9.3 8 8 0 0 1 1.5-.6A1.7 1.7 0 0 0 10 .4V0h3v.4a1.7 1.7 0 0 0 1.2 1.6 8 8 0 0 1 1.5.6 1.7 1.7 0 0 0 1.9-.3l.2-.1 2 3-.1.1a1.7 1.7 0 0 0-.3 1.9c.3.5.5 1 .6 1.5A1.7 1.7 0 0 0 21.6 10h.4v3h-.4a1.7 1.7 0 0 0-2.2 2Z' }],
    ],
    book: [
        ['path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z' }],
        ['path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 8H20' }],
    ],
    menu: [
        ['path', { d: 'M4 7h16M4 12h16M4 17h16' }],
    ],
    logout: [
        ['path', { d: 'M10 4H5v16h5' }],
        ['path', { d: 'M14 16l4-4-4-4' }],
        ['path', { d: 'M18 12H9' }],
    ],
    globe: [
        ['circle', { cx: 12, cy: 12, r: 9 }],
        ['path', { d: 'M3 12h18' }],
        ['path', { d: 'M12 3a14 14 0 0 1 0 18' }],
        ['path', { d: 'M12 3a14 14 0 0 0 0 18' }],
    ],
    palette: [
        ['path', { d: 'M12 3a9 9 0 0 0 0 18h1.5a1.8 1.8 0 0 0 .6-3.5 1.8 1.8 0 0 1 1.1-3.5H16a5 5 0 0 0 5-5c0-3.3-3.8-6-9-6Z' }],
        ['circle', { cx: 7.5, cy: 10, r: 1 }],
        ['circle', { cx: 10, cy: 7, r: 1 }],
        ['circle', { cx: 14, cy: 7, r: 1 }],
    ],
    sun: [
        ['circle', { cx: 12, cy: 12, r: 4 }],
        ['path', { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }],
    ],
    moon: [
        ['path', { d: 'M21 13.2A8 8 0 1 1 10.8 3a6.5 6.5 0 0 0 10.2 10.2Z' }],
    ],
    check: [
        ['path', { d: 'm5 12 4 4L19 6' }],
    ],
};

export default function SimpleIcon({ name = 'grid', size = 18, strokeWidth = 1.8, ...props }) {
    const icon = icons[name] || icons.grid;
    const viewBox = icon.find(([, attrs]) => attrs.viewBox)?.[1].viewBox || '0 0 24 24';

    return (
        <svg
            width={size}
            height={size}
            viewBox={viewBox}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            {icon.map(([Tag, attrs], index) => {
                const { viewBox: ignored, ...rest } = attrs;
                return <Tag key={index} {...rest} />;
            })}
        </svg>
    );
}
