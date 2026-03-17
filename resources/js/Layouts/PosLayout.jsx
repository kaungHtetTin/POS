import React, { useContext, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { ColorModeContext } from '../app';
import {
    Alert,
    AppBar,
    Box,
    Button,
    CssBaseline,
    IconButton,
    Menu,
    MenuItem,
    Snackbar,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
    Avatar,
    ListItemIcon,
    TextField,
    useTheme,
} from '@mui/material';
import {
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    Dashboard as DashboardIcon,
    PointOfSale as SalesIcon,
    Inventory as InventoryIcon,
    ReceiptLong as PurchaseIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    ShoppingCart as PosIcon,
    Language as LanguageIcon,
} from '@mui/icons-material';

export default function PosLayout({ children, header = 'POS' }) {
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);
    const { auth, flash, translations = {}, locale } = usePage().props;
    const [anchorElUser, setAnchorElUser] = useState(null);
    const [anchorElLang, setAnchorElLang] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const __ = (key) => translations[key] || key;

    React.useEffect(() => {
        if (flash.success || flash.error) {
            setSnackbarOpen(true);
        }
    }, [flash]);

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleOpenLangMenu = (event) => {
        setAnchorElLang(event.currentTarget);
    };

    const handleCloseLangMenu = () => {
        setAnchorElLang(null);
    };

    const changeLanguage = (lang) => {
        window.location.href = route('language.switch', { lang });
    };

    const normalizePath = (value) => {
        try {
            const parsed = new URL(value, window.location.origin);
            return parsed.pathname.replace(/\/+$/, '') || '/';
        } catch {
            return '/';
        }
    };

    const stripBase = (path) => {
        const base = normalizePath(window.laravel_base || window.Ziggy?.base || '/');
        if (base === '/' || !path.startsWith(base)) {
            return path;
        }
        return path.substring(base.length) || '/';
    };

    const isActiveRoute = (pattern, href) => {
        if (pattern && route().current(pattern)) {
            return true;
        }

        const currentPath = normalizePath(window.location.pathname);
        const targetPath = normalizePath(href);
        const currentPathNoBase = stripBase(currentPath);
        const targetPathNoBase = stripBase(targetPath);
        const wildcardPattern = typeof pattern === 'string' && pattern.endsWith('.*');

        if (wildcardPattern) {
            return (
                currentPath === targetPath ||
                currentPath.startsWith(`${targetPath}/`) ||
                currentPathNoBase === targetPathNoBase ||
                currentPathNoBase.startsWith(`${targetPathNoBase}/`)
            );
        }

        return currentPath === targetPath || currentPathNoBase === targetPathNoBase;
    };

    const permissions = auth.user?.permissions || [];
    const canManageInventory = permissions.includes('manage_inventory');
    const accessibleBranches = auth.user?.accessible_branches || [];
    const currentBranchId = auth.user?.current_branch_id || '';

    const navItems = [
        { text: 'POS', href: route('pos.index'), icon: <PosIcon fontSize="small" />, active: isActiveRoute('pos.*', route('pos.index')) },
        { text: 'Dashboard', href: route('dashboard'), icon: <DashboardIcon fontSize="small" />, active: isActiveRoute('dashboard', route('dashboard')) },
        { text: 'Sales', href: route('sales.index'), icon: <SalesIcon fontSize="small" />, active: isActiveRoute('sales.*', route('sales.index')) },
        ...(canManageInventory ? [
            { text: 'Inventory', href: route('inventory.index'), icon: <InventoryIcon fontSize="small" />, active: isActiveRoute('inventory.index', route('inventory.index')) },
            { text: 'Purchases', href: route('purchases.index'), icon: <PurchaseIcon fontSize="small" />, active: isActiveRoute('purchases.*', route('purchases.index')) },
        ] : []),
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Toolbar sx={{ minHeight: '56px !important', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', mr: 1 }}>
                        Pharmacy POS
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
                        {navItems.map((item) => (
                            <Button
                                key={item.text}
                                component="a"
                                href={item.href}
                                size="small"
                                startIcon={item.icon}
                                variant={item.active ? 'contained' : 'text'}
                                sx={{ textTransform: 'none', fontWeight: item.active ? 700 : 500 }}
                            >
                                {__(item.text)}
                            </Button>
                        ))}
                    </Stack>

                    {accessibleBranches.length > 0 && (
                        <TextField
                            select
                            size="small"
                            value={currentBranchId}
                            onChange={(e) => {
                                router.post(
                                    route('active-branch.update'),
                                    { branch_id: e.target.value },
                                    { preserveScroll: true }
                                );
                            }}
                            sx={{
                                width: { xs: 120, sm: 150 },
                                '& .MuiSelect-select': {
                                    py: 0.75,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                },
                            }}
                        >
                            {accessibleBranches.map((branch) => (
                                <MenuItem key={branch.id} value={branch.id}>
                                    {branch.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}

                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>
                        {header}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton onClick={colorMode.toggleColorMode} color="inherit" size="small">
                            {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                        </IconButton>

                        <Tooltip title={__('Language')}>
                            <IconButton onClick={handleOpenLangMenu} color="inherit" size="small">
                                <LanguageIcon />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            sx={{ mt: '45px' }}
                            id="pos-lang-menu"
                            anchorEl={anchorElLang}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorElLang)}
                            onClose={handleCloseLangMenu}
                        >
                            <MenuItem onClick={() => changeLanguage('en')} selected={locale === 'en'}>
                                <Typography variant="body2">English</Typography>
                            </MenuItem>
                            <MenuItem onClick={() => changeLanguage('my')} selected={locale === 'my'}>
                                <Typography variant="body2">မြန်မာ (Myanmar)</Typography>
                            </MenuItem>
                        </Menu>

                        <Tooltip title={__('User menu')}>
                            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.5 }}>
                                <Avatar
                                    alt={auth.user?.name || 'User'}
                                    src={auth.user?.image_path ? `/storage/${auth.user.image_path}` : null}
                                    sx={{ width: 32, height: 32 }}
                                />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            sx={{ mt: '45px' }}
                            id="pos-user-menu"
                            anchorEl={anchorElUser}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorElUser)}
                            onClose={handleCloseUserMenu}
                        >
                            <MenuItem component="a" href={route('profile.edit')} onClick={handleCloseUserMenu}>
                                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                                <Typography variant="body2">{__('Profile')}</Typography>
                            </MenuItem>
                            <MenuItem onClick={() => { handleCloseUserMenu(); router.post(route('logout')); }}>
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                <Typography variant="body2">{__('Logout')}</Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            <Toolbar sx={{ minHeight: '56px !important' }} />

            <Box sx={{ flex: 1 }}>
                {children}
            </Box>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={flash.error ? 'error' : 'success'}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {flash.success || flash.error}
                </Alert>
            </Snackbar>
        </Box>
    );
}
