import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@/spa';
import { Box, Paper, Container } from '@mui/material';

export default function Guest({ children }) {
    return (
        <Box sx={{ 
            minHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            pt: { xs: 6, sm: 0 }, 
            bgcolor: 'background.default' 
        }}>
            <Box sx={{ mb: 4 }}>
                <Link href="/">
                    <ApplicationLogo sx={{ width: 80, height: 80, color: 'primary.main' }} />
                </Link>
            </Box>

            <Container maxWidth="sm">
                <Paper sx={{ 
                    width: '100%', 
                    p: 4, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}>
                    {children}
                </Paper>
            </Container>
        </Box>
    );
}
