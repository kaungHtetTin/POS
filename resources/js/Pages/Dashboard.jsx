import React from 'react';
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Stack,
    Divider,
    Alert,
    IconButton,
    Tooltip
} from '@mui/material';
import { 
    Inventory as StockIcon, 
    Warning as ExpiryIcon, 
    ShoppingCart as POSIcon,
    Medication as ProductIcon,
    People as SupplierIcon,
    AttachMoney as MoneyIcon,
    ErrorOutline as LowStockIcon,
    NotificationImportant as ExpiryAlertIcon,
    ArrowForward as ViewIcon
} from '@mui/icons-material';
import { Link } from '@inertiajs/react';

export default function Dashboard({ auth, stats, lowStockAlerts, expiryAlerts }) {
    
    const statCards = [
        { 
            title: "Total Products", 
            value: stats.total_products, 
            icon: <ProductIcon color="primary" fontSize="small" />, 
            color: '#e3f2fd',
            link: route('products.index')
        },
        { 
            title: "Total Suppliers", 
            value: stats.total_suppliers, 
            icon: <SupplierIcon color="info" fontSize="small" />, 
            color: '#e0f2f1',
            link: route('suppliers.index')
        },
        { 
            title: "Stock Value", 
            value: `$${Number(stats.total_stock_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
            icon: <MoneyIcon color="success" fontSize="small" />, 
            color: '#e8f5e9',
            link: '#'
        },
        { 
            title: "Pending Payments", 
            value: stats.pending_purchases, 
            icon: <POSIcon color="warning" fontSize="small" />, 
            color: '#fff3e0',
            link: route('purchases.index')
        },
    ];

    return (
        <MainLayout auth={auth} header="Pharmacy Dashboard">
            <Head title="Dashboard" />

            <Box sx={{ flexGrow: 1 }}>
                {/* Statistics Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {statCards.map((stat, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                                    <Box sx={{ 
                                        p: 1.5, 
                                        borderRadius: 2, 
                                        bgcolor: stat.color, 
                                        mr: 2,
                                        display: 'flex'
                                    }}>
                                        {stat.icon}
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 500 }}>
                                            {stat.title}
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                            {stat.value}
                                        </Typography>
                                    </Box>
                                    {stat.link !== '#' && (
                                        <IconButton component={Link} href={stat.link} size="small">
                                            <ViewIcon fontSize="inherit" />
                                        </IconButton>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Grid container spacing={2}>
                    {/* Low Stock Alerts */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, height: '100%', borderTop: '3px solid', borderColor: 'warning.main' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LowStockIcon color="warning" fontSize="small" />
                                    LOW STOCK ALERTS
                                </Typography>
                                <Chip label={`${lowStockAlerts.length} Items`} size="small" color="warning" variant="outlined" />
                            </Stack>
                            <Divider sx={{ mb: 2 }} />
                            
                            {lowStockAlerts.length > 0 ? (
                                <TableContainer sx={{ maxHeight: 350 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Medicine</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }} align="right">Current</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }} align="right">Min Level</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }} align="center">Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {lowStockAlerts.map((item) => (
                                                <TableRow key={item.id} hover>
                                                    <TableCell variant="body2">{item.name}</TableCell>
                                                    <TableCell align="right" sx={{ color: item.current_quantity === 0 ? 'error.main' : 'warning.main', fontWeight: 'bold' }}>
                                                        {item.current_quantity}
                                                    </TableCell>
                                                    <TableCell align="right">{item.min_level}</TableCell>
                                                    <TableCell align="center">
                                                        <Chip 
                                                            label={item.current_quantity === 0 ? 'Out of Stock' : 'Low Stock'} 
                                                            size="small" 
                                                            color={item.current_quantity === 0 ? 'error' : 'warning'}
                                                            sx={{ fontSize: '10px', height: '20px' }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">All products are within healthy stock levels.</Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>

                    {/* Expiry Alerts */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, height: '100%', borderTop: '3px solid', borderColor: 'error.main' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ExpiryAlertIcon color="error" fontSize="small" />
                                    NEAR EXPIRY ALERTS
                                </Typography>
                                <Chip label={`${expiryAlerts.length} Batches`} size="small" color="error" variant="outlined" />
                            </Stack>
                            <Divider sx={{ mb: 2 }} />

                            {expiryAlerts.length > 0 ? (
                                <TableContainer sx={{ maxHeight: 350 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Batch #</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Medicine</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }} align="right">Expiry</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }} align="center">Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {expiryAlerts.map((batch) => (
                                                <TableRow key={batch.id} hover>
                                                    <TableCell variant="body2" sx={{ fontWeight: 500 }}>{batch.batch_number}</TableCell>
                                                    <TableCell variant="body2">{batch.product_name}</TableCell>
                                                    <TableCell align="right" sx={{ color: batch.days_left <= 0 ? 'error.main' : 'warning.main', fontWeight: 'bold' }}>
                                                        {batch.expiry_date}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Tooltip title={`${batch.days_left} days remaining`}>
                                                            <Chip 
                                                                label={batch.days_left <= 0 ? 'Expired' : `${batch.days_left}d left`} 
                                                                size="small" 
                                                                color={batch.days_left <= 0 ? 'error' : (batch.days_left <= 30 ? 'error' : 'warning')}
                                                                sx={{ fontSize: '10px', height: '20px' }}
                                                            />
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">No batches are near expiry.</Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>

                {/* Quick Actions */}
                <Paper sx={{ mt: 3, p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        QUICK ACTIONS
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack direction="row" spacing={2}>
                        <Button 
                            variant="outlined" 
                            startIcon={<POSIcon />} 
                            component={Link} 
                            href="#"
                            size="small"
                        >
                            New Sale
                        </Button>
                        <Button 
                            variant="outlined" 
                            startIcon={<StockIcon />} 
                            component={Link} 
                            href={route('purchases.index')}
                            size="small"
                        >
                            Purchase Stock
                        </Button>
                        <Button 
                            variant="outlined" 
                            startIcon={<ExpiryIcon />} 
                            component={Link} 
                            href={route('inventory.adjustments.index')}
                            size="small"
                        >
                            Adjust Inventory
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </MainLayout>
    );
}
