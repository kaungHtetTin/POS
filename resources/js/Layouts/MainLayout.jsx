import React, { useState, useContext } from 'react';
import { Link, usePage } from '@inertiajs/react';
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
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Inventory as InventoryIcon,
    ShoppingCart as POSIcon,
    People as CustomersIcon,
    Assessment as ReportsIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
} from '@mui/icons-material';

const drawerWidth = 200; // More compact sidebar

export default function MainLayout({ children, header }) {
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);
    const { auth } = usePage().props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorElUser, setAnchorElUser] = useState(null);

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
        { text: 'Dashboard', icon: <DashboardIcon fontSize="small" />, href: route('dashboard') },
        { text: 'POS', icon: <POSIcon fontSize="small" />, href: '#' },
        { text: 'Inventory', icon: <InventoryIcon fontSize="small" />, href: '#' },
        { text: 'Customers', icon: <CustomersIcon fontSize="small" />, href: '#' },
        { text: 'Reports', icon: <ReportsIcon fontSize="small" />, href: '#' },
        { text: 'Settings', icon: <SettingsIcon fontSize="small" />, href: '#' },
    ];

    const drawer = (
        <div>
            <Toolbar sx={{ minHeight: '48px !important' }}>
                <Typography variant="subtitle1" noWrap component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Pharmacy POS
                </Typography>
            </Toolbar>
            <Divider />
            <List dense>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={Link}
                            href={item.href}
                            selected={route().current(item.href.split('/').pop())}
                            sx={{ py: 0.5 }}
                        >
                            <ListItemIcon sx={{ 
                                minWidth: 40,
                                color: route().current(item.href.split('/').pop()) ? 'primary.main' : 'inherit' 
                            }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText 
                                primary={item.text} 
                                primaryTypographyProps={{ variant: 'body2' }} 
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
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
                                    alt={auth.user.name} 
                                    src={auth.user.image_path} 
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
                                <Typography textAlign="center">Profile</Typography>
                            </MenuItem>
                            <MenuItem component={Link} href={route('logout')} method="post" as="button" onClick={handleCloseUserMenu} style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                <Typography textAlign="center">Logout</Typography>
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
        </Box>
    );
}
