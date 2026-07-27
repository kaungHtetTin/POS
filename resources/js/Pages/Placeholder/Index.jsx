import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import {
    Box,
    Button,
    Chip,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import {
    Construction as ConstructionIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

export default function PlaceholderPage({ auth, title, section, description }) {
    return (
        <MainLayout auth={auth} header={title}>
            <Head title={title} />

            <Box sx={{ p: { xs: 1, md: 1.25 } }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, md: 3 },
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        maxWidth: 780,
                    }}
                >
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 1.5,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                }}
                            >
                                <ConstructionIcon fontSize="small" />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Chip label={section} size="small" color="primary" variant="outlined" sx={{ mb: 0.75 }} />
                                <Typography variant="h5" fontWeight={800}>
                                    {title}
                                </Typography>
                            </Box>
                        </Stack>

                        <Typography color="text.secondary" sx={{ maxWidth: 620 }}>
                            {description || 'This module has a reserved navigation entry and is ready for implementation.'}
                        </Typography>

                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<ArrowBackIcon />}
                                onClick={() => window.history.back()}
                            >
                                Back
                            </Button>
                        </Box>
                    </Stack>
                </Paper>
            </Box>
        </MainLayout>
    );
}
