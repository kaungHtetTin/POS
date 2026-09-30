import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import CsvExportButton from '@/Components/CsvExportButton';
import { AppBarActions } from '@/Components/AppBarPortal';
import { Head } from '@/spa';
import {
    Box,
    Paper,
    Typography,
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

export default function PermissionsIndex({ auth, permissions = [] }) {
    return (
        <MainLayout
            auth={auth}
            header="Permission Reference"
        >
            <Head title="Permissions" />

            <Box sx={{ flexGrow: 1 }}>
                <Paper sx={{ p: 2 }}>
                    <AppBarActions><CsvExportButton source={permissions} filename="permissions.csv" /></AppBarActions>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255, 255, 255, 0.05)' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Permission Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Slug</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Purpose</TableCell>
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
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">{permission.description}</Typography>
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
