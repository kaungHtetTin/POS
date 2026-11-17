import React, { useLayoutEffect, useRef } from 'react';
import { Box } from '@mui/material';

export default function ViewportPanel({ children, sx = {} }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const resize = () => {
            const panel = ref.current;
            if (!panel) return;
            const viewport = window.visualViewport;
            const bottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
            panel.style.height = `${Math.max(120, bottom - panel.getBoundingClientRect().top - 14)}px`;
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(ref.current.parentElement);
        window.addEventListener('resize', resize);
        window.visualViewport?.addEventListener('resize', resize);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', resize);
            window.visualViewport?.removeEventListener('resize', resize);
        };
    }, []);
    return <Box ref={ref} sx={{ minHeight: 0, ...sx }}>{children}</Box>;
}
