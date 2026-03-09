import React from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import {
    Box,
    Typography,
    Stack,
    IconButton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    ShoppingCart as POSIcon,
    Inventory as InventoryIcon,
    Sync as SyncIcon,
} from '@mui/icons-material';

export default function AuthSplitLayout({ children, title, subtitle, topBarContent }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Left panel feature items adapted for Pharmacy POS
    const features = [
        { icon: <POSIcon />, title: 'Fast Checkout', desc: 'Process sales in seconds with barcode support' },
        { icon: <InventoryIcon />, title: 'Inventory Control', desc: 'FEFO-based tracking and expiry alerts' },
        { icon: <SyncIcon />, title: 'Offline Sync', desc: 'Keep working even without internet' },
    ];

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Left Panel - Branding (desktop only) */}
            {!isMobile && (
                <Box
                    sx={{
                        width: '45%',
                        maxWidth: 560,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        px: 6,
                        py: 4,
                        position: 'relative',
                        overflow: 'hidden',
                        // Decorative circles from sample
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -80,
                            right: -80,
                            width: 280,
                            height: 280,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                        },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: -60,
                            left: -60,
                            width: 200,
                            height: 200,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.06)',
                        },
                    }}
                >
                    {/* Logo + Brand */}
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 6, position: 'relative', zIndex: 1 }}>
                        <Link href="/" style={{ display: 'flex' }}>
                            <ApplicationLogo sx={{ height: 44, width: 44, color: 'white' }} />
                        </Link>
                        <Typography variant="h6" fontWeight={700}>
                            Pharmacy POS
                        </Typography>
                    </Stack>

                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5, lineHeight: 1.2 }}>
                            Manage Your Pharmacy{'\n'}With Confidence
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 5, opacity: 0.85, lineHeight: 1.7 }}>
                            Streamline sales, track every batch, and never lose data with our offline-first approach.
                        </Typography>

                        {/* Feature list */}
                        <Stack spacing={3}>
                            {features.map((f, i) => (
                                <Stack key={i} direction="row" spacing={2} alignItems="flex-start">
                                    <Box
                                        sx={{
                                            p: 1,
                                            borderRadius: 1.5,
                                            bgcolor: 'rgba(255,255,255,0.15)',
                                            display: 'flex',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {React.cloneElement(f.icon, { fontSize: 'small' })}
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {f.title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                            {f.desc}
                                        </Typography>
                                    </Box>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>
                </Box>
            )}

            {/* Right Panel - Form Container */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.default',
                }}
            >
                {/* Top bar from sample */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: { xs: 2, sm: 3 },
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <IconButton 
                        component={Link} 
                        href="/" 
                        size="small" 
                        sx={{ color: 'text.secondary' }}
                    >
                        <BackIcon fontSize="small" />
                    </IconButton>

                    {isMobile && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <ApplicationLogo sx={{ height: 28, width: 28, color: 'primary.main' }} />
                            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                                Pharmacy POS
                            </Typography>
                        </Stack>
                    )}

                    <Box>
                        {topBarContent}
                    </Box>
                </Box>

                {/* Form area */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: { xs: 3, sm: 4 },
                        py: 4,
                    }}
                >
                    <Box sx={{ width: '100%', maxWidth: 400 }}>
                        {/* Heading from sample style */}
                        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                            {title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
                            {subtitle}
                        </Typography>

                        {children}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
