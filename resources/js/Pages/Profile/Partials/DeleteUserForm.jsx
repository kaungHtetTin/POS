import { useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { 
    Button, 
    Typography, 
    Box, 
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    CircularProgress,
    Divider
} from '@mui/material';

export default function DeleteUserForm() {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        reset();
    };

    return (
        <Box component="section">
            <header>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }} color="error">
                    DELETE ACCOUNT
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Once your account is deleted, all of its resources and data will be permanently deleted.
                </Typography>
            </header>

            <Button 
                variant="outlined" 
                color="error" 
                onClick={confirmUserDeletion}
                sx={{ mt: 3 }}
                size="small"
            >
                Delete Account
            </Button>

            <Dialog open={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser}>
                    <DialogTitle>
                        Are you sure you want to delete your account?
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{ mb: 3 }}>
                            Once your account is deleted, all of its resources and data will be permanently deleted. 
                            Please enter your password to confirm you would like to permanently delete your account.
                        </DialogContentText>
                        
                        <TextField
                            label="Password"
                            type="password"
                            fullWidth
                            size="small"
                            inputRef={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={!!errors.password}
                            helperText={errors.password}
                            autoFocus
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={closeModal} variant="outlined" size="small">
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            color="error" 
                            disabled={processing}
                            size="small"
                        >
                            {processing ? <CircularProgress size={20} color="inherit" /> : 'Delete Account'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}
