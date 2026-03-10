import { useEffect } from 'react';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Box, Typography, TextField, Button, Checkbox as MuiCheckbox, FormControlLabel, Alert, Stack, useTheme } from '@mui/material';

export default function Login({ status, canResetPassword }) {
    const theme = useTheme();
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const handleOnChange = (event) => {
        setData(event.target.name, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
    };

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onSuccess: () => {
                router.visit(route('dashboard'), { replace: true });
            },
        });
    };

    return (
        <AuthSplitLayout
            title="Log in to your account"
            subtitle="Enter your email and password to continue"
            topBarContent={
                <Typography variant="body2" color="text.secondary">
                    No account?{' '}
                    <Link 
                        href={route('register')} 
                        style={{ 
                            color: theme.palette.primary.main, 
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}
                    >
                        Sign up
                    </Link>
                </Typography>
            }
        >
            <Head title="Log in" />

            {status && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {status}
                </Alert>
            )}

            <form onSubmit={submit}>
                <Stack spacing={2.5}>
                    <TextField
                        id="email"
                        type="email"
                        name="email"
                        label="Email"
                        placeholder="Enter your email"
                        value={data.email}
                        onChange={handleOnChange}
                        autoComplete="username"
                        autoFocus
                        error={Boolean(errors.email)}
                        helperText={errors.email}
                        fullWidth
                        size="small"
                    />

                    <TextField
                        id="password"
                        type="password"
                        name="password"
                        label="Password"
                        placeholder="Enter your password"
                        value={data.password}
                        onChange={handleOnChange}
                        autoComplete="current-password"
                        error={Boolean(errors.password)}
                        helperText={errors.password}
                        fullWidth
                        size="small"
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <FormControlLabel
                            control={
                                <MuiCheckbox
                                    name="remember"
                                    checked={Boolean(data.remember)}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    size="small"
                                />
                            }
                            label={<Typography variant="body2">Remember me</Typography>}
                        />
                    </Box>

                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                style={{ 
                                    fontSize: '0.875rem',
                                    color: theme.palette.text.secondary,
                                    textDecoration: 'none'
                                }}
                            >
                                Forgot your password?
                            </Link>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={processing}
                            size="small"
                            sx={{ px: 4 }}
                        >
                            Log in
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </AuthSplitLayout>
    );
}
