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

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon fontSize="small" />, href: route('dashboard'), routePattern: 'dashboard', permission: null },
        { text: 'POS', icon: <POSIcon fontSize="small" />, href: '#', routePattern: null, permission: 'process_sale' },
        { text: 'Medicines', icon: <ProductIcon fontSize="small" />, href: route('products.index'), routePattern: 'products.*', permission: 'manage_inventory' },
        { text: 'Categories', icon: <CategoryIcon fontSize="small" />, href: route('categories.index'), routePattern: 'categories.*', permission: 'manage_inventory' },
        { text: 'Units', icon: <UnitIcon fontSize="small" />, href: route('units.index'), routePattern: 'units.*', permission: 'manage_inventory' },
        { text: 'Tax Configuration', icon: <TaxIcon fontSize="small" />, href: route('taxes.index'), routePattern: 'taxes.*', permission: 'manage_inventory' },
        { text: 'Suppliers', icon: <SupplierIcon fontSize="small" />, href: route('suppliers.index'), routePattern: 'suppliers.*', permission: 'manage_inventory' },
        { text: 'Purchases', icon: <PurchaseIcon fontSize="small" />, href: route('purchases.index'), routePattern: 'purchases.*', permission: 'manage_inventory' },
        { text: 'Customers', icon: <CustomersIcon fontSize="small" />, href: '#', routePattern: null, permission: 'process_sale' },
        { text: 'Reports', icon: <ReportsIcon fontSize="small" />, href: '#', routePattern: null, permission: 'view_financial_reports' },
        { text: 'Staff Management', icon: <StaffIcon fontSize="small" />, href: route('staff.index'), routePattern: 'staff.*', permission: 'manage_users' },
        { text: 'Role Management', icon: <RolesIcon fontSize="small" />, href: route('roles.index'), routePattern: 'roles.*', permission: 'manage_users' },
        { text: 'Branch Management', icon: <StoreIcon fontSize="small" />, href: route('branches.index'), routePattern: 'branches.*', permission: 'manage_branches' },
        { text: 'Permission', icon: <PermissionsIcon fontSize="small" />, href: route('permissions.index'), routePattern: 'permissions.*', permission: 'manage_users' },
        { text: 'Settings', icon: <SettingsIcon fontSize="small" />, href: route('settings.index'), routePattern: 'settings.*', permission: 'manage_branches' },
    ];

    const filteredMenuItems = menuItems.filter(item => 
        !item.permission || auth.user?.permissions?.includes(item.permission)
    );

    const drawer = (
        <div>
            <Toolbar sx={{ minHeight: '48px !important' }}>
                <Typography variant="subtitle1" noWrap component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Pharmacy POS
                </Typography>
            </Toolbar>
            <Divider />
            <List dense>
                {filteredMenuItems.map((item) => {
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
                            <ListItemIcon sx={{ 
                                minWidth: 40,
                                color: isActive ? 'primary.main' : 'inherit' 
                            }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText 
                                primary={item.text} 
                                primaryTypographyProps={{ variant: 'body2', fontWeight: isActive ? 600 : 400 }} 
                            />
                        </ListItemButton>
                    </ListItem>
                    );
                })}
            </List>
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
