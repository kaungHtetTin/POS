import React, { useState, useContext } from 'react';
import { usePage, router } from '@inertiajs/react';
import { ColorModeContext } from '@/contexts/ColorModeContext';
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
    useTheme,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    Verified as VerifiedIcon,
    Menu as MenuIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    Dashboard as DashboardIcon,
    Inventory as InventoryIcon,
    Medication as ProductIcon,
    ShoppingCart as POSIcon,
    People as CustomersIcon,
    Assessment as ReportsIcon,
    EventBusy as ExpiryReportIcon,
    PointOfSale as CashSessionReportIcon,
    Payments as ExpensesIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    AssignmentInd as RolesIcon,
    VerifiedUser as PermissionsIcon,
    PeopleAlt as StaffIcon,
    Store as StoreIcon,
    Category as CategoryIcon,
    Straighten as UnitIcon,
    Percent as TaxIcon,
    LocalShipping as SupplierIcon,
    ReceiptLong as PurchaseIcon,
    Receipt as SalesIcon,
    SwapHoriz as AdjustmentIcon,
    CompareArrows as TransferIcon,
    AssignmentReturn as ReturnIcon,
    Label as ExpenseCategoryIcon,
    Language as LanguageIcon,
    History as ActivityLogIcon,
    MenuBook as ManualIcon,
} from '@mui/icons-material';

const drawerWidth = 200; // More compact sidebar

export default function MainLayout({ children, header }) {
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);
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

    const menuItems = {
        dashboard: { text: 'Dashboard', icon: <DashboardIcon fontSize="small" />, href: route('dashboard'), routePattern: 'dashboard', permission: null },
        pos: { text: 'POS', icon: <POSIcon fontSize="small" />, href: route('pos.index'), routePattern: 'pos.index', permission: 'process_sale' },

        inventory: { text: 'Inventory', icon: <InventoryIcon fontSize="small" />, href: route('inventory.index'), routePattern: 'inventory.index', permission: 'manage_inventory' },
        medicines: { text: 'Medicines', icon: <ProductIcon fontSize="small" />, href: route('products.index'), routePattern: 'products.*', permission: 'manage_inventory' },
        categories: { text: 'Categories', icon: <CategoryIcon fontSize="small" />, href: route('categories.index'), routePattern: 'categories.*', permission: 'manage_inventory' },
        units: { text: 'Units', icon: <UnitIcon fontSize="small" />, href: route('units.index'), routePattern: 'units.*', permission: 'manage_inventory' },
        taxes: { text: 'Tax Configuration', icon: <TaxIcon fontSize="small" />, href: route('taxes.index'), routePattern: 'taxes.*', permission: 'manage_inventory' },

        suppliers: { text: 'Suppliers', icon: <SupplierIcon fontSize="small" />, href: route('suppliers.index'), routePattern: 'suppliers.*', permission: 'manage_inventory' },
        purchases: { text: 'Purchases', icon: <PurchaseIcon fontSize="small" />, href: route('purchases.index'), routePattern: 'purchases.*', permission: 'manage_inventory' },

        adjustments: { text: 'Adjustments', icon: <AdjustmentIcon fontSize="small" />, href: route('inventory.adjustments.index'), routePattern: 'inventory.adjustments.*', permission: 'manage_inventory' },
        transfers: { text: 'Transfers', icon: <TransferIcon fontSize="small" />, href: route('inventory.transfers.index'), routePattern: 'inventory.transfers.*', permission: 'manage_inventory' },

        customers: { text: 'Customers', icon: <CustomersIcon fontSize="small" />, href: route('customers.index'), routePattern: 'customers.*', permission: 'process_sale' },
        returns: { text: 'Returns', icon: <ReturnIcon fontSize="small" />, href: route('returns.index'), routePattern: 'returns.*', permission: 'process_sale' },

        sales: { text: 'Sales', icon: <SalesIcon fontSize="small" />, href: route('sales.index'), routePattern: 'sales.*', permission: 'view_financial_reports' },
        expenses: { text: 'Expenses', icon: <ExpensesIcon fontSize="small" />, href: route('expenses.index'), routePattern: 'expenses.*', permission: 'view_financial_reports' },
        expenseCategories: { text: 'Expense Categories', icon: <ExpenseCategoryIcon fontSize="small" />, href: route('expense-categories.index'), routePattern: 'expense-categories.*', permission: 'view_financial_reports' },
        reports: { text: 'Reports', icon: <ReportsIcon fontSize="small" />, href: route('reports.index'), routePattern: 'reports.index', permission: 'view_financial_reports' },
        cashSessionReport: { text: 'Cash Session Report', icon: <CashSessionReportIcon fontSize="small" />, href: route('reports.cash-sessions'), routePattern: 'reports.cash-sessions', permission: 'view_financial_reports' },
        expiryReport: { text: 'Expiry Report', icon: <ExpiryReportIcon fontSize="small" />, href: route('reports.expiry'), routePattern: 'reports.expiry', permission: 'manage_inventory' },

        staff: { text: 'Staff Management', icon: <StaffIcon fontSize="small" />, href: route('staff.index'), routePattern: 'staff.*', permission: 'manage_users' },
        roles: { text: 'Role Management', icon: <RolesIcon fontSize="small" />, href: route('roles.index'), routePattern: 'roles.*', permission: 'manage_users' },
        branches: { text: 'Branch Management', icon: <StoreIcon fontSize="small" />, href: route('branches.index'), routePattern: 'branches.*', permission: 'manage_branches' },
        permissions: { text: 'Permission', icon: <PermissionsIcon fontSize="small" />, href: route('permissions.index'), routePattern: 'permissions.*', permission: 'manage_users' },
        activityLogs: { text: 'Activity Logs', icon: <ActivityLogIcon fontSize="small" />, href: route('activity-logs.index'), routePattern: 'activity-logs.*', permission: 'manage_users' },
        settings: { text: 'Settings', icon: <SettingsIcon fontSize="small" />, href: route('settings.index'), routePattern: 'settings.*', permission: 'manage_branches' },
        manual: { text: 'SOP Manual', icon: <ManualIcon fontSize="small" />, href: route('manual.index'), routePattern: 'manual.index', permission: null },
    };

    const menuGroups = [
        { label: 'Main', keys: ['dashboard', 'pos'] },
        { label: 'Inventory', keys: ['inventory', 'medicines', 'expiryReport', 'categories', 'units', 'taxes'] },
        { label: 'Purchasing', keys: ['suppliers', 'purchases'] },
        { label: 'Stock', keys: ['adjustments', 'transfers'] },
        { label: 'Sales', keys: ['customers', 'returns', 'sales'] },
        { label: 'Finance', keys: ['expenses', 'expenseCategories', 'reports', 'cashSessionReport'] },
        { label: 'Administration', keys: ['staff', 'roles', 'branches', 'permissions', 'activityLogs', 'settings', 'manual'] },
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
        width: 22,
        height: 22,
        borderRadius: 0.75,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid',
        borderColor: isActive ? 'primary.main' : 'divider',
        bgcolor: isActive ? 'primary.main' : 'action.hover',
        color: isActive ? 'primary.contrastText' : 'text.secondary',
        transition: 'all 180ms ease',
    });

    const drawer = (
        <div>
            {/* <Toolbar 
                sx={{ 
                    minHeight: '64px !important',
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    background: theme.palette.mode === 'dark' 
                        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
                        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        width: '100%',
                    }}
                >
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            p: '1.5px',
                            position: 'relative',
                            display: 'flex',
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
                            {settings.invoice?.logo_path ? (
                                <Box 
                                    component="img" 
                                    src={storageUrl(settings.invoice.logo_path)}
                                    sx={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                                />
                            ) : (
                                <ProductIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                            )}
                        </Box>
                    </Box>
                    <Typography 
                        variant="subtitle1" 
                        noWrap 
                        component="div" 
                        sx={{ 
                            color: 'text.primary', 
                            fontWeight: 800,
                            letterSpacing: -0.5,
                            fontSize: '1.1rem',
                        }}
                    >
                        {pharmacyName}
                    </Typography>
                </Box>
            </Toolbar> */}
            <Divider sx={{ opacity: 0.6 }} />
            
            {/* User Info Section */}
            <Box sx={{ px: 2, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                            auth.user?.roles?.includes('Root') ? (
                                <VerifiedIcon 
                                    sx={{ 
                                        color: '#1877F2', // Facebook Blue
                                        fontSize: '0.9rem',
                                        bgcolor: 'white',
                                        borderRadius: '50%',
                                        p: '0.5px'
                                    }} 
                                />
                            ) : null
                        }
                    >
                        <Avatar 
                            src={auth.user?.image_path ? storageUrl(auth.user.image_path) : null}
                            sx={{ 
                                width: 36, 
                                height: 36, 
                                bgcolor: 'primary.main',
                                fontSize: '1rem',
                                fontWeight: 700,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            {auth.user?.name?.charAt(0).toUpperCase()}
                        </Avatar>
                    </Badge>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography 
                            variant="subtitle2" 
                            noWrap 
                            sx={{ 
                                fontWeight: 700, 
                                lineHeight: 1.2,
                                color: 'text.primary'
                            }}
                        >
                            {auth.user?.name}
                        </Typography>
                        <Typography 
                            variant="caption" 
                            noWrap 
                            display="block"
                            sx={{ 
                                color: 'text.secondary',
                                fontSize: '0.7rem',
                                mb: 0.5
                            }}
                        >
                            {auth.user?.email}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {auth.user?.roles?.map((roleName) => (
                                <Chip
                                    key={roleName}
                                    label={__(roleName)}
                                    size="small"
                                    sx={{
                                        height: 16,
                                        fontSize: '0.6rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        bgcolor: roleName === 'Root' ? 'primary.main' : 'action.selected',
                                        color: roleName === 'Root' ? 'white' : 'text.secondary',
                                        border: 'none',
                                        borderRadius: '4px',
                                        '& .MuiChip-label': { px: 0.75 }
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Box>
            <Divider sx={{ opacity: 0.6 }} />

            {visibleMenuGroups.map((group, groupIndex) => {
                return (
                    <Box key={group.label}>
                        <List
                            dense
                            subheader={
                                <ListSubheader
                                    component="div"
                                    disableSticky
                                    sx={{
                                        px: 2,
                                        py: 0.75,
                                        lineHeight: 1.2,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        color: 'text.secondary',
                                        bgcolor: 'transparent',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.6,
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
                                            component="a"
                                            href={item.href}
                                            selected={isActive}
                                            sx={{
                                                py: 0.5,
                                                borderRadius: 0.75,
                                                mx: 0.5,
                                                borderLeft: '3px solid transparent',
                                                '&.Mui-selected': {
                                                    bgcolor: 'action.selected',
                                                    borderLeft: '3px solid',
                                                    borderColor: 'primary.main',
                                                },
                                                '&.Mui-selected:hover': {
                                                    bgcolor: 'action.selected',
                                                },
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'primary.main' : 'inherit' }}>
                                                <Badge
                                                    badgeContent={item.count}
                                                    max={99}
                                                    color="error"
                                                    invisible={item.count <= 0}
                                                    overlap="circular"
                                                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                                    sx={{
                                                        '& .MuiBadge-badge': {
                                                            minWidth: 16,
                                                            height: 16,
                                                            px: 0.4,
                                                            fontSize: 10,
                                                            fontWeight: 800,
                                                            boxShadow: 1,
                                                        },
                                                    }}
                                                >
                                                    <Box sx={navIconBoxSx(isActive)}>
                                                        {item.icon}
                                                    </Box>
                                                </Badge>
                                            </ListItemIcon>
                                            <ListItemText primary={__(item.text)} primaryTypographyProps={{ variant: 'body2', fontWeight: isActive ? 600 : 400 }} />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                        {groupIndex < visibleMenuGroups.length - 1 && <Divider sx={{ my: 0.75 }} />}
                    </Box>
                );
            })}
            <Divider sx={{ my: 1 }} />
            <List dense>
                <ListItem disablePadding>
                        <ListItemButton
                            onClick={() => router.post(route('logout'))}
                            sx={{ py: 0.5, color: 'error.main' }}
                        >
                            <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
                                <LogoutIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                                primary={__('Logout')} 
                                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} 
                            />
                        </ListItemButton>
                </ListItem>
            </List>
        </div>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    boxShadow: 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Toolbar sx={{ minHeight: '48px !important' }}>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 1, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="subtitle1" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 500 }}>
                        {header}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {settings.invoice?.logo_path && (
                            <Box 
                                component="img" 
                                src={storageUrl(settings.invoice.logo_path)}
                                sx={{ height: 24, width: 'auto', objectFit: 'contain', mr: 1 }} 
                            />
                        )}
                        <IconButton
                            onClick={colorMode.toggleColorMode}
                            color="inherit"
                            size="small"
                            sx={{
                                borderRadius: 0.75,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                    borderColor: 'primary.main',
                                },
                            }}
                        >
                            {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                        </IconButton>
                        
                        <Tooltip title={__('Language')}>
                            <IconButton
                                onClick={handleOpenLangMenu}
                                color="inherit"
                                size="small"
                                sx={{
                                    borderRadius: 0.75,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                        borderColor: 'primary.main',
                                    },
                                }}
                            >
                                <LanguageIcon />
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
                            <MenuItem component="a" href={route('dashboard')} onClick={handleCloseUserMenu}>
                                <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                                <Typography variant="body2">{__('Dashboard')}</Typography>
                            </MenuItem>
                            {auth.user?.permissions?.includes('process_sale') && (
                                <MenuItem component="a" href={route('pos.index')} onClick={handleCloseUserMenu}>
                                    <ListItemIcon><POSIcon fontSize="small" /></ListItemIcon>
                                    <Typography variant="body2">{__('POS')}</Typography>
                                </MenuItem>
                            )}
                            <MenuItem component="a" href={route('profile.edit')} onClick={handleCloseUserMenu}>
                                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                                <Typography variant="body2">{__('Profile')}</Typography>
                            </MenuItem>
                            {auth.user?.permissions?.includes('manage_branches') && (
                                <MenuItem component="a" href={route('settings.index')} onClick={handleCloseUserMenu}>
                                    <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                                    <Typography variant="body2">{__('Settings')}</Typography>
                                </MenuItem>
                            )}
                            <MenuItem component="a" href={route('manual.index')} onClick={handleCloseUserMenu}>
                                <ListItemIcon><ManualIcon fontSize="small" /></ListItemIcon>
                                <Typography variant="body2">{__('SOP Manual')}</Typography>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={() => { handleCloseUserMenu(); router.post(route('logout')); }} sx={{ color: 'error.main' }}>
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
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
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRightColor: 'divider' },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRightColor: 'divider' },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, p: { xs: 1.5, md: 2 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', bgcolor: 'transparent' }}
            >
                <Toolbar sx={{ minHeight: '48px !important' }} />
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
