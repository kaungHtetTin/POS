import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { AppBarBack } from '@/Components/AppBarPortal';
import { Head } from '@/spa';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { GppBad as GppBadIcon } from '@mui/icons-material';

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
            <AppBarBack href={route('dashboard')} label="Back to Dashboard" />
            
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '40vh',
                    textAlign: 'center',
                    px: 3
                }}
            >
                <Paper
                    variant="outlined"
                    sx={{
                        p: 3,
                        maxWidth: 500,
                        borderRadius: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1.5,
                        borderColor: 'divider',
                        boxShadow: 'none'
                    }}
                >
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'error.main',
                            mb: 1
                        }}
                    >
                        <GppBadIcon sx={{ fontSize: 28 }} />
                    </Box>

                    <Box>
                        <Typography variant="h5" fontWeight={800} gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {description}
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </MainLayout>
    );
}
