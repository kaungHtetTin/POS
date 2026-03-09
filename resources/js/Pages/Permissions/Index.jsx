import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import {
    Box,
    Paper,
    Typography,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Stack,
    Alert
} from '@mui/material';
import {
    VerifiedUser as VerifiedUserIcon
} from '@mui/icons-material';

export default function PermissionsIndex(props) {
    const permissions = [
        { id: 1, name: 'Process Sale', slug: 'process_sale', category: 'Sales' },
        { id: 2, name: 'Cancel Transaction', slug: 'cancel_transaction', category: 'Sales' },
        { id: 3, name: 'Add Products', slug: 'add_products', category: 'Products' },
        { id: 4, name: 'Edit Products', slug: 'edit_products', category: 'Products' },
        { id: 5, name: 'Manage Inventory', slug: 'manage_inventory', category: 'Inventory' },
        { id: 6, name: 'Adjust Stock', slug: 'adjust_stock', category: 'Inventory' },
        { id: 7, name: 'View Financial Reports', slug: 'view_financial_reports', category: 'Management' },
        { id: 8, name: 'Manage Branches', slug: 'manage_branches', category: 'Management' },
        { id: 9, name: 'Manage Users', slug: 'manage_users', category: 'Management' },
        { id: 10, name: 'Monitor Activity', slug: 'monitor_activity', category: 'Management' },
    ];

    return (
        <MainLayout
            auth={props.auth}
            header="Permission Reference"
        >
            <Head title="Permissions" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            SYSTEM PERMISSIONS (READ-ONLY)
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Permission Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Slug</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {permissions.map((permission) => (
                                    <TableRow key={permission.id} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <VerifiedUserIcon fontSize="small" color="primary" />
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{permission.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={permission.slug} 
                                                size="small" 
                                                variant="outlined" 
                                                sx={{ 
                                                    fontFamily: 'monospace', 
                                                    fontSize: '10px', 
                                                    height: '20px', 
                                                    bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' 
                                                }} 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={permission.category} 
                                                size="small" 
                                                color="info" 
                                                variant="outlined" 
                                                sx={{ fontSize: '10px', height: '20px' }} 
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ mt: 2 }}>
                        <Alert severity="info" size="small">
                            System permissions are core business rules and cannot be modified or deleted via the UI. 
                            These are used to define the dynamic access control for each role.
                        </Alert>
                    </Box>
                </Paper>
            </Box>
        </MainLayout>
    );
}
