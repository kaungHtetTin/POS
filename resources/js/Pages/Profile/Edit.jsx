import MainLayout from '@/Layouts/MainLayout';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { Head } from '@inertiajs/react';
import { Paper, Box, Grid, Stack } from '@mui/material';

export default function Edit({ auth, mustVerifyEmail, status }) {
    return (
        <MainLayout
            auth={auth}
            header="Profile Settings"
        >
            <Head title="Profile" />

            <Box sx={{ flexGrow: 1 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 2 }}>
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                            />
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Stack spacing={2}>
                            <Paper sx={{ p: 2 }}>
                                <UpdatePasswordForm />
                            </Paper>

                            <Paper sx={{ p: 2, borderColor: 'error.light' }}>
                                <DeleteUserForm />
                            </Paper>
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
        </MainLayout>
    );
}
