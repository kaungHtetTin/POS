import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import {
    Box,
    Paper,
    Typography,
    Divider,
    Stack,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemSecondaryAction,
    IconButton,
    Alert,
    Tab,
    Tabs,
    Drawer,
    useMediaQuery,
    useTheme,
    Grid
} from '@mui/material';
import {
    Store as BranchIcon,
    Security as SecurityIcon,
    Notifications as NotificationsIcon,
    Save as SaveIcon,
    Language as LanguageIcon,
    Backup as BackupIcon,
    MenuOpen as MenuOpenIcon
} from '@mui/icons-material';

export default function Settings(props) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [tabValue, setTabValue] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        if (isMobile) {
            setDrawerOpen(false);
        }
    };

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    const settingsTabs = (
        <Tabs
            orientation="vertical"
            value={tabValue}
            onChange={handleTabChange}
            sx={{
                borderRight: isMobile ? 0 : 1,
                borderColor: 'divider',
                width: '100%',
                '& .MuiTab-root': {
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    textTransform: 'none',
                    fontSize: '0.8125rem',
                    minHeight: 48,
                    py: 1,
                    px: 2,
                    flexDirection: 'row',
                    gap: 1
                },
                '& .MuiTab-iconWrapper': {
                    margin: '0 !important',
                }
            }}
        >
            <Tab icon={<BranchIcon fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="General & Branch" />
            <Tab icon={<SecurityIcon fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Security & Access" />
            <Tab icon={<NotificationsIcon fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Notifications" />
            <Tab icon={<BackupIcon fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Backup & Sync" />
            <Tab icon={<LanguageIcon fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Localization" />
        </Tabs>
    );

    return (
        <MainLayout
            auth={props.auth}
            header={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isMobile && (
                        <IconButton size="small" onClick={toggleDrawer} sx={{ mr: 1 }}>
                            <MenuOpenIcon />
                        </IconButton>
                    )}
                    System Settings
                </Box>
            }
        >
            <Head title="Settings" />

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }}>
                {/* Desktop Sidebar Navigation */}
                {!isMobile && (
                    <Paper sx={{ width: 240, flexShrink: 0, p: 0 }}>
                        {settingsTabs}
                    </Paper>
                )}

                {/* Mobile Drawer Navigation */}
                <Drawer
                    anchor="left"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    sx={{ display: { xs: 'block', md: 'none' } }}
                >
                    <Box sx={{ p: 2, width: 280 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, px: 2 }}>
                            SETTINGS MENU
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        {settingsTabs}
                    </Box>
                </Drawer>

                {/* Right Content Area */}
                <Box sx={{ flexGrow: 1, width: '100%' }}>
                    <Stack spacing={2}>
                        {/* Tab Panel 0: General Settings */}
                        {tabValue === 0 && (
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    GENERAL BRANCH SETTINGS
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                
                                <Stack spacing={2.5}>
                                    <Alert severity="info" size="small">
                                        These settings apply specifically to your current branch.
                                    </Alert>
                                    
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField label="Pharmacy Name" fullWidth size="small" defaultValue="Main Branch Pharmacy" />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField label="Tax Identification Number (TIN)" fullWidth size="small" defaultValue="123-456-789" />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField label="Branch Address" fullWidth multiline rows={2} size="small" defaultValue="123 Medical Center, Health St." />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField label="Contact Phone" fullWidth size="small" defaultValue="+1234567890" />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField label="Email for Invoices" fullWidth size="small" defaultValue="billing@pharmacy.com" />
                                        </Grid>
                                    </Grid>

                                    <Box sx={{ pt: 1 }}>
                                        <Button variant="contained" size="small" startIcon={<SaveIcon />}>
                                            Update General Settings
                                        </Button>
                                    </Box>
                                </Stack>
                            </Paper>
                        )}

                        {/* Tab Panel 1: Security Settings */}
                        {tabValue === 1 && (
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    SECURITY & ACCESS CONTROL
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                
                                <List dense sx={{ p: 0 }}>
                                    <ListItem sx={{ px: 0 }}>
                                        <ListItemText 
                                            primary="Two-Factor Authentication" 
                                            secondary="Require a code in addition to your password to sign in."
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                        />
                                        <ListItemSecondaryAction>
                                            <Switch size="small" edge="end" />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <Divider />
                                    <ListItem sx={{ px: 0 }}>
                                        <ListItemText 
                                            primary="Session Timeout" 
                                            secondary="Automatically log out after 30 minutes of inactivity."
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                        />
                                        <ListItemSecondaryAction>
                                        <Switch size="small" edge="end" defaultChecked />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <Divider />
                                    <ListItem sx={{ px: 0 }}>
                                        <ListItemText 
                                            primary="IP Whitelisting" 
                                            secondary="Restrict access to specific office IP addresses."
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                        />
                                        <ListItemSecondaryAction>
                                            <Button size="small" variant="text">Configure</Button>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                </List>
                            </Paper>
                        )}

                        {/* Features Preview (Showcase-like) */}
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                                POS BEHAVIOR
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={<Switch size="small" defaultChecked />}
                                        label={<Typography variant="body2">Automatic Barcode Focus</Typography>}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={<Switch size="small" />}
                                        label={<Typography variant="body2">Print Receipt Automatically</Typography>}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={<Switch size="small" defaultChecked />}
                                        label={<Typography variant="body2">Sound Alerts for Low Stock</Typography>}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={<Switch size="small" />}
                                        label={<Typography variant="body2">Show Generic Name First</Typography>}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Stack>
                </Box>
            </Box>
        </MainLayout>
    );
}
