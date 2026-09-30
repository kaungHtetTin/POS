import React, { useContext, useLayoutEffect, useState } from 'react';
import { Link, usePage, router } from '@/spa';
import PersistentShellContext from '@/contexts/PersistentShellContext';
import { ColorModeContext } from '@/contexts/ColorModeContext';
import SimpleIcon from '@/Components/SimpleIcon';
import PageContainer from '@/Components/PageContainer';
import {
    Badge,
    AppBar,
    Box,
    Button,
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
    Menu,
    MenuItem,
    Toolbar,
    Typography,
    Avatar,
    Tooltip,
    Snackbar,
    Alert,
    Stack,
} from '@mui/material';

const expandedDrawerWidth = 204;
const collapsedDrawerWidth = 56;

const pageDescriptions = {
    'Pharmacy Dashboard': 'Monitor stock risks, returns, balances, and the next actions for today.',
    'Medicine Management': 'Search, review, and maintain the medicines available across branches.',
    'Add New Medicine': 'Create a medicine with its selling units, barcode, image, and stock rules.',
    'Edit Medicine': 'Update medicine identity, units, pricing rules, and inventory settings.',
    'Import Medicines': 'Validate and import medicine records from a prepared CSV file.',
    'Category Management': 'Organize medicines into consistent groups for faster selling and reporting.',
    'Tax Configuration': 'Maintain the tax rules applied to purchases and sales.',
    'Inventory Stock Reports': 'Compare available stock by branch, batch, and medicine.',
    'Inventory Detail': 'Review batch quantities, expiry dates, valuation, and movement history.',
    'Inventory Control': 'Record auditable stock corrections for damage, loss, and counting differences.',
    'Stock Transfers': 'Move stock between branches with clear source and destination records.',
    'Supplier Management': 'Maintain supplier contacts, balances, purchases, and payment history.',
    'Supplier Statement': 'Review supplier purchases, payments, credits, and the current balance.',
    'Import Suppliers': 'Validate and import supplier contacts from a prepared CSV file.',
    'Purchase Workflow': 'Receive stock, monitor purchase status, and manage supplier invoices.',
    'Create Purchase': 'Record received batches, costs, free quantities, and supplier payment details.',
    'Purchase Invoice': 'Review the purchase invoice, received lines, payments, and return activity.',
    'Customer Management': 'Maintain customer contacts, credit balances, and account status.',
    'Customer Detail': 'Review customer sales, returns, payments, and account activity.',
    'Sale History': 'Find completed sales, review payment status, and open invoice details.',
    'Sale Detail': 'Review sold items, payments, returns, and the financial result of this sale.',
    'Returns & Refunds': 'Return individual invoice items and keep stock, credits, and refunds synchronized.',
    'Financials': 'Record operating expenses with consistent categories and references.',
    'Expense Categories': 'Maintain the categories used to classify operating expenses.',
    'Amount Receivable': 'Track customer credit, due dates, collections, and remaining balances.',
    'Outstanding Balance': 'Track supplier payables, payments, credits, and remaining balances.',
    'Finance Report': 'Review sales, cost, returns, expenses, and profit for a selected period.',
    'Sale Report': 'Analyze customer sales, returns, and net revenue over time.',
    'Purchases Report': 'Analyze purchase value, supplier activity, and payment status.',
    'Supplier Purchase Report': 'Compare purchasing and balances by supplier.',
    'Cash Session Report': 'Reconcile shift sales, refunds, expected cash, and closing differences.',
    'Expiry Report': 'Identify expired and near-expiry batches before they affect sales.',
    'Low Balance Report': 'Identify medicines that need replenishment by branch.',
    'Sale Representative': 'Review sales performance and totals by staff member.',
    'Staff Management': 'Maintain employee access, branch assignments, and account status.',
    'Role Management': 'Control reusable access roles and their assigned permissions.',
    'Permission Reference': 'Review the permissions available throughout the application.',
    'Branch Management': 'Maintain operating locations and branch status.',
    'Activity Logs': 'Audit important user actions and operational changes.',
    'System Settings': 'Configure business identity, localization, appearance, and POS behavior.',
    'Profile Settings': 'Update your account details, password, and profile information.',
    'System Operating Procedure (SOP)': 'Use the operating guide for routine sales, stock, and finance tasks.',
};

const descriptionFor = (header) => pageDescriptions[header] || 'Use the controls below to review and manage this workspace.';

export default function MainLayout(props) {
    const persistentShell = useContext(PersistentShellContext);

    if (persistentShell) {
        return <EmbeddedPage {...props} shell={persistentShell} />;
    }

    return <MainLayoutShell {...props} />;
}

function EmbeddedPage({ children, header, shell }) {
    const compactMedicineForm = header === 'Add New Medicine' || header === 'Edit Medicine';

    useLayoutEffect(() => {
        shell.setHeader(header || '');
    }, [header, shell]);

    return (
        <PageContainer normalizeLegacyPadding>
            {header && (
                <Box component="header" sx={{ mb: compactMedicineForm ? 0.75 : 1.75, minWidth: 0 }}>
                    <Typography component="h1" sx={{ color: 'text.primary', fontSize: compactMedicineForm ? 18 : 22, fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.35px' }}>
                        {header}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: compactMedicineForm ? 0.2 : 0.375, maxWidth: 760, fontSize: compactMedicineForm ? 11 : 12, lineHeight: 1.4 }}>
                        {descriptionFor(header)}
                    </Typography>
                </Box>
            )}
            {children}
        </PageContainer>
    );
}

function MainLayoutShell({ children, header, setAppBarTarget, setAppBarBackTarget }) {
    const { auth, flash, settings = {}, nav_counts = {}, translations = {}, locale, ziggy = {} } = usePage().props;
    const { mode = 'light', toggleColorMode } = useContext(ColorModeContext);
    const pharmacyName = settings.invoice?.pharmacy_name || 'Pharmacy POS';
    const appBase = ziggy?.base || window.laravel_base || '';
    const withBase = (path) => `${appBase}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/{2,}/g, '/');
    const storageUrl = (path) => withBase(`/storage/${String(path || '').replace(/^\/+/, '')}`);

    const __ = (key) => translations[key] || key;

    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopCollapsed, setDesktopCollapsed] = useState(() => window.localStorage.getItem('mkpos.sidebar.collapsed') === '1');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [branchMenuAnchor, setBranchMenuAnchor] = useState(null);

    const accessibleBranches = auth.user?.accessible_branches || [];
    const currentBranchId = auth.user?.current_branch_id || '';
    const currentBranch = accessibleBranches.find((branch) => String(branch.id) === String(currentBranchId));
    const isPosScreen = route().current('pos.index');

    const switchBranch = (branchId) => {
        setBranchMenuAnchor(null);
        if (String(branchId) === String(currentBranchId)) return;

        router.post(
            route('active-branch.update'),
            { branch_id: branchId },
            { preserveScroll: false },
        );
    };

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

    const handleDesktopDrawerToggle = () => {
        setDesktopCollapsed((current) => {
            const next = !current;
            window.localStorage.setItem('mkpos.sidebar.collapsed', next ? '1' : '0');
            return next;
        });
    };

    const desktopDrawerWidth = desktopCollapsed ? collapsedDrawerWidth : expandedDrawerWidth;

    const changeLanguage = (lang) => {
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
        medicines: { text: 'Products', icon: 'pill', href: route('products.index'), routePattern: 'products.*', permission: 'manage_products' },
        categories: { text: 'Categories', icon: 'tag', href: route('categories.index'), routePattern: 'categories.*', permission: 'manage_products' },
        taxes: { text: 'Tax Calculation', icon: 'percent', href: route('taxes.index'), routePattern: 'taxes.*', permission: 'manage_products' },
        lowBalanceReport: { text: 'Low Balance Report', icon: 'chart', href: route('reports.low-balance'), routePattern: 'reports.low-balance', permission: 'manage_inventory' },

        suppliers: { text: 'Suppliers', icon: 'truck', href: route('suppliers.index'), routePattern: 'suppliers.*', permission: 'manage_suppliers' },
        purchases: { text: 'Purchases', icon: 'receipt', href: route('purchases.index'), routePattern: 'purchases.*', permission: 'manage_purchases' },
        purchasesReport: { text: 'Purchases Report', icon: 'chart', href: route('reports.purchases'), routePattern: 'reports.purchases', permission: 'view_financial_reports' },

        adjustments: { text: 'Adjustments', icon: 'sliders', href: route('inventory.adjustments.index'), routePattern: 'inventory.adjustments.*', permission: 'adjust_stock' },
        transfers: { text: 'Transfers', icon: 'arrows', href: route('inventory.transfers.index'), routePattern: 'inventory.transfers.*', permission: 'adjust_stock' },

        customers: { text: 'Customers', icon: 'users', href: route('customers.index'), routePattern: 'customers.*', permission: 'process_sale' },
        amountReceivable: { text: 'Amount Receivable', icon: 'wallet', href: route('finance.amount-receivable'), routePattern: 'finance.amount-receivable.*', permission: 'manage_payments' },

        sales: { text: 'Sale History', icon: 'receipt', href: route('sales.index'), routePattern: 'sales.index', permission: 'view_financial_reports' },
        returns: { text: 'Returns & Refunds', icon: 'rotate', href: route('returns.index'), routePattern: 'returns.*', anyPermission: ['process_sale', 'manage_payments'] },
        salesCustomerReport: { text: 'Sale Report', icon: 'chart', href: route('reports.sales-by-customers'), routePattern: 'reports.sales-by-customers', permission: 'view_financial_reports' },
        expenses: { text: 'Expenses', icon: 'wallet', href: route('expenses.index'), routePattern: 'expenses.*', permission: 'manage_expenses' },
        expenseCategories: { text: 'Expense Category', icon: 'tag', href: route('expense-categories.index'), routePattern: 'expense-categories.*', permission: 'manage_expenses' },
        pendingPayments: { text: 'Outstanding Balance', icon: 'wallet', href: route('finance.outstanding-balance'), routePattern: 'finance.outstanding-balance', permission: 'manage_payments' },
        reports: { text: 'Finance Report', icon: 'chart', href: route('reports.index'), routePattern: 'reports.index', permission: 'view_financial_reports' },
        cashSessionReport: { text: 'Cash Session Report', icon: 'wallet', href: route('reports.cash-sessions'), routePattern: 'reports.cash-sessions', permission: 'view_financial_reports' },
        expiryReport: { text: 'Expired Report', icon: 'history', href: route('reports.expiry'), routePattern: 'reports.expiry', permission: 'manage_inventory' },

        salePersonReports: { text: 'Sale Representative', icon: 'chart', href: route('finance.sale-representative'), routePattern: 'finance.sale-representative', permission: 'view_financial_reports' },
        administration: { text: 'Staff Management', icon: 'settings', href: route('administration.index'), routePattern: 'administration.index', permission: 'manage_staff' },
        roles: { text: 'Role Management', icon: 'id', href: route('roles.index'), routePattern: 'roles.*', permission: 'manage_roles_permissions' },
        branches: { text: 'Branch Management', icon: 'store', href: route('branches.index'), routePattern: 'branches.*', permission: 'manage_branches' },
        permissions: { text: 'Permission', icon: 'shieldCheck', href: route('permissions.index'), routePattern: 'permissions.*', permission: 'manage_roles_permissions' },
        activityLogs: { text: 'Activity Logs', icon: 'history', href: route('activity-logs.index'), routePattern: 'activity-logs.*', permission: 'monitor_activity' },
        settings: { text: 'Settings', icon: 'settings', href: route('settings.index'), routePattern: 'settings.*', permission: 'manage_settings' },
        manual: { text: 'SOP Manual', icon: 'book', href: route('manual.index'), routePattern: 'manual.index', permission: null },
    };

    const menuGroups = [
        { label: 'Main', keys: ['dashboard', 'pos'] },
        { label: 'Stock', keys: ['inventory', 'medicines', 'categories', 'expiryReport', 'lowBalanceReport', 'adjustments', 'transfers', 'taxes'] },
        { label: 'Purchasing', keys: ['suppliers', 'purchases', 'purchasesReport'] },
        { label: 'Sales', keys: ['customers', 'sales', 'returns', 'salesCustomerReport'] },
        { label: 'Finance', keys: ['expenses', 'expenseCategories', 'amountReceivable', 'pendingPayments', 'reports', 'cashSessionReport', 'salePersonReports'] },
        { label: 'Administration', keys: ['administration', 'roles', 'branches', 'permissions', 'activityLogs', 'manual'] },
        { label: 'Setting', keys: ['settings'] },
    ];

    const canSee = (item) => {
        const userPermissions = auth.user?.permissions || [];
        if (item.anyPermission) return item.anyPermission.some((permission) => userPermissions.includes(permission));
        return !item.permission || userPermissions.includes(item.permission);
    };

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

    const renderDrawer = (collapsed = false) => (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: '10px 8px', bgcolor: '#0C4A3A', color: '#E4EFE9' }}>
            <Box sx={{ minHeight: 42, mb: 1.25, display: 'flex', alignItems: 'center' }}>
                <Stack direction="row" alignItems="center" justifyContent={collapsed ? 'center' : 'flex-start'} spacing={collapsed ? 0 : 1.25}>
                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 1.5,
                            bgcolor: 'rgba(255,255,255,0.12)',
                            color: '#FFFFFF',
                            border: '1px solid',
                            borderColor: 'rgba(255,255,255,0.18)',
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
                    <Box sx={{ minWidth: 0, display: collapsed ? 'none' : 'block' }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1, letterSpacing: '0.2px' }}>
                            {pharmacyName}
                        </Typography>
                        <Typography variant="caption" noWrap display="block" sx={{ mt: 0.25, color: 'rgba(255,255,255,0.66)', fontSize: 10 }}>
                            Business operations
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                {visibleMenuGroups.map((group, groupIndex) => (
                    <Box key={group.label}>
                        <List
                            dense
                            sx={{ py: 0 }}
                            subheader={
                                <ListSubheader
                                    component="div"
                                    disableSticky
                                    sx={{
                                        display: collapsed ? 'none' : 'block',
                                        px: 1.5,
                                        py: 0.6,
                                        lineHeight: 1.2,
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: 'rgba(255,255,255,0.62)',
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
                                            title={collapsed ? __(item.text) : undefined}
                                            aria-label={__(item.text)}
                                            sx={{
                                                minHeight: 36,
                                                py: '7px',
                                                px: collapsed ? '9px' : '9px',
                                                mx: 0,
                                                borderRadius: '6px',
                                                justifyContent: collapsed ? 'center' : 'flex-start',
                                                color: isActive ? '#0C4A3A' : 'rgba(255,255,255,0.76)',
                                                '&.Mui-selected': {
                                                    bgcolor: '#DDF5E9',
                                                    color: '#0C4A3A',
                                                },
                                                '&.Mui-selected:hover': {
                                                    bgcolor: '#DDF5E9',
                                                    color: '#0C4A3A',
                                                },
                                                '&:hover': {
                                                    bgcolor: 'rgba(255,255,255,0.10)',
                                                    color: '#FFFFFF',
                                                },
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 34, color: 'inherit', justifyContent: 'center' }}>
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
                                                    fontSize: 13,
                                                    fontWeight: isActive ? 650 : 500,
                                                }}
                                                sx={{ display: collapsed ? 'none' : 'block' }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                        {groupIndex < visibleMenuGroups.length - 1 && (
                            <Divider sx={{ my: 0.5, mx: 1.25, borderColor: 'rgba(255,255,255,0.14)' }} />
                        )}
                    </Box>
                ))}
            </Box>

            <Box sx={{ mt: 1.5, pt: 1.25, borderTop: '1px solid rgba(255,255,255,0.14)' }}>
                <Stack direction="row" alignItems="center" justifyContent={collapsed ? 'center' : 'flex-start'} spacing={collapsed ? 0 : 1.1}>
                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                            auth.user?.roles?.some((role) => ['Owner', 'Root'].includes(role)) ? (
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
                    <Box sx={{ minWidth: 0, flex: 1, display: collapsed ? 'none' : 'block' }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                            {auth.user?.name}
                        </Typography>
                        <Typography variant="caption" noWrap display="block" sx={{ color: 'rgba(255,255,255,0.66)', fontSize: 10 }}>
                            {auth.user?.roles?.map((roleName) => __(roleName)).join(', ') || auth.user?.email}
                        </Typography>
                    </Box>
                    <Tooltip title={__('Logout')}>
                        <Button
                            size="small"
                            onClick={() => router.post(route('logout'))}
                            aria-label={__('Logout')}
                            startIcon={<SimpleIcon name="logout" size={16} />}
                            sx={{
                                display: collapsed ? 'none' : 'inline-flex',
                                minWidth: 0,
                                minHeight: 28,
                                height: 28,
                                px: 0.75,
                                gap: 0.25,
                                fontSize: 11,
                                lineHeight: 1,
                                color: '#FFFFFF',
                                border: '1px solid rgba(255,255,255,0.19)',
                                bgcolor: 'transparent',
                                '& .MuiButton-startIcon': { mr: 0.5, ml: 0 },
                                '& .MuiButton-startIcon svg': { width: 14, height: 14 },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.30)' },
                            }}
                        >
                            {!collapsed && __('Logout')}
                        </Button>
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
                    width: { md: `calc(100% - ${desktopDrawerWidth}px)` },
                    ml: { md: `${desktopDrawerWidth}px` },
                    color: 'text.primary',
                    boxShadow: '0 1px 4px rgba(19,34,56,0.04)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0,
                    zIndex: (muiTheme) => muiTheme.zIndex.drawer - 1,
                    transition: 'width 180ms cubic-bezier(.2,.75,.25,1), margin-left 180ms cubic-bezier(.2,.75,.25,1)',
                    '& .MuiButton-root': {
                        minHeight: 30,
                        height: 30,
                        px: 1,
                        borderRadius: '5px',
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: 1,
                        letterSpacing: 0,
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                        boxShadow: 'none',
                        '& .MuiButton-startIcon': { mr: 0.75 },
                        '& .MuiButton-startIcon .MuiSvgIcon-root, & .MuiButton-startIcon svg': {
                            width: 15,
                            height: 15,
                            fontSize: 15,
                        },
                    },
                    '& .MuiButton-contained': {
                        color: '#fff',
                        bgcolor: 'primary.main',
                        border: '1px solid',
                        borderColor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark', borderColor: 'primary.dark', boxShadow: 'none' },
                    },
                    '& .MuiButton-outlined, & .MuiButton-text': {
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                            color: 'primary.main',
                            bgcolor: 'primary.soft',
                            borderColor: 'primary.main',
                        },
                    },
                    '& .MuiButton-root.Mui-disabled': {
                        color: 'text.disabled',
                        bgcolor: 'action.disabledBackground',
                        borderColor: 'divider',
                    },
                    '& .MuiIconButton-root': {
                        width: 30,
                        minWidth: 30,
                        height: 30,
                        borderRadius: '5px',
                        color: 'text.primary',
                        '& svg': { width: 16, height: 16 },
                    },
                    '& .MuiIconButton-root:not(.mkpos-bare-action)': {
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        '&:hover': { color: 'primary.main', bgcolor: 'primary.soft', borderColor: 'primary.main' },
                    },
                }}
            >
                <Toolbar sx={{ minHeight: '44px !important', height: 44, px: { xs: 1, md: '14px' }, gap: 1 }}>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ display: { md: 'none' } }}
                    >
                        <SimpleIcon name="menu" size={20} />
                    </IconButton>
                    <Tooltip title={desktopCollapsed ? __('Expand navigation') : __('Collapse navigation')}>
                        <IconButton
                            color="inherit"
                            aria-label={desktopCollapsed ? __('Expand navigation') : __('Collapse navigation')}
                            onClick={handleDesktopDrawerToggle}
                            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                        >
                            <SimpleIcon name="sidebar" size={18} />
                        </IconButton>
                    </Tooltip>
                    <Box
                        ref={setAppBarBackTarget}
                        id="mkpos-appbar-back"
                        sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    />
                    <Box
                        ref={setAppBarTarget}
                        id="mkpos-appbar-tools"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: 0.75,
                            minWidth: 0,
                            flex: 1,
                            maxWidth: '100%',
                            overflowX: 'auto',
                            scrollbarWidth: 'none',
                            '&::-webkit-scrollbar': { display: 'none' },
                        }}
                    />

                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        flexShrink: 0,
                        ml: 0.75,
                    }}>
                        {isPosScreen && accessibleBranches.length > 0 && (
                            <>
                                <Tooltip title={__('Switch branch')}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<SimpleIcon name="store" size={15} />}
                                        onClick={(event) => setBranchMenuAnchor(event.currentTarget)}
                                        aria-haspopup="menu"
                                        aria-expanded={Boolean(branchMenuAnchor)}
                                        sx={{
                                            maxWidth: { xs: 118, md: 180 },
                                            justifyContent: 'flex-start',
                                            '& .MuiButton-startIcon': { flexShrink: 0 },
                                        }}
                                    >
                                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {currentBranch?.name || __('Select branch')}
                                        </Box>
                                    </Button>
                                </Tooltip>
                                <Menu
                                    anchorEl={branchMenuAnchor}
                                    open={Boolean(branchMenuAnchor)}
                                    onClose={() => setBranchMenuAnchor(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                    slotProps={{ paper: { sx: { mt: 0.5, minWidth: 220, maxHeight: 360 } } }}
                                >
                                    {accessibleBranches.map((branch) => (
                                        <MenuItem
                                            key={branch.id}
                                            selected={String(branch.id) === String(currentBranchId)}
                                            onClick={() => switchBranch(branch.id)}
                                            sx={{ gap: 1, fontSize: 12.5 }}
                                        >
                                            <SimpleIcon name="store" size={16} />
                                            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {branch.name}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Menu>
                            </>
                        )}
                        <Tooltip title={locale === 'my' ? __('Change language to English') : __('Change language to Myanmar')}>
                            <IconButton
                                onClick={() => changeLanguage(locale === 'my' ? 'en' : 'my')}
                                color="inherit"
                                size="small"
                                aria-label={locale === 'my' ? __('Change language to English') : __('Change language to Myanmar')}
                            >
                                <SimpleIcon name="globe" size={17} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={mode === 'dark' ? __('Switch to light mode') : __('Switch to dark mode')}>
                            <IconButton
                                onClick={toggleColorMode}
                                color="inherit"
                                size="small"
                                aria-label={mode === 'dark' ? __('Switch to light mode') : __('Switch to dark mode')}
                            >
                                <SimpleIcon name={mode === 'dark' ? 'sun' : 'moon'} size={17} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={__('Refresh')}>
                            <IconButton onClick={() => router.reload()} color="inherit" size="small" aria-label={__('Refresh')}>
                                <SimpleIcon name="rotate" size={17} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { md: desktopDrawerWidth }, flexShrink: { md: 0 }, transition: 'width 180ms cubic-bezier(.2,.75,.25,1)' }}
                aria-label="Primary navigation"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: expandedDrawerWidth,
                            borderRightColor: 'rgba(255,255,255,0.12)',
                            borderRadius: 0,
                        },
                    }}
                >
                    {renderDrawer(false)}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: desktopDrawerWidth,
                            borderRightColor: 'rgba(255,255,255,0.12)',
                            borderRadius: 0,
                            overflowX: 'hidden',
                            transition: 'width 180ms cubic-bezier(.2,.75,.25,1)',
                        },
                    }}
                    open
                >
                    {renderDrawer(desktopCollapsed)}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 0,
                    width: { md: `calc(100% - ${desktopDrawerWidth}px)` },
                    minWidth: 0,
                    minHeight: '100vh',
                    bgcolor: 'transparent',
                }}
            >
                <Toolbar sx={{ minHeight: '44px !important' }} />
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
