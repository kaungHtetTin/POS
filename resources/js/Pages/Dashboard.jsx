import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import { 
    Grid, 
    Paper, 
    Typography, 
    Box, 
    Card, 
    CardContent, 
    Button, 
    TextField, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Stack,
    IconButton,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    Snackbar,
    Alert
} from '@mui/material';
import { 
    TrendingUp as SalesIcon, 
    Inventory as StockIcon, 
    Warning as ExpiryIcon, 
    ShoppingCart as POSIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Visibility as ViewIcon,
    CheckCircle as SuccessIcon
} from '@mui/icons-material';

export default function Dashboard(props) {
    const [open, setOpen] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const handleClickOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handleSnackbarOpen = () => setSnackbarOpen(true);
    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    const stats = [
        { title: "Today's Sales", value: "$1,250", icon: <SalesIcon color="primary" fontSize="small" />, color: '#e3f2fd' },
        { title: "Low Stock Items", value: "12", icon: <StockIcon color="warning" fontSize="small" />, color: '#fff3e0' },
        { title: "Near Expiry", value: "5", icon: <ExpiryIcon color="error" fontSize="small" />, color: '#ffebee' },
        { title: "Total Transactions", value: "48", icon: <POSIcon color="info" fontSize="small" />, color: '#e0f2f1' },
    ];

    const sampleData = [
        { id: 1, name: 'Paracetamol 500mg', category: 'Analgesics', stock: 150, price: '$5.00', status: 'Active' },
        { id: 2, name: 'Amoxicillin 250mg', category: 'Antibiotics', stock: 45, price: '$12.50', status: 'Low Stock' },
        { id: 3, name: 'Cough Syrup 100ml', category: 'Syrup', stock: 0, price: '$8.00', status: 'Out of Stock' },
    ];

    return (
        <MainLayout
            auth={props.auth}
            errors={props.errors}
            header="UI Components Showcase"
        >
            <Head title="Dashboard" />

            <Box sx={{ flexGrow: 1 }}>
                {/* 1. Statistics Cards Section */}
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                    STATISTICS CARDS (FLAT DESIGN)
                </Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    {stats.map((stat, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card>
                                <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}>
                                    <Box sx={{ 
                                        p: 1, 
                                        borderRadius: 1, 
                                        bgcolor: stat.color, 
                                        mr: 1.5,
                                        display: 'flex'
                                    }}>
                                        {stat.icon}
                                    </Box>
                                    <Box>
                                        <Typography color="text.secondary" variant="caption">
                                            {stat.title}
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                            {stat.value}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Grid container spacing={2}>
                    {/* 2. Form Components Section */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                                FORM COMPONENTS (DENSE)
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2.5} sx={{ mt: 1 }}>
                                <TextField label="Product Name" placeholder="e.g. Paracetamol" />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel id="category-label">Category</InputLabel>
                                            <Select 
                                                labelId="category-label"
                                                id="category-select"
                                                label="Category" 
                                                defaultValue=""
                                            >
                                                <MenuItem value={10}>Analgesics</MenuItem>
                                                <MenuItem value={20}>Antibiotics</MenuItem>
                                                <MenuItem value={30}>Vitamins</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField label="Price" type="number" />
                                    </Grid>
                                </Grid>
                                <TextField multiline rows={2} label="Description" />
                                
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleSnackbarOpen}>Save Product</Button>
                                    <Button variant="outlined" color="secondary">Cancel</Button>
                                    <Button variant="text" color="error">Reset</Button>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* 3. Table Components Section */}
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    DATA TABLE (COMPACT)
                                </Typography>
                                <Chip label="3 Items Found" size="small" variant="outlined" color="primary" />
                            </Box>
                            <Divider sx={{ mb: 1 }} />
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sampleData.map((row) => (
                                            <TableRow key={row.id} hover>
                                                <TableCell>{row.name}</TableCell>
                                                <TableCell>{row.stock}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={row.status} 
                                                        size="small" 
                                                        color={row.status === 'Active' ? 'success' : (row.status === 'Low Stock' ? 'warning' : 'error')}
                                                        sx={{ fontSize: '10px', height: '20px' }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" color="info" onClick={handleClickOpen}><ViewIcon fontSize="inherit" /></IconButton>
                                                    <IconButton size="small" color="primary"><EditIcon fontSize="inherit" /></IconButton>
                                                    <IconButton size="small" color="error"><DeleteIcon fontSize="inherit" /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>

                {/* 4. Typography Showcase */}
                <Paper sx={{ mt: 2, p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        TYPOGRAPHY & BRANDING
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" color="primary" gutterBottom>Primary Theme Color (Medical Teal)</Typography>
                            <Typography variant="body2" color="text.secondary">
                                This dashboard showcases the dense UI design. Notice the 4px border radius, 
                                the 13px base font size, and the compact padding across all components.
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip label="Compact Chip" size="small" />
                                <Chip label="Success" size="small" color="success" />
                                <Chip label="Warning" size="small" color="warning" />
                                <Chip label="Error" size="small" color="error" />
                                <Chip label="Info" size="small" color="info" />
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>

            {/* Showcase Dialog */}
            <Dialog 
                open={open} 
                onClose={handleClose}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    Product Details
                </DialogTitle>
                <DialogContent>
                    <DialogContentText variant="body2" sx={{ mb: 2 }}>
                        View detailed information for the selected medicine.
                    </DialogContentText>
                    <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">Name:</Typography>
                            <Typography variant="body2" fontWeight="medium">Paracetamol 500mg</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">Category:</Typography>
                            <Typography variant="body2" fontWeight="medium">Analgesics</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">Stock Level:</Typography>
                            <Typography variant="body2" fontWeight="medium">150 Units</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">Price:</Typography>
                            <Typography variant="body2" fontWeight="medium">$5.00</Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} variant="outlined" color="secondary">
                        Close
                    </Button>
                    <Button onClick={handleClose} variant="contained" color="primary">
                        Edit Item
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success Snackbar */}
            <Snackbar 
                open={snackbarOpen} 
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={handleSnackbarClose} 
                    severity="success" 
                    variant="filled"
                    icon={<SuccessIcon fontSize="inherit" />}
                    sx={{ width: '100%' }}
                >
                    Product saved successfully!
                </Alert>
            </Snackbar>
        </MainLayout>
    );
}
