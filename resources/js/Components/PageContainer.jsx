import React from 'react';
import { Box } from '@mui/material';

export const pageContainerSx = {
    width: '100%',
    maxWidth: 1560,
    mx: 'auto',
    p: { xs: 1, md: 1.75 },
    boxSizing: 'border-box',
};

export default function PageContainer({ children, normalizeLegacyPadding = false, sx = {}, ...props }) {
    return (
        <Box
            data-page-container
            {...props}
            sx={{
                ...pageContainerSx,
                ...(normalizeLegacyPadding ? {
                    '&& > .MuiBox-root': {
                        p: '0 !important',
                    },
                } : {}),
                ...sx,
            }}
        >
            {children}
        </Box>
    );
}
