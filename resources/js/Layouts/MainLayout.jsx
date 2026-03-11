import React, { useState, useContext } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { ColorModeContext } from '../app';
import {
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
    Menu,
    MenuItem,
    Tooltip,
    useTheme,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Inventory as InventoryIcon,
    Medication as ProductIcon,
    ShoppingCart as POSIcon,
    People as CustomersIcon,
    Assessment as ReportsIcon,
    Payments as ExpensesIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
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
} from '@mui/icons-material';

const drawerWidth = 200; // More compact sidebar

export default function MainLayout({ children, header }) {
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);
    const { auth, flash } = usePage().props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorElUser, setAnchorElUser] = useState(null);
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

    const menuItems = {
        dashboard: { text: 'Dashboard', icon: <DashboardIcon fontSize="small" />, href: route('dashboard'), routePattern: 'dashboard', permission: null },
        pos: { text: 'POS', icon: <POSIcon fontSize="small" />, href: route('pos.index'), routePattern: 'pos.*', permission: 'process_sale' },

        inventory: { text: 'Inventory', icon: <InventoryIcon fontSize="small" />, href: route('inventory.index'), routePattern: 'inventory.index', permission: 'manage_inventory' },
        medicines: { text: 'Medicines', icon: <ProductIcon fontSize="small" />, href: route('products.index'), routePattern: 'products.*', permission: 'manage_inventory' },
        categories: { text: 'Categories', icon: <CategoryIcon fontSize="small" />, href: route('categories.index'), routePattern: 'categories.*', permission: 'manage_inventory' },
        units: { text: 'Units', icon: <UnitIcon fontSize="small" />, href: route('units.index'), routePattern: 'units.*', permission: 'manage_inventory' },
        taxes: { text: 'Tax Configuration', icon: <TaxIcon fontSize="small" />, href: route('taxes.index'), routePattern: 'taxes.*', permission: 'manage_inventory' },

        suppliers: { text: 'Suppliers', icon: <SupplierIcon fontSize="small" />, href: route('suppliers.index'), routePattern: 'suppliers.*', permission: 'manage_inventory' },
        purchases: { text: 'Purchases', icon: <PurchaseIcon fontSize="small" />, href: route('purchases.index'), routePattern: 'purchases.*', permission: 'manage_inventory' },

        adjustments: { text: 'Adjustments', icon: <AdjustmentIcon fontSize="small" />, href: route('inventory.adjustments.index'), routePattern: 'inventory.adjustments.*', permission: 'manage_inventory' },
        transfers: { text: 'Transfers', icon: <TransferIcon fontSize="small" />, href: route('inventory.transfers.index'), routePattern: 'inventory.transfers.*', permission: 'manage_inventory' },

        customers: { text: 'Customers', icon: <CustomersIcon fontSize="small" />, href: '#', routePattern: null, permission: 'process_sale' },
        returns: { text: 'Returns', icon: <ReturnIcon fontSize="small" />, href: route('returns.index'), routePattern: 'returns.*', permission: 'process_sale' },

        sales: { text: 'Sales', icon: <SalesIcon fontSize="small" />, href: route('sales.index'), routePattern: 'sales.*', permission: 'view_financial_reports' },
        expenses: { text: 'Expenses', icon: <ExpensesIcon fontSize="small" />, href: route('expenses.index'), routePattern: 'expenses.*', permission: 'view_financial_reports' },
        expenseCategories: { text: 'Expense Categories', icon: <ExpenseCategoryIcon fontSize="small" />, href: route('expense-categories.index'), routePattern: 'expense-categories.*', permission: 'view_financial_reports' },
        reports: { text: 'Reports', icon: <ReportsIcon fontSize="small" />, href: route('reports.index'), routePattern: 'reports.*', permission: 'view_financial_reports' },

        staff: { text: 'Staff Management', icon: <StaffIcon fontSize="small" />, href: route('staff.index'), routePattern: 'staff.*', permission: 'manage_users' },
        roles: { text: 'Role Management', icon: <RolesIcon fontSize="small" />, href: route('roles.index'), routePattern: 'roles.*', permission: 'manage_users' },
        branches: { text: 'Branch Management', icon: <StoreIcon fontSize="small" />, href: route('branches.index'), routePattern: 'branches.*', permission: 'manage_branches' },
        permissions: { text: 'Permission', icon: <PermissionsIcon fontSize="small" />, href: route('permissions.index'), routePattern: 'permissions.*', permission: 'manage_users' },
        settings: { text: 'Settings', icon: <SettingsIcon fontSize="small" />, href: route('settings.index'), routePattern: 'settings.*', permission: 'manage_branches' },
    };

    const menuGroups = [
        { label: 'Main', keys: ['dashboard', 'pos'] },
        { label: 'Inventory', keys: ['inventory', 'medicines', 'categories', 'units', 'taxes'] },
        { label: 'Purchasing', keys: ['suppliers', 'purchases'] },
        { label: 'Stock', keys: ['adjustments', 'transfers'] },
        { label: 'Sales', keys: ['customers', 'returns', 'sales'] },
        { label: 'Finance', keys: ['expenses', 'expenseCategories', 'reports'] },
        { label: 'Administration', keys: ['staff', 'roles', 'branches', 'permissions', 'settings'] },
    ];

    const canSee = (item) => !item.permission || auth.user?.permissions?.includes(item.permission);

    const drawer = (
        <div>
            <Toolbar sx={{ minHeight: '48px !important' }}>
                <Typography variant="subtitle1" noWrap component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Pharmacy POS
                </Typography>
            </Toolbar>
            <Divider />
            {menuGroups.map((group, groupIndex) => {
                const visibleItems = group.keys
                    .map((k) => menuItems[k])
                    .filter(Boolean)
                    .filter((item) => canSee(item));

                if (visibleItems.length === 0) {
                    return null;
                }

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
                                    {group.label}
                                </ListSubheader>
                            }
                        >
                            {visibleItems.map((item) => {
                                const isActive = item.routePattern ? route().current(item.routePattern) : false;

                                return (
                                    <ListItem key={item.text} disablePadding>
                                        <ListItemButton
                                            component={Link}
                                            href={item.href}
                                            selected={isActive}
                                            sx={{
                                                py: 0.5,
                                                borderRadius: 1,
                                                mx: 0.5,
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
                                                {item.icon}
                                            </ListItemIcon>
                                            <ListItemText primary={item.text} primaryTypographyProps={{ variant: 'body2', fontWeight: isActive ? 600 : 400 }} />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                        {groupIndex < menuGroups.length - 1 && <Divider sx={{ my: 0.75 }} />}
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
                            primary="Logout" 
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
                    bgcolor: 'background.paper',
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
                        <IconButton onClick={colorMode.toggleColorMode} color="inherit" size="small">
                            {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                        </IconButton>
                        
                        <Tooltip title="Open settings">
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
                        >
                            <MenuItem component={Link} href={route('profile.edit')} onClick={handleCloseUserMenu}>
                                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                                <Typography variant="body2">Profile</Typography>
                            </MenuItem>
                            <MenuItem onClick={() => { handleCloseUserMenu(); router.post(route('logout')); }}>
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                <Typography variant="body2">Logout</Typography>
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
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', bgcolor: 'background.default' }}
            >
                <Toolbar />
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
