import React from 'react';
import { Head, Link } from '@/spa';
import ApplicationLogo from '@/Components/ApplicationLogo';
import SimpleIcon from '@/Components/SimpleIcon';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';

const capabilities = [
    ['card', 'Fast checkout', 'Search or scan medicines, review the cart, and complete payment from one focused workspace.'],
    ['box', 'Batch stock control', 'Track branch quantities, batches, expiry dates, purchases, and transfers in one system.'],
    ['chart', 'Clear financials', 'Follow sales, returns, receivables, supplier balances, cash shifts, and operating profit.'],
];

export default function Welcome({ auth, settings = {} }) {
    const pharmacyName = settings.invoice?.pharmacy_name || 'Pharmacy POS';

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Head title="Welcome" />

            <Box component="header" sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Container maxWidth="lg">
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 56 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: '#0C4A3A', color: '#FFFFFF' }}>
                                <ApplicationLogo sx={{ width: 22, height: 22, color: 'inherit' }} />
                            </Box>
                            <Typography variant="subtitle1" fontWeight={800}>{pharmacyName}</Typography>
                        </Stack>
                        <Button component={Link} href={auth?.user ? route('dashboard') : route('login')} variant="contained">
                            {auth?.user ? 'Open dashboard' : 'Log in'}
                        </Button>
                    </Stack>
                </Container>
            </Box>

            <Box component="main">
                <Box sx={{ bgcolor: '#0C4A3A', color: '#FFFFFF', py: { xs: 7, md: 10 } }}>
                    <Container maxWidth="lg">
                        <Box sx={{ maxWidth: 720 }}>
                            <Typography variant="caption" sx={{ color: '#D9F75F', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                                Pharmacy operations
                            </Typography>
                            <Typography component="h1" sx={{ mt: 1, fontSize: { xs: 34, md: 48 }, lineHeight: 1.08, fontWeight: 800, letterSpacing: '-.025em' }}>
                                Run every sale, batch, and balance with confidence.
                            </Typography>
                            <Typography sx={{ mt: 2, maxWidth: 620, color: 'rgba(255,255,255,.72)', fontSize: { xs: 15, md: 17 }, lineHeight: 1.65 }}>
                                A practical workspace for checkout, inventory, purchasing, customer accounts, supplier payments, returns, and daily reporting.
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 3, alignItems: { xs: 'stretch', sm: 'center' } }}>
                                <Button component={Link} href={auth?.user ? route('pos.index') : route('login')} variant="contained" sx={{ bgcolor: '#D9F75F', color: '#17251F', '&:hover': { bgcolor: '#CBEA4C' } }}>
                                    {auth?.user ? 'Open POS' : 'Start working'}
                                </Button>
                                {auth?.user && <Button component={Link} href={route('dashboard')} variant="outlined" sx={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,.34)', '&:hover': { borderColor: '#FFFFFF', bgcolor: 'rgba(255,255,255,.08)' } }}>View dashboard</Button>}
                            </Stack>
                        </Box>
                    </Container>
                </Box>

                <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                    <Typography component="h2" variant="h4" fontWeight={800}>One dependable operating flow</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: .5, mb: 2.5 }}>Designed for quick recognition, compact information, and direct task completion.</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
                        {capabilities.map(([icon, title, description]) => (
                            <Paper key={title} sx={{ p: 2 }}>
                                <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: '#DDF5E9', color: '#0C4A3A' }}>
                                    <SimpleIcon name={icon} size={19} />
                                </Box>
                                <Typography variant="subtitle1" sx={{ mt: 1.5 }}>{title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: .5, lineHeight: 1.6 }}>{description}</Typography>
                            </Paper>
                        ))}
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}
