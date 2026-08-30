import React, { useContext, useLayoutEffect, useState } from 'react';
import { Link, usePage, router } from '@/spa';
import PersistentShellContext from '@/contexts/PersistentShellContext';
import ThemeControl from '@/Components/ThemeControl';
import SimpleIcon from '@/Components/SimpleIcon';
import PageContainer from '@/Components/PageContainer';
import {
    Badge,
    AppBar,
    Box,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Toolbar,
    Typography,
    Avatar,
    Chip,
    Menu,
    MenuItem,
    Tooltip,
    Snackbar,
    Alert,
    Stack,
} from '@mui/material';

const drawerWidth = 214;

export default function MainLayout(props) {
    const persistentShell = useContext(PersistentShellContext);

    if (persistentShell) {
        return <EmbeddedPage {...props} shell={persistentShell} />;
    }

    return <MainLayoutShell {...props} />;
}

function EmbeddedPage({ children, header, shell }) {
    useLayoutEffect(() => {
        shell.setHeader(header || '');
    }, [header, shell]);

    return (
        <PageContainer normalizeLegacyPadding>
            {children}
        </PageContainer>
    );
}

function MainLayoutShell({ children, header }) {
    const { auth, flash, settings = {}, nav_counts = {}, translations = {}, locale, ziggy = {} } = usePage().props;
    const pharmacyName = settings.invoice?.pharmacy_name || 'Pharmacy POS';
    const appBase = ziggy?.base || window.laravel_base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const storageUrl = (path) => withBase(`/storage/${String(path || '').replace(/^\/+/, '')}`);

    const __ = (key) => translations[key] || key;

    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorElUser, setAnchorElUser] = useState(null);
    const [anchorElLang, setAnchorElLang] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

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

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
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

    const menuItems = {
        dashboard: { text: 'Dashboard', icon: 'grid', href: route('dashboard'), routePattern: 'dashboard', permission: null },
        pos: { text: 'POS', icon: 'card', href: route('pos.index'), routePattern: 'pos.index', permission: 'process_sale' },

        inventory: { text: 'Stock Balance', icon: 'box', href: route('inventory.index'), routePattern: 'inventory.index', permission: 'manage_inventory' },
        medicines: { text: 'Create New Items', icon: 'pill', href: route('products.index'), routePattern: 'products.*', permission: 'manage_inventory' },
        categories: { text: 'Categories', icon: 'tag', href: route('categories.index'), routePattern: 'categories.*', permission: 'manage_inventory' },
        units: { text: 'Units', icon: 'ruler', href: route('units.index'), routePattern: 'units.*', permission: 'manage_inventory' },
        taxes: { text: 'Tax Calculation', icon: 'percent', href: route('taxes.index'), routePattern: 'taxes.*', permission: 'manage_inventory' },
        lowBalanceReport: { text: 'Low Balance Report', icon: 'chart', href: route('reports.low-balance'), routePattern: 'reports.low-balance', permission: 'manage_inventory' },

        suppliers: { text: 'Suppliers', icon: 'truck', href: route('suppliers.index'), routePattern: 'suppliers.*', permission: 'manage_inventory' },
        purchases: { text: 'Purchases', icon: 'receipt', href: route('purchases.index'), routePattern: 'purchases.*', permission: 'manage_inventory' },
        purchasesReport: { text: 'Purchases Report', icon: 'chart', href: route('reports.purchases'), routePattern: 'reports.purchases', permission: 'manage_inventory' },

        adjustments: { text: 'Adjustments', icon: 'sliders', href: route('inventory.adjustments.index'), routePattern: 'inventory.adjustments.*', permission: 'manage_inventory' },
        transfers: { text: 'Transfers', icon: 'arrows', href: route('inventory.transfers.index'), routePattern: 'inventory.transfers.*', permission: 'manage_inventory' },

        customers: { text: 'Customers', icon: 'users', href: route('customers.index'), routePattern: 'customers.*', permission: 'process_sale' },
        amountReceivable: { text: 'Amount Receivable', icon: 'wallet', href: route('finance.amount-receivable'), routePattern: 'finance.amount-receivable.*', permission: 'view_financial_reports' },

        sales: { text: 'Sale History', icon: 'receipt', href: route('sales.index'), routePattern: 'sales.index', permission: 'view_financial_reports' },
        salesCustomerReport: { text: 'Sale Report', icon: 'chart', href: route('reports.sales-by-customers'), routePattern: 'reports.sales-by-customers', permission: 'view_financial_reports' },
        expenses: { text: 'Expenses', icon: 'wallet', href: route('expenses.index'), routePattern: 'expenses.*', permission: 'view_financial_reports' },
        expenseCategories: { text: 'Expense Category', icon: 'tag', href: route('expense-categories.index'), routePattern: 'expense-categories.*', permission: 'view_financial_reports' },
        pendingPayments: { text: 'Outstanding Balance', icon: 'wallet', href: route('finance.outstanding-balance'), routePattern: 'finance.outstanding-balance', permission: 'view_financial_reports' },
        reports: { text: 'Finance Report', icon: 'chart', href: route('reports.index'), routePattern: 'reports.index', permission: 'view_financial_reports' },
        cashSessionReport: { text: 'Cash Session Report', icon: 'wallet', href: route('reports.cash-sessions'), routePattern: 'reports.cash-sessions', permission: 'view_financial_reports' },
        expiryReport: { text: 'Expired Report', icon: 'history', href: route('reports.expiry'), routePattern: 'reports.expiry', permission: 'manage_inventory' },

        salePersonReports: { text: 'Sale Representative', icon: 'chart', href: route('finance.sale-representative'), routePattern: 'finance.sale-representative', permission: 'view_financial_reports' },
        administration: { text: 'Administration', icon: 'settings', href: route('administration.index'), routePattern: 'administration.index', permission: 'manage_users' },
        roles: { text: 'Role Management', icon: 'id', href: route('roles.index'), routePattern: 'roles.*', permission: 'manage_users' },
        branches: { text: 'Branch Management', icon: 'store', href: route('branches.index'), routePattern: 'branches.*', permission: 'manage_branches' },
        permissions: { text: 'Permission', icon: 'shieldCheck', href: route('permissions.index'), routePattern: 'permissions.*', permission: 'manage_users' },
        activityLogs: { text: 'Activity Logs', icon: 'history', href: route('activity-logs.index'), routePattern: 'activity-logs.*', permission: 'manage_users' },
        settings: { text: 'Settings', icon: 'settings', href: route('settings.index'), routePattern: 'settings.*', permission: 'manage_branches' },
        manual: { text: 'SOP Manual', icon: 'book', href: route('manual.index'), routePattern: 'manual.index', permission: null },
    };

    const menuGroups = [
        { label: 'Main', keys: ['dashboard', 'pos'] },
        { label: 'Stock', keys: ['inventory', 'medicines', 'categories', 'expiryReport', 'lowBalanceReport', 'adjustments', 'transfers', 'units', 'taxes'] },
        { label: 'Purchasing', keys: ['suppliers', 'purchases', 'purchasesReport'] },
        { label: 'Sales', keys: ['customers', 'sales', 'salesCustomerReport'] },
        { label: 'Finance', keys: ['expenses', 'expenseCategories', 'amountReceivable', 'pendingPayments', 'reports', 'cashSessionReport', 'salePersonReports'] },
        { label: 'Administration', keys: ['administration', 'roles', 'branches', 'permissions', 'activityLogs', 'manual'] },
        { label: 'Setting', keys: ['settings'] },
    ];

    const canSee = (item) => !item.permission || auth.user?.permissions?.includes(item.permission);

    const visibleMenuGroups = menuGroups
        .map((group) => ({
            ...group,
            visibleItems: group.keys
                .map((k) => menuItems[k] ? ({
                    ...menuItems[k],
                    key: k,
                    count: Number(nav_counts?.[k] || 0),
                }) : null)
                .filter(Boolean)
                .filter((item) => canSee(item)),
        }))
        .filter((group) => group.visibleItems.length > 0);

    const navIconBoxSx = (isActive) => ({
        width: 24,
        height: 24,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isActive ? 'primary.main' : 'inherit',
        transition: 'all 180ms ease',
    });

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 1.5, py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 1.5,
                            bgcolor: 'primary.soft',
                            color: 'primary.main',
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                        }}
                    >
                        {settings.invoice?.logo_path ? (
                            <Box
                                component="img"
                                alt={pharmacyName}
                                src={storageUrl(settings.invoice.logo_path)}
                                sx={{ width: '82%', height: '82%', objectFit: 'contain' }}
                            />
                        ) : (
                            <SimpleIcon name="bag" size={18} />
                        )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                            {pharmacyName}
                        </Typography>
                        <Typography variant="caption" noWrap display="block" color="text.secondary">
                            Office dashboard
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            <Divider />

            <Box sx={{ flex: 1, overflowY: 'auto', py: 0.75 }}>
                {visibleMenuGroups.map((group, groupIndex) => (
                    <Box key={group.label}>
                        <List
                            dense
                            subheader={
                                <ListSubheader
                                    component="div"
                                    disableSticky
                                    sx={{
                                        px: 1.5,
                                        py: 0.6,
                                        lineHeight: 1.2,
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: 'text.secondary',
                                        bgcolor: 'transparent',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.075em',
                                    }}
                                >
                                    {__(group.label)}
                                </ListSubheader>
                            }
                        >
                            {group.visibleItems.map((item) => {
                                const isActive = isActiveRoute(item.routePattern, item.href);

                                return (
                                    <ListItem key={item.text} disablePadding>
                                        <ListItemButton
                                            component={Link}
                                            href={item.href}
                                            selected={isActive}
                                            sx={{
                                                minHeight: 34,
                                                py: 0.45,
                                                px: 1,
                                                mx: 0.75,
                                                borderRadius: 1,
                                                color: isActive ? 'primary.main' : 'text.secondary',
                                                '&.Mui-selected': {
                                                    bgcolor: 'primary.soft',
                                                    color: 'primary.main',
                                                },
                                                '&.Mui-selected:hover': {
                                                    bgcolor: 'primary.soft',
                                                },
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
                                                <Badge
                                                    badgeContent={item.count}
                                                    max={99}
                                                    color="error"
                                                    invisible={item.count <= 0}
                                                    overlap="circular"
                                                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                                    sx={{
                                                        '& .MuiBadge-badge': {
                                                            minWidth: 15,
                                                            height: 15,
                                                            px: 0.35,
                                                            fontSize: 9,
                                                            fontWeight: 800,
                                                        },
                                                    }}
                                                >
                                                    <Box sx={navIconBoxSx(isActive)}>
                                                        <SimpleIcon name={item.icon} size={17} />
                                                    </Box>
                                                </Badge>
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={__(item.text)}
                                                primaryTypographyProps={{
                                                    variant: 'body2',
                                                    noWrap: true,
                                                    fontWeight: isActive ? 700 : 600,
                                                }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                        {groupIndex < visibleMenuGroups.length - 1 && <Divider sx={{ my: 0.5, mx: 1.25 }} />}
                    </Box>
                ))}
            </Box>

            <Divider />

            <Box sx={{ px: 1.25, py: 1.25 }}>
                <Stack direction="row" alignItems="center" spacing={1.1}>
                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                            auth.user?.roles?.includes('Root') ? (
                                <Box sx={{ color: '#2874bc', bgcolor: 'background.paper', borderRadius: '50%', display: 'flex' }}>
                                    <SimpleIcon name="shieldCheck" size={14} />
                                </Box>
                            ) : null
                        }
                    >
                        <Avatar
                            src={auth.user?.image_path ? storageUrl(auth.user.image_path) : null}
                            sx={{
                                width: 34,
                                height: 34,
                                bgcolor: 'primary.main',
                                fontSize: 14,
                                fontWeight: 800,
                            }}
                        >
                            {auth.user?.name?.charAt(0).toUpperCase()}
                        </Avatar>
                    </Badge>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                            {auth.user?.name}
                        </Typography>
                        <Typography variant="caption" noWrap display="block" color="text.secondary">
                            {auth.user?.roles?.map((roleName) => __(roleName)).join(', ') || auth.user?.email}
                        </Typography>
                    </Box>
                    <Tooltip title={__('Logout')}>
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => router.post(route('logout'))}
                            aria-label={__('Logout')}
                        >
                            <SimpleIcon name="logout" size={16} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    color: 'text.primary',
                    boxShadow: 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0,
                    zIndex: (muiTheme) => muiTheme.zIndex.drawer - 1,
                }}
            >
                <Toolbar sx={{ minHeight: '54px !important', px: { xs: 1.5, sm: 2.5 } }}>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 1, display: { sm: 'none' } }}
                    >
                        <SimpleIcon name="menu" size={20} />
                    </IconButton>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.075em', lineHeight: 1 }}>
                            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Typography>
                        <Typography variant="h6" noWrap component="div" sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>
                            {header}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {settings.invoice?.logo_path && (
                            <Box 
                                component="img" 
                                src={storageUrl(settings.invoice.logo_path)}
                                sx={{ height: 24, width: 'auto', objectFit: 'contain', mr: 1 }} 
                            />
                        )}
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
                            id="menu-lang"
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
                            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.25 }}>
                                <Avatar 
                                    alt={auth.user?.name || 'User'} 
                                    src={auth.user?.image_path ? storageUrl(auth.user.image_path) : null}
                                    sx={{ width: 32, height: 32 }}
                                />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            sx={{ mt: '45px' }}
                            id="menu-appbar"
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
                            {auth.user?.permissions?.includes('process_sale') && (
                                <MenuItem component={Link} href={route('pos.index')} onClick={handleCloseUserMenu}>
                                    <ListItemIcon><SimpleIcon name="card" size={17} /></ListItemIcon>
                                    <Typography variant="body2">{__('POS')}</Typography>
                                </MenuItem>
                            )}
                            <MenuItem component={Link} href={route('profile.edit')} onClick={handleCloseUserMenu}>
                                <ListItemIcon><SimpleIcon name="user" size={17} /></ListItemIcon>
                                <Typography variant="body2">{__('Profile')}</Typography>
                            </MenuItem>
                            {auth.user?.permissions?.includes('manage_branches') && (
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
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="mailbox folders"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            borderRightColor: 'divider',
                            borderRadius: 0,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            borderRightColor: 'divider',
                            borderRadius: 0,
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 0,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    minWidth: 0,
                    minHeight: '100vh',
                    bgcolor: 'transparent',
                }}
            >
                <Toolbar sx={{ minHeight: '54px !important' }} />
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
                    severity={flash.error ? "error" : "success"} 
                    variant="filled" 
                    sx={{ width: '100%' }}
                >
                    {flash.success || flash.error}
                </Alert>
            </Snackbar>
        </Box>
    );
}
