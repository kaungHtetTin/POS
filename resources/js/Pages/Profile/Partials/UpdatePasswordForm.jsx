import { useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import { 
    TextField, 
    Button, 
    Typography, 
    Box, 
    Stack,
    CircularProgress,
    Divider
} from '@mui/material';

export default function UpdatePasswordForm() {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: () => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    return (
        <Box component="section">
            <header>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                    UPDATE PASSWORD
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Ensure your account is using a long, random password to stay secure.
                </Typography>
            </header>

            <form onSubmit={updatePassword}>
                <Stack spacing={3}>
                    <TextField
                        label="Current Password"
                        type="password"
                        fullWidth
                        size="small"
                        inputRef={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        error={!!errors.current_password}
                        helperText={errors.current_password}
                        autoComplete="current-password"
                    />

                    <TextField
                        label="New Password"
                        type="password"
                        fullWidth
                        size="small"
                        inputRef={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        error={!!errors.password}
                        helperText={errors.password}
                        autoComplete="new-password"
                    />

                    <TextField
                        label="Confirm Password"
                        type="password"
                        fullWidth
                        size="small"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        error={!!errors.password_confirmation}
                        helperText={errors.password_confirmation}
                        autoComplete="new-password"
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button 
                            variant="contained" 
                            type="submit" 
                            disabled={processing}
                            size="small"
                        >
                            {processing ? <CircularProgress size={20} color="inherit" /> : 'Save Password'}
                        </Button>

                        <Transition
                            show={recentlySuccessful}
                            enterFrom="opacity-0"
                            leaveTo="opacity-0"
                            className="transition ease-in-out"
                        >
                            <Typography variant="body2" color="success.main">
                                Password updated.
                            </Typography>
                        </Transition>
                    </Box>
                </Stack>
            </form>
        </Box>
    );
}
