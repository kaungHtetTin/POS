import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import PersistentShellContext from '@/contexts/PersistentShellContext';
import { Box, IconButton, Tooltip } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Link } from '@/spa';

export default function AppBarPortal({ children }) {
    const shell = useContext(PersistentShellContext);
    return shell?.appBarTarget ? createPortal(children, shell.appBarTarget) : null;
}

export function AppBarActions({ children }) {
    return (
        <AppBarPortal>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                ml: 'auto',
            }}>
                {children}
            </Box>
        </AppBarPortal>
    );
}

export function AppBarBack({ href, label = 'Back', onClick }) {
    const shell = useContext(PersistentShellContext);
    if (!shell?.appBarBackTarget) return null;

    return createPortal(
        <Tooltip title={label}>
            <IconButton
                component={href ? Link : 'button'}
                href={href}
                onClick={onClick}
                aria-label={label}
            >
                <ArrowBackIcon />
            </IconButton>
        </Tooltip>,
        shell.appBarBackTarget
    );
}
