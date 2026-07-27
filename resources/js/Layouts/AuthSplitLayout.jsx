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
    VerifiedUser as SecurityIcon,
} from '@mui/icons-material';

export default function AuthSplitLayout({ children, title, subtitle, topBarContent }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { settings = {}, ziggy = {} } = usePage().props;
    const pharmacyName = settings.invoice?.pharmacy_name || 'Pharmacy POS';
    const appBase = ziggy?.base || window.laravel_base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const logoPath = settings.invoice?.logo_path ? withBase(`/storage/${String(settings.invoice.logo_path).replace(/^\/+/, '')}`) : null;
    const LogoBadge = ({ size = 44 }) => (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                p: '2px',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: `conic-gradient(${theme.palette.primary.light}, #ffffff, ${theme.palette.primary.main}, #ffffff, ${theme.palette.primary.dark})`,
                    animation: 'logoBorderSpin 3.2s linear infinite',
                },
                '@keyframes logoBorderSpin': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                },
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.94)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {logoPath ? (
                    <Box component="img" src={logoPath} alt={pharmacyName} sx={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                ) : (
                    <ApplicationLogo sx={{ width: '74%', height: '74%', color: theme.palette.primary.main }} />
                )}
            </Box>
        </Box>
    );

    // Left panel feature items adapted for Pharmacy POS
    const features = [
        { icon: <POSIcon />, title: 'Fast Checkout', desc: 'Process sales in seconds with barcode support' },
        { icon: <InventoryIcon />, title: 'Inventory Control', desc: 'FEFO-based tracking and expiry alerts' },
        { icon: <SecurityIcon />, title: 'Role-Based Access', desc: 'Control modules and actions with permission-based security' },
    ];

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Left Panel - Branding (desktop only) */}
            {!isMobile && (
                <Box
                    sx={{
                        width: '45%',
                        maxWidth: 560,
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        px: 6,
                        py: 4,
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Logo + Brand */}
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 6, position: 'relative', zIndex: 1 }}>
                        <Link href="/" style={{ display: 'flex' }}>
                            <LogoBadge size={48} />
                        </Link>
                        <Typography variant="h6" fontWeight={700}>
                            {pharmacyName}
                        </Typography>
                    </Stack>

                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5, lineHeight: 1.2 }}>
                            Manage Your Pharmacy{'\n'}With Confidence
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 5, lineHeight: 1.7 }}>
                            Streamline sales, track every batch, and run operations with secure role-based access control.
                        </Typography>

                        {/* Feature list */}
                        <Stack spacing={3}>
                            {features.map((f, i) => (
                                <Stack key={i} direction="row" spacing={2} alignItems="flex-start">
                                    <Box
                                        sx={{
                                            p: 1,
                                            borderRadius: 1.5,
                                            bgcolor: 'primary.soft',
                                            color: 'primary.main',
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
                                        <Typography variant="body2" color="text.secondary">
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
                            <LogoBadge size={30} />
                            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                                {pharmacyName}
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
