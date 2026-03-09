import { Link, useForm, usePage } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import { 
    TextField, 
    Button, 
    Typography, 
    Box, 
    Avatar, 
    IconButton, 
    Stack,
    Alert,
    CircularProgress,
    Divider
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';
import { useRef, useState } from 'react';

export default function UpdateProfileInformation({ mustVerifyEmail, status }) {
    const user = usePage().props.auth.user;
    const fileInputRef = useRef();
    const [imagePreview, setImagePreview] = useState(user.image_path ? `/storage/${user.image_path}` : null);

    const { data, setData, post, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        image: null,
        _method: 'PATCH', // Required for file uploads with multipart/form-data in Laravel via Inertia
    });

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        // Use post with _method: 'PATCH' for file uploads
        post(route('profile.update'), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <Box component="section">
            <header>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                    PROFILE INFORMATION
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Update your account's profile information, phone number and profile picture.
                </Typography>
            </header>

            <form onSubmit={submit}>
                <Stack spacing={3}>
                    {/* Profile Image Section */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Box sx={{ position: 'relative' }}>
                            <Avatar
                                src={imagePreview}
                                alt={user.name}
                                sx={{ width: 100, height: 100, border: '1px solid', borderColor: 'divider' }}
                            />
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                                accept="image/*"
                            />
                            <IconButton
                                color="primary"
                                aria-label="upload picture"
                                component="span"
                                onClick={() => fileInputRef.current.click()}
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    bgcolor: 'background.paper',
                                    boxShadow: 1,
                                    '&:hover': { bgcolor: 'background.default' },
                                    width: 32,
                                    height: 32,
                                }}
                                size="small"
                            >
                                <PhotoCameraIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2">Profile Picture</Typography>
                            <Typography variant="caption" color="text.secondary">
                                JPG, GIF or PNG. Max size of 2MB.
                            </Typography>
                            {errors.image && (
                                <Typography variant="caption" color="error" display="block">
                                    {errors.image}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    <TextField
                        label="Name"
                        fullWidth
                        size="small"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name}
                        required
                    />

                    <TextField
                        label="Email"
                        type="email"
                        fullWidth
                        size="small"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        error={!!errors.email}
                        helperText={errors.email}
                        required
                    />

                    <TextField
                        label="Phone Number"
                        fullWidth
                        size="small"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        error={!!errors.phone}
                        helperText={errors.phone}
                        placeholder="e.g. +1234567890"
                    />

                    {mustVerifyEmail && user.email_verified_at === null && (
                        <Box>
                            <Typography variant="body2" color="text.primary">
                                Your email address is unverified.
                                <Link
                                    href={route('verification.send')}
                                    method="post"
                                    as="button"
                                    style={{
                                        marginLeft: '8px',
                                        textDecoration: 'underline',
                                        fontSize: '0.875rem',
                                        color: 'inherit',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Click here to re-send the verification email.
                                </Link>
                            </Typography>

                            {status === 'verification-link-sent' && (
                                <Alert severity="success" sx={{ mt: 2 }} size="small">
                                    A new verification link has been sent to your email address.
                                </Alert>
                            )}
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button 
                            variant="contained" 
                            type="submit" 
                            disabled={processing}
                            size="small"
                        >
                            {processing ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
                        </Button>

                        <Transition
                            show={recentlySuccessful}
                            enterFrom="opacity-0"
                            leaveTo="opacity-0"
                            className="transition ease-in-out"
                        >
                            <Typography variant="body2" color="success.main">
                                Saved successfully.
                            </Typography>
                        </Transition>
                    </Box>
                </Stack>
            </form>
        </Box>
    );
}
