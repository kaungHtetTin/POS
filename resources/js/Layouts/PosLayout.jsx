import React, { useContext, useLayoutEffect, useState } from 'react';
import { Link, usePage, router } from '@/spa';
import PersistentShellContext from '@/contexts/PersistentShellContext';
import ThemeControl from '@/Components/ThemeControl';
import SimpleIcon from '@/Components/SimpleIcon';
import {
    Alert,
    AppBar,
    Box,
    Button,
    Chip,
    CssBaseline,
    Divider,
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
} from '@mui/material';

export default function PosLayout(props) {
    const persistentShell = useContext(PersistentShellContext);

    if (persistentShell) {
        return <EmbeddedPosPage {...props} shell={persistentShell} />;
    }

    return <PosLayoutShell {...props} />;
}

function EmbeddedPosPage({ children, header = 'POS', shell }) {
    useLayoutEffect(() => {
        shell.setHeader(header);
    }, [header, shell]);

    return children;
}

function PosLayoutShell({ children, header = 'POS' }) {
    const { auth, flash, translations = {}, locale, ziggy = {} } = usePage().props;
    const appBase = ziggy?.base || window.laravel_base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const storageUrl = (path) => withBase(`/storage/${String(path || '').replace(/^\/+/, '')}`);
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
        handleCloseLangMenu();
        router.action(route('language.switch'), { locale: lang });
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
        { text: 'POS', href: route('pos.index'), icon: 'card', active: isActiveRoute('pos.index', route('pos.index')) },
        { text: 'Dashboard', href: route('dashboard'), icon: 'grid', active: isActiveRoute('dashboard', route('dashboard')) },
        { text: 'Sales', href: route('sales.index'), icon: 'receipt', active: isActiveRoute('sales.*', route('sales.index')) },
        ...(canManageInventory ? [
            { text: 'Inventory', href: route('inventory.index'), icon: 'box', active: isActiveRoute('inventory.index', route('inventory.index')) },
            { text: 'Purchases', href: route('purchases.index'), icon: 'receipt', active: isActiveRoute('purchases.*', route('purchases.index')) },
        ] : []),
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'transparent' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    color: 'text.primary',
                    boxShadow: 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0,
                }}
            >
                <Toolbar sx={{ minHeight: '54px !important', gap: 1, px: { xs: 1.5, sm: 2.5 } }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', mr: 1 }}>
                        Pharmacy POS
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
                        {navItems.map((item) => (
                            <Button
                                key={item.text}
                                component={Link}
                                href={item.href}
                                size="small"
                                startIcon={<SimpleIcon name={item.icon} size={16} />}
                                variant={item.active ? 'contained' : 'text'}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: item.active ? 700 : 500,
                                    borderRadius: 1,
                                    '& .MuiButton-startIcon': {
                                        mr: 0.75,
                                        color: 'inherit',
                                    },
                                }}
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
                        <ThemeControl label={__('Theme')} />

                        <Tooltip title={__('Language')}>
                            <IconButton
                                onClick={handleOpenLangMenu}
                                color="inherit"
                                size="small"
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                }}
                            >
                                <SimpleIcon name="globe" size={17} />
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
                                    src={auth.user?.image_path ? storageUrl(auth.user.image_path) : null}
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
                            slotProps={{
                                paper: {
                                    sx: {
                                        width: 260,
                                        mt: 0.5,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    },
                                },
                            }}
                        >
                            <Box sx={{ px: 1.5, py: 1.25, display: 'flex', gap: 1.25, alignItems: 'center' }}>
                                <Avatar
                                    alt={auth.user?.name || 'User'}
                                    src={auth.user?.image_path ? storageUrl(auth.user.image_path) : null}
                                    sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontWeight: 700 }}
                                >
                                    {auth.user?.name?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                                        {auth.user?.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                                        {auth.user?.email}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                        {auth.user?.roles?.map((roleName) => (
                                            <Chip key={roleName} label={__(roleName)} size="small" sx={{ height: 17, fontSize: '0.6rem' }} />
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                            <Divider />
                            <MenuItem component={Link} href={route('dashboard')} onClick={handleCloseUserMenu}>
                                <ListItemIcon><SimpleIcon name="grid" size={17} /></ListItemIcon>
                                <Typography variant="body2">{__('Dashboard')}</Typography>
                            </MenuItem>
                            {permissions.includes('view_financial_reports') && (
                                <MenuItem component={Link} href={route('sales.index')} onClick={handleCloseUserMenu}>
                                    <ListItemIcon><SimpleIcon name="receipt" size={17} /></ListItemIcon>
                                    <Typography variant="body2">{__('Sales')}</Typography>
                                </MenuItem>
                            )}
                            <MenuItem component={Link} href={route('profile.edit')} onClick={handleCloseUserMenu}>
                                <ListItemIcon><SimpleIcon name="user" size={17} /></ListItemIcon>
                                <Typography variant="body2">{__('Profile')}</Typography>
                            </MenuItem>
                            {permissions.includes('manage_branches') && (
                                <MenuItem component={Link} href={route('settings.index')} onClick={handleCloseUserMenu}>
                                    <ListItemIcon><SimpleIcon name="settings" size={17} /></ListItemIcon>
                                    <Typography variant="body2">{__('Settings')}</Typography>
                                </MenuItem>
                            )}
                            <MenuItem component={Link} href={route('manual.index')} onClick={handleCloseUserMenu}>
                                <ListItemIcon><SimpleIcon name="book" size={17} /></ListItemIcon>
                                <Typography variant="body2">{__('SOP Manual')}</Typography>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={() => { handleCloseUserMenu(); router.post(route('logout')); }} sx={{ color: 'error.main' }}>
                                <ListItemIcon><SimpleIcon name="logout" size={17} /></ListItemIcon>
                                <Typography variant="body2">{__('Logout')}</Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            <Toolbar sx={{ minHeight: '54px !important' }} />

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
