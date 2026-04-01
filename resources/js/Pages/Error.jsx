import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, Link } from '@inertiajs/react';
import { Box, Typography, Button, Paper, useTheme } from '@mui/material';
import { 
    ShieldAlert as ShieldAlertIcon, 
    Home as HomeIcon 
} from '@mui/icons-material';

export default function Error({ status, message, auth }) {
    const theme = useTheme();
    
    const title = {
        503: '503: Service Unavailable',
        500: '500: Server Error',
        404: '404: Page Not Found',
        403: '403: Forbidden',
    }[status];

    const description = {
        503: 'Sorry, we are doing some maintenance. Please check back soon.',
        500: 'Whoops, something went wrong on our servers.',
        404: 'Sorry, the page you are looking for could not be found.',
        403: message || 'You do not have the required permissions to access this page.',
    }[status];

    return (
        <MainLayout auth={auth} header={title}>
            <Head title={title} />
            
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    textAlign: 'center',
                    px: 3
                }}
            >
                <Paper
                    variant="outlined"
                    sx={{
                        p: 6,
                        maxWidth: 500,
                        borderRadius: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        borderColor: 'divider',
                        boxShadow: 'none'
                    }}
                >
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'error.main',
                            mb: 1
                        }}
                    >
                        <ShieldAlertIcon sx={{ fontSize: 48 }} />
                    </Box>

                    <Box>
                        <Typography variant="h4" fontWeight={800} gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {description}
                        </Typography>
                    </Box>

                    <Button
                        component={Link}
                        href={route('dashboard', { locale: 'en' })}
                        variant="contained"
                        startIcon={<HomeIcon />}
                        sx={{ px: 4, py: 1.2, borderRadius: 1, fontWeight: 700 }}
                    >
                        Back to Dashboard
                    </Button>
                </Paper>
            </Box>
        </MainLayout>
    );
}
