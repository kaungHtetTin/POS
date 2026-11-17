import React, { useContext, useLayoutEffect, useState } from 'react';
import { Link, usePage, router } from '@/spa';
import PersistentShellContext from '@/contexts/PersistentShellContext';
import { ColorModeContext } from '@/contexts/ColorModeContext';
import SimpleIcon from '@/Components/SimpleIcon';
import PageContainer from '@/Components/PageContainer';
import {
    TextField,
    InputAdornment,
    Collapse,
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

const expandedDrawerWidth = 224;
const collapsedDrawerWidth = 64;

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
            {header && header !== 'Pharmacy Dashboard' && (
                <Box component="header" sx={{ mb: compactMedicineForm ? 0.75 : 1.25, minWidth: 0 }}>
                    <Typography component="h1" sx={{ color: 'text.primary', fontSize: compactMedicineForm ? 20 : 22, fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.35px' }}>
                        {header}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: compactMedicineForm ? 0.2 : 0.375, maxWidth: 760, fontSize: compactMedicineForm ? 12 : 13, lineHeight: 1.4 }}>
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
    const [navigationQuery, setNavigationQuery] = useState('');
    const [openGroups, setOpenGroups] = useState({});
    const [navigationMenu, setNavigationMenu] = useState(null);
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
        profile: { text: 'Profile', icon: 'user', href: route('profile.edit'), routePattern: 'profile.*', permission: null },
        manual: { text: 'SOP Manual', icon: 'book', href: route('manual.index'), routePattern: 'manual.index', permission: null },
    };

    const menuGroups = [
        { label: 'Overview', icon: 'grid', keys: ['dashboard', 'pos'] },
        { label: 'Inventory', icon: 'box', keys: ['inventory', 'medicines', 'categories', 'expiryReport', 'lowBalanceReport', 'adjustments', 'transfers', 'taxes'] },
        { label: 'Purchasing', icon: 'truck', keys: ['suppliers', 'purchases', 'purchasesReport'] },
        { label: 'Sales', icon: 'receipt', keys: ['customers', 'sales', 'returns', 'salesCustomerReport'] },
        { label: 'Finance', icon: 'wallet', keys: ['expenses', 'expenseCategories', 'amountReceivable', 'pendingPayments', 'reports', 'cashSessionReport', 'salePersonReports'] },
        { label: 'Administration', icon: 'shieldCheck', keys: ['administration', 'roles', 'branches', 'permissions', 'activityLogs'] },
        { label: 'Settings', icon: 'settings', keys: ['profile', 'settings', 'manual'] },
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

    const selectedGroup = visibleMenuGroups.find((group) => group.visibleItems.some((item) => isActiveRoute(item.routePattern, item.href)));
    const selectedItem = selectedGroup?.visibleItems.find((item) => isActiveRoute(item.routePattern, item.href));
    const closeNavigation = () => { setMobileOpen(false); setNavigationMenu(null); setNavigationQuery(''); };

    const renderNavigationItem = (item, { collapsed = false, nested = false } = {}) => {
        const selected = isActiveRoute(item.routePattern, item.href);
        return <ListItem key={item.key} disablePadding sx={{ mb: 0.25 }}>
            <Tooltip title={collapsed ? __(item.text) : ''} placement="right">
                <ListItemButton component={Link} href={item.href} selected={selected} onClick={closeNavigation} aria-label={__(item.text)} aria-current={selected ? 'page' : undefined} sx={{ minHeight: { xs: 42, md: 34 }, px: collapsed ? 1 : 1.25, borderRadius: '7px', position: 'relative', justifyContent: collapsed ? 'center' : 'flex-start', color: selected ? 'primary.main' : 'text.secondary', '&.Mui-selected': { bgcolor: 'primary.soft', color: 'primary.main' }, '&.Mui-selected:hover': { bgcolor: 'primary.soft' }, '&.Mui-selected::before': { content: '""', position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, borderRadius: '0 3px 3px 0', bgcolor: 'primary.main' }, '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }}>
                    <ListItemIcon sx={{ minWidth: collapsed ? 0 : 27, color: 'inherit', opacity: selected ? 1 : 0.8 }}><Badge badgeContent={collapsed ? item.count : 0} max={99} color="error"><SimpleIcon name={item.icon} size={nested ? 15 : 18} /></Badge></ListItemIcon>
                    {!collapsed && <><ListItemText primary={__(item.text)} primaryTypographyProps={{ fontSize: nested ? 11.5 : 12.5, fontWeight: selected ? 700 : 500, noWrap: true }} />{item.count > 0 && <Box component="span" sx={{ ml: 0.5, px: 0.65, py: 0.1, borderRadius: '5px', bgcolor: selected ? 'background.paper' : 'action.hover', fontSize: 10, fontWeight: 700 }}>{item.count > 99 ? '99+' : item.count}</Box>}</>}
                </ListItemButton>
            </Tooltip>
        </ListItem>;
    };

    const renderDrawer = (collapsed = false, surface = 'desktop') => (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', color: 'text.primary' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: collapsed ? 2 : 1.75, minHeight: 58, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ width: 31, height: 31, flexShrink: 0, borderRadius: '9px', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', boxShadow: '0 2px 6px rgba(23,107,91,0.15)' }}>
                    {settings.invoice?.logo_path ? <Box component="img" src={storageUrl(settings.invoice.logo_path)} alt={pharmacyName} sx={{ width: 25, height: 25, objectFit: 'contain' }} /> : <SimpleIcon name="pill" size={19} />}
                </Box>
                {!collapsed && <Box sx={{ minWidth: 0 }}><Typography title={pharmacyName} noWrap sx={{ fontWeight: 800, fontSize: 13, lineHeight: 1.35 }}>{pharmacyName}</Typography><Stack direction="row" alignItems="center" spacing={0.5}><Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'primary.main' }} /><Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 10 }}>{__('Pharmacy workspace')}</Typography></Stack></Box>}
            </Stack>
            {!collapsed && <Box sx={{ px: 1.25, pt: 1.25, pb: 0.75 }}>
                <TextField size="small" placeholder={__('Search pages…')} value={navigationQuery} onChange={(event) => setNavigationQuery(event.target.value)} inputProps={{ 'aria-label': __('Search navigation') }} InputProps={{ startAdornment: <InputAdornment position="start"><SimpleIcon name="search" size={15} /></InputAdornment> }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover', borderRadius: '7px', fontSize: 11.5 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }} />
            </Box>}
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 0.75 }}>
                {visibleMenuGroups.map((group) => {
                    const query = collapsed ? '' : navigationQuery.trim().toLowerCase();
                    const items = group.visibleItems.filter((item) => !query || __(item.text).toLowerCase().includes(query) || __(group.label).toLowerCase().includes(query));
                    if (!items.length) return null;
                    const active = group.visibleItems.some((item) => isActiveRoute(item.routePattern, item.href));
                    const expanded = Boolean(query) || (openGroups[group.label] ?? active);
                    if (group.label === 'Overview') return <Box key={group.label} sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}><List dense disablePadding>{items.map((item) => renderNavigationItem(item, { collapsed }))}</List></Box>;
                    if (collapsed) return <Tooltip key={group.label} title={__(group.label)} placement="right"><IconButton aria-label={`${__('Open')} ${__(group.label)} ${__('navigation')}`} aria-haspopup="menu" aria-expanded={navigationMenu?.group.label === group.label} onClick={(event) => setNavigationMenu({ group, anchor: event.currentTarget })} sx={{ width: 46, height: 38, mb: 0.5, borderRadius: '8px', color: active ? 'primary.main' : 'text.secondary', bgcolor: active ? 'primary.soft' : 'transparent' }}><SimpleIcon name={group.icon} size={20} /></IconButton></Tooltip>;
                    return <Box key={group.label} sx={{ mb: 0.5, ...(group.label === 'Settings' ? { mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' } : {}) }}>
                        <Button fullWidth aria-label={__(group.label)} aria-expanded={expanded} aria-controls={`nav-${surface}-${group.label.toLowerCase()}`} onClick={() => setOpenGroups((value) => ({ ...value, [group.label]: !expanded }))} sx={{ px: 1.25, minHeight: { xs: 42, md: 36 }, justifyContent: 'flex-start', color: active ? 'text.primary' : 'text.secondary', fontSize: 12, fontWeight: active ? 700 : 600, borderRadius: '7px', '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' } }}>
                            <Box sx={{ display: 'flex', width: 27, color: active ? 'primary.main' : 'text.secondary' }}><SimpleIcon name={group.icon} size={18} /></Box><Box sx={{ flex: 1, textAlign: 'left' }}>{__(group.label)}</Box><Box sx={{ display: 'flex', opacity: 0.5, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 140ms ease' }}><SimpleIcon name="chevronRight" size={12} /></Box>
                        </Button>
                        <Collapse in={expanded} timeout="auto"><List id={`nav-${surface}-${group.label.toLowerCase()}`} dense disablePadding sx={{ ml: 2.25, pl: 0.75, my: 0.25, borderLeft: '1px solid', borderColor: 'divider' }}>{items.map((item) => renderNavigationItem(item, { nested: true }))}</List></Collapse>
                    </Box>;
                })}
                {!collapsed && navigationQuery && !visibleMenuGroups.some((group) => __(group.label).toLowerCase().includes(navigationQuery.trim().toLowerCase()) || group.visibleItems.some((item) => __(item.text).toLowerCase().includes(navigationQuery.trim().toLowerCase()))) && <Typography role="status" variant="body2" color="text.secondary" sx={{ p: 1.5 }}>{__('No matching pages')}</Typography>}
            </Box>
            <Box sx={{ p: 1.25, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent={collapsed ? 'center' : 'flex-start'}>
                    <Tooltip title={__('Profile')}><Avatar component={Link} onClick={closeNavigation} href={route('profile.edit')} src={auth.user?.image_path ? storageUrl(auth.user.image_path) : null} sx={{ width: 30, height: 30, borderRadius: '9px', bgcolor: 'primary.soft', color: 'primary.main', fontSize: 12, fontWeight: 700 }}>{auth.user?.name?.charAt(0).toUpperCase()}</Avatar></Tooltip>
                    {!collapsed && <><Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700 }}>{auth.user?.name}</Typography><Typography noWrap variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{auth.user?.roles?.map((name) => __(name)).join(', ') || auth.user?.email}</Typography></Box><Tooltip title={__('Logout')}><IconButton aria-label={__('Logout')} onClick={() => router.post(route('logout'))}><SimpleIcon name="logout" size={16} /></IconButton></Tooltip></>}
                </Stack>
                {collapsed && <IconButton aria-label={__('Logout')} onClick={() => router.post(route('logout'))} sx={{ mt: 0.75, mx: 'auto', display: 'flex' }}><SimpleIcon name="logout" size={16} /></IconButton>}
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
                    boxShadow: '0 2px 10px rgba(19,34,56,0.045)',
                    backgroundImage: (theme) => `linear-gradient(100deg, ${theme.palette.background.paper} 65%, ${theme.palette.primary.soft} 180%)`,
                    '&::after': { content: '""', position: 'absolute', bottom: -1, left: 0, width: 72, height: 2, bgcolor: 'primary.main', opacity: 0.6 },
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0,
                    zIndex: (muiTheme) => muiTheme.zIndex.drawer - 1,
                    transition: 'width 180ms cubic-bezier(.2,.75,.25,1), margin-left 180ms cubic-bezier(.2,.75,.25,1)',
                    '& .appbar-utilities .MuiIconButton-root': { width: { xs: 40, md: 28 }, minWidth: { xs: 40, md: 28 }, height: { xs: 40, md: 28 }, minHeight: { xs: 40, md: 28 }, border: 0, borderRadius: '7px', color: 'text.secondary', bgcolor: 'transparent', '&:hover': { color: 'primary.main', bgcolor: 'primary.soft' } },
                    '& .MuiButton-root': {
                        minHeight: 30,
                        height: 30,
                        px: 1,
                        borderRadius: '8px',
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
                        boxShadow: '0 2px 5px rgba(0,0,0,0.09)',
                        color: '#fff',
                        bgcolor: 'primary.main',
                        border: '1px solid',
                        borderColor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark', borderColor: 'primary.dark', boxShadow: 'none' },
                    },
                    '& .appbar-action-group': { p: '2px', gap: '2px', border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper', flexShrink: 0 },
                    '& .appbar-action-group .MuiButton-outlined, & .appbar-action-group .MuiButton-text': { border: 0, bgcolor: 'transparent', borderRadius: '6px', '&:hover': { bgcolor: 'primary.soft', color: 'primary.main' } },
                    '& .appbar-action-group .MuiButton-root': { height: { xs: 36, md: 26 }, minHeight: { xs: 36, md: 26 } },
                    '& .appbar-search-trigger': { minHeight: { xs: 36, md: 30 }, borderColor: 'transparent', bgcolor: 'action.hover', '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.soft' } },
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
                <Toolbar sx={{ minHeight: '48px !important', height: 48, px: { xs: 1, md: '14px' }, gap: 1 }}>
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
                            aria-expanded={!desktopCollapsed}
                            sx={{ display: { xs: 'none', md: 'inline-flex' }, '&&': { border: 0, borderRadius: '8px', bgcolor: 'primary.soft', color: 'primary.main', '&:hover': { bgcolor: 'action.selected' } } }}
                        >
                            <SimpleIcon name={desktopCollapsed ? "panelExpand" : "panelCollapse"} size={19} />
                        </IconButton>
                    </Tooltip>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ display: { xs: 'none', lg: 'flex' }, minWidth: 0, maxWidth: 205, mr: 0.75, flexShrink: 0 }}>
                        <Box sx={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: '8px', bgcolor: 'primary.soft', color: 'primary.main', flexShrink: 0 }}><SimpleIcon name={selectedGroup?.icon || 'grid'} size={16} /></Box>
                        <Box sx={{ minWidth: 0 }}><Typography component="div" noWrap sx={{ fontSize: 9, fontWeight: 600, lineHeight: 1.3, letterSpacing: '0.04em', color: 'text.secondary' }}>{__(selectedGroup?.label || 'Workspace')}</Typography><Typography component="div" noWrap sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>{__(selectedItem?.text || header || 'Overview')}</Typography></Box>
                    </Stack>
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

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, ml: 0.5 }}>
                        {isPosScreen && accessibleBranches.length > 0 && (
                            <>
                                <Tooltip title={__('Switch branch')}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<SimpleIcon name="store" size={15} />}
                                        endIcon={<Box sx={{ display: 'flex', transform: 'rotate(90deg)' }}><SimpleIcon name="chevronRight" size={12} /></Box>}
                                        onClick={(event) => setBranchMenuAnchor(event.currentTarget)}
                                        aria-haspopup="menu"
                                        aria-expanded={Boolean(branchMenuAnchor)}
                                        sx={{
                                            maxWidth: { xs: 110, md: 180 },
                                            justifyContent: 'flex-start',
                                            borderRadius: '8px !important',
                                            borderColor: 'divider',
                                            bgcolor: 'primary.soft !important',
                                            color: 'primary.main !important',
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
                                    slotProps={{ paper: { sx: { mt: 1, p: 0.5, minWidth: 220, maxHeight: 360, borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', '& .MuiMenuItem-root': { borderRadius: '7px', minHeight: 36, my: 0.25 } } } }}
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
                        <Stack className="appbar-utilities" direction="row" alignItems="center" sx={{ p: { xs: 0, md: '3px' }, borderRadius: '10px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', gap: '2px' }}>
                        <Tooltip title={locale === 'my' ? __('Change language to English') : __('Change language to Myanmar')}>
                            <IconButton
                                onClick={() => changeLanguage(locale === 'my' ? 'en' : 'my')}
                                className="mkpos-bare-action"
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
                                className="mkpos-bare-action"
                                color="inherit"
                                size="small"
                                aria-label={mode === 'dark' ? __('Switch to light mode') : __('Switch to dark mode')}
                            >
                                <SimpleIcon name={mode === 'dark' ? 'sun' : 'moon'} size={17} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={__('Refresh')}>
                            <IconButton className="mkpos-bare-action" onClick={() => router.reload()} color="inherit" size="small" aria-label={__('Refresh')}>
                                <SimpleIcon name="rotate" size={17} />
                            </IconButton>
                        </Tooltip>
                        </Stack>
                        <Box sx={{ display: { xs: 'none', md: 'block' }, height: 24, borderLeft: '1px solid', borderColor: 'divider' }} />
                        <Tooltip title={`${auth.user?.name || ''} · ${__('Profile')}`}>
                            <Avatar component={Link} href={route('profile.edit')} aria-label={__('Open profile')} src={auth.user?.image_path ? storageUrl(auth.user.image_path) : null} sx={{ display: { xs: 'none', md: 'flex' }, width: 30, height: 30, bgcolor: 'primary.soft', color: 'primary.main', border: '1px solid', borderColor: 'divider', borderRadius: '10px', fontSize: 12, fontWeight: 800, textDecoration: 'none', '&:hover': { borderColor: 'primary.main' } }}>{auth.user?.name?.charAt(0).toUpperCase()}</Avatar>
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
                            borderRightColor: 'divider',
                            borderRadius: 0,
                        },
                    }}
                >
                    {renderDrawer(false, 'mobile')}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: desktopDrawerWidth,
                            borderRightColor: 'divider',
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
                <Toolbar sx={{ minHeight: '48px !important' }} />
                {children}
            </Box>

            <Menu anchorEl={navigationMenu?.anchor || null} open={Boolean(navigationMenu)} onClose={() => setNavigationMenu(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} slotProps={{ paper: { sx: { ml: 1, minWidth: 220, maxHeight: '70vh', borderRadius: '10px' } } }}>
                <ListSubheader component="li" disableSticky sx={{ px: 1.5, lineHeight: '32px', fontSize: 10, fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{__(navigationMenu?.group.label || '')}</ListSubheader>
                {navigationMenu?.group.visibleItems.map((item) => <MenuItem key={item.key} component={Link} href={item.href} selected={isActiveRoute(item.routePattern, item.href)} onClick={closeNavigation} sx={{ gap: 1, minHeight: 36, fontSize: 12 }}><ListItemIcon sx={{ minWidth: '24px !important', color: 'inherit' }}><SimpleIcon name={item.icon} size={16} /></ListItemIcon>{__(item.text)}</MenuItem>)}
            </Menu>

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
