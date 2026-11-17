import { useEffect } from 'react';
import AuthSplitLayout from '@/Layouts/AuthSplitLayout';
import { Head, useForm } from '@/spa';
import { Box, Typography, TextField, Button, Checkbox as MuiCheckbox, FormControlLabel, Alert, Stack } from '@mui/material';

export default function Login({ status }) {
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

        // Language is session state; authentication URLs never include a locale.
        post(route('login'));
    };

    return (
        <AuthSplitLayout
            compact
            title="Welcome back."
            subtitle="Sign in to keep your pharmacy moving."
            topBarContent={<Typography variant="body2" color="text.secondary" />}
        >
            <Head title="Log in" />

            {status && (
                <Alert severity="success" sx={{ mb: 1.5 }}>
                    {status}
                </Alert>
            )}

            <form onSubmit={submit}>
                <Stack spacing={1.5} sx={{ '& .MuiOutlinedInput-root': { minHeight: { xs: 40, sm: 34 } }, '& .MuiFormHelperText-root': { mt: 0.5, mx: 0 } }}>
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
                            sx={{ m: 0, ml: -0.5, '& .MuiCheckbox-root': { p: 0.5 }, '& .MuiTypography-root': { fontSize: 12 } }}
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
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={processing}
                            size="small"
                            sx={{ width: '100%', minHeight: { xs: 40, sm: 34 }, borderRadius: '6px' }}
                        >
                            Log in
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </AuthSplitLayout>
    );
}
