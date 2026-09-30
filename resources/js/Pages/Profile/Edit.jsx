import MainLayout from '@/Layouts/MainLayout';
import { AppBarBack } from '@/Components/AppBarPortal';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { Head } from '@/spa';
import { Paper, Box, Grid, Stack } from '@mui/material';

export default function Edit({ auth, mustVerifyEmail, status }) {
    return (
        <MainLayout
            auth={auth}
            header="Profile Settings"
        >
            <Head title="Profile" />
            <AppBarBack href={route('dashboard')} label="Back to Dashboard" />

            <Box sx={{ flexGrow: 1 }}>
                <Grid container spacing={1.5}>
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 2 }}>
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                            />
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Stack spacing={1.5}>
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
