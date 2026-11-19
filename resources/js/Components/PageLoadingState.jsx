import React, { useEffect, useState } from 'react';
import { alpha } from '@mui/material/styles';
import { Alert, Box, LinearProgress, Skeleton, Stack } from '@mui/material';
import PageContainer from './PageContainer';

const loadingShape = (component = '', url = '') => {
    if (/Dashboard/i.test(component) || /\/dashboard\b/.test(url)) return 'dashboard';
    if (/(?:Create|Edit|Settings|Profile|Auth)(?:\/|$)/i.test(component)
        || /\/(?:create|edit|settings|profile|login|register)(?:\/|\?|$)/i.test(url)) return 'form';
    return 'table';
};

function TablePlaceholder() {
    return (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '6px', bgcolor: 'background.paper', overflow: 'hidden' }}>
            {Array.from({ length: 7 }, (_, row) => (
                <Box key={row} sx={{
                    display: 'grid', gridTemplateColumns: { xs: '2fr 1fr 1fr', md: '2fr 1fr 1fr 1fr 0.75fr' },
                    gap: 2, alignItems: 'center', px: 1.25, minHeight: row === 0 ? 34 : 38,
                    borderBottom: row < 6 ? 1 : 0, borderColor: 'divider',
                }}>
                    {[72, 52, 44, 60, 38].map((width, column) => (
                        <Skeleton key={column} variant="rounded" height={row === 0 ? 7 : 9}
                            width={`${row % 2 ? width - 10 : width}%`}
                            sx={{ display: column > 2 ? { xs: 'none', md: 'block' } : 'block' }} />
                    ))}
                </Box>
            ))}
        </Box>
    );
}

export function PageContentSkeleton({ component, url }) {
    const shape = loadingShape(component, url);
    return (
        <PageContainer role="status" aria-label="Loading page content" data-loading-shape={shape} sx={{ minHeight: 320 }}>
            <Box aria-hidden="true">
                <Stack spacing={1.75}>
                    <Stack spacing={1} sx={{ mb: 0.5 }}>
                        <Skeleton variant="rounded" width={165} height={17} />
                        <Skeleton variant="rounded" width="min(65%, 290px)" height={8} />
                    </Stack>
                    {shape === 'form' ? (
                        <Box sx={{ maxWidth: 880, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            {Array.from({ length: 6 }, (_, index) => (
                                <Stack key={index} spacing={0.75}>
                                    <Skeleton variant="rounded" width={70 + (index % 3) * 15} height={7} />
                                    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '6px', bgcolor: 'background.paper', p: 1.25, height: 36 }}>
                                        <Skeleton variant="rounded" width="48%" height={8} />
                                    </Box>
                                </Stack>
                            ))}
                        </Box>
                    ) : (
                        <>
                            {shape === 'dashboard' && (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1 }}>
                                    {[0, 1, 2, 3].map(index => <Stack key={index} spacing={1.25} sx={{ p: 1.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '6px' }}>
                                        <Skeleton variant="rounded" width="55%" height={7} />
                                        <Skeleton variant="rounded" width="30%" height={15} />
                                    </Stack>)}
                                </Box>
                            )}
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: 34 }}>
                                <Skeleton variant="rounded" width="min(45%, 230px)" height={9} />
                                <Skeleton variant="rounded" width={75} height={9} />
                            </Stack>
                            <TablePlaceholder />
                        </>
                    )}
                </Stack>
            </Box>
        </PageContainer>
    );
}

export default function ContentTransition({ loading, keepContent, hasContent, component, url, error, children }) {
    const [showLoading, setShowLoading] = useState(false);
    useEffect(() => {
        setShowLoading(false);
        if (!loading) return undefined;
        const timer = window.setTimeout(() => setShowLoading(true), 180);
        return () => window.clearTimeout(timer);
    }, [loading, url]);

    const showSkeleton = loading && showLoading && (!hasContent || !keepContent);
    return (
        <Box aria-busy={loading} sx={{ position: 'relative', minHeight: 240 }}>
            {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
            {showSkeleton ? <PageContentSkeleton component={component} url={url} /> : children}
            {loading && showLoading && hasContent && keepContent && (
                <LinearProgress aria-label="Updating page content" sx={theme => ({
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 1,
                    pointerEvents: 'none', bgcolor: alpha(theme.palette.primary.main, 0.05),
                    '& .MuiLinearProgress-bar': { bgcolor: alpha(theme.palette.primary.main, 0.4) },
                    '@media (prefers-reduced-motion: reduce)': {
                        '& .MuiLinearProgress-bar': { animation: 'none', transform: 'none', width: '25%' },
                    },
                })} />
            )}
        </Box>
    );
}
