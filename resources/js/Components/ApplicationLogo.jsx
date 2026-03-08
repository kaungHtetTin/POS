import { LocalPharmacy as PharmacyIcon } from '@mui/icons-material';
import { Box } from '@mui/material';

export default function ApplicationLogo({ sx, ...props }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...sx }}>
            <PharmacyIcon sx={{ fontSize: 'inherit', color: 'inherit' }} />
        </Box>
    );
}
