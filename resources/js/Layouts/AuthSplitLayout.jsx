import React from 'react';
import { Link, usePage } from '@/spa';
import ApplicationLogo from '@/Components/ApplicationLogo';
import SimpleIcon from '@/Components/SimpleIcon';
import { Box, Stack, Typography } from '@mui/material';

export default function AuthSplitLayout({ children, title, subtitle, topBarContent, compact = false }) {
    const { settings = {}, ziggy = {} } = usePage().props;
    const pharmacyName = settings.invoice?.pharmacy_name || 'Pharmacy POS';
    const base = ziggy.base || window.laravel_base || '';
    const logo = settings.invoice?.logo_path ? `${base}/storage/${String(settings.invoice.logo_path).replace(/^\/+/, '')}` : null;
    return <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' }, bgcolor: 'background.paper' }}>
        <Stack sx={{ p: compact ? { xs: 2, md: 3 } : { xs: 3, md: 5 }, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Stack component={Link} href={route('login')} direction="row" spacing={1.25} alignItems="center" sx={{ textDecoration: 'none', color: 'text.primary' }}>
                    <Box sx={{ width: compact ? 32 : 40, height: compact ? 32 : 40, borderRadius: compact ? '9px' : '13px', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center' }}>{logo ? <Box component="img" src={logo} alt={pharmacyName} sx={{ width: 30, height: 30, objectFit: 'contain' }} /> : <ApplicationLogo sx={{ width: 25, height: 25 }} />}</Box><Typography fontWeight={800}>{pharmacyName}</Typography>
                </Stack>{topBarContent}
            </Stack>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: compact ? 3 : 8 }}>
                <Box sx={{ width: '100%', maxWidth: compact ? 336 : 400 }}>
                    <Typography sx={{ fontSize: 11, letterSpacing: '0.15em', fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', mb: compact ? 1 : 2 }}>Your pharmacy workspace</Typography>
                    <Typography component="h1" sx={{ fontSize: compact ? { xs: 24, md: 27 } : { xs: 30, md: 36 }, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-1px', mb: compact ? 0.75 : 1.5 }}>{title}</Typography>
                    <Typography color="text.secondary" sx={{ mb: compact ? 2 : 4, fontSize: compact ? 12 : undefined, lineHeight: 1.5 }}>{subtitle}</Typography>
                    {children}
                </Box>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}><SimpleIcon name="shieldCheck" size={16} /><Typography variant="caption">Secure access for your pharmacy team</Typography></Stack>
        </Stack>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, m: compact ? 1.5 : 2, p: compact ? { md: 3, lg: 4 } : { md: 5, lg: 7 }, borderRadius: compact ? '16px' : '28px', bgcolor: '#EAF1E9', color: '#243B30', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
            <Box data-login-description sx={{ width: '100%', maxWidth: compact ? 390 : undefined, mx: compact ? 'auto' : 0 }}>
            <Typography sx={{ fontSize: compact ? 10 : 12, letterSpacing: '0.12em', fontWeight: 700, color: '#527362', mb: compact ? 1.25 : 3 }}>LESS FRICTION. MORE FOCUS.</Typography>
            <Typography sx={{ fontSize: compact ? { md: 26, lg: 30 } : { md: 40, lg: 54 }, lineHeight: compact ? 1.18 : 1.08, letterSpacing: compact ? '-0.6px' : '-2px', fontWeight: 600, maxWidth: 490 }}>A better rhythm<br />for your pharmacy.</Typography>
            <Typography sx={{ mt: compact ? 1.5 : 3, maxWidth: 400, color: '#597363', fontSize: compact ? 12 : undefined, lineHeight: compact ? 1.5 : 1.8 }}>From the first delivery to the last receipt. Keep your medicines, stock and team working together.</Typography>
            <Box sx={{ mt: compact ? 2.5 : 5, position: 'relative', py: compact ? 0 : 2 }}>
                <Box sx={{ position: 'absolute', left: compact ? 14 : 25, top: compact ? 20 : 36, bottom: compact ? 20 : 36, width: 1, borderLeft: '1px dashed #ABC5B2' }} />
                <Stack spacing={compact ? 1 : 2}>{[
                    ['01', 'Receive with confidence', 'Batch details and expiry tracking', 'truck'],
                    ['02', 'Serve with clarity', 'Barcode checkout and medicine units', 'pill'],
                    ['03', 'Close with control', 'Cash sessions and business reports', 'chart'],
                ].map(([number, heading, detail, icon]) => <Stack key={number} direction="row" spacing={compact ? 1 : 2} alignItems="center" sx={{ position: 'relative' }}><Box sx={{ width: compact ? 28 : 50, height: compact ? 28 : 50, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#EAF1E9', border: '1px solid #BBD0BF', fontSize: compact ? 10 : 12, fontWeight: 700 }}>{number}</Box><Stack direction="row" alignItems="center" spacing={compact ? 1 : 2} sx={{ p: compact ? 1 : 2, bgcolor: '#FFFFFF', borderRadius: compact ? '8px' : '16px', flex: 1, minWidth: 0 }}><Box sx={{ color: '#176B5B' }}><SimpleIcon name={icon} size={compact ? 18 : 24} /></Box><Box><Typography sx={{ fontSize: compact ? 12 : 14, lineHeight: 1.4, fontWeight: 700 }}>{heading}</Typography><Typography sx={{ fontSize: compact ? 10.5 : 12, color: '#728078', lineHeight: 1.4, mt: compact ? 0.25 : 0.5 }}>{detail}</Typography></Box></Stack></Stack>)}</Stack>
            </Box>
            </Box>
        </Box>
    </Box>;
}
