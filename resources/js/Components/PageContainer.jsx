import React from 'react';
import { Box } from '@mui/material';

export const pageContainerSx = {
    width: '100%',
    maxWidth: 'none',
    mx: 'auto',
    p: { xs: 1, md: '14px' },
    boxSizing: 'border-box',
};

// Legacy pages often wrap their entire workspace in a Paper. The shell already
// provides the page surface and spacing, so flatten only structural wrappers.
// Tables and nested information/stat cards keep their own borders.
const flatPageSurfaceSx = {
    p: '0 !important',
    m: '0 !important',
    bgcolor: 'transparent !important',
    backgroundImage: 'none !important',
    border: '0 !important',
    borderRadius: '0 !important',
    boxShadow: 'none !important',
    overflow: 'visible !important',
};

export default function PageContainer({ children, normalizeLegacyPadding = false, sx = {}, ...props }) {
    return (
        <Box
            data-page-container
            {...props}
            sx={{
                ...pageContainerSx,
                // The common page shapes are PageContainer > Box > Paper and
                // PageContainer > Stack > Paper. A sole Paper is the old page
                // container, while a Paper directly wrapping a table is a
                // redundant second frame around the table component.
                '&& > .MuiPaper-root': flatPageSurfaceSx,
                '&& > .MuiBox-root > .MuiPaper-root:only-child': flatPageSurfaceSx,
                '&& > .MuiStack-root > .MuiPaper-root:only-child': flatPageSurfaceSx,
                '&& > .MuiBox-root > .MuiPaper-root:has(> .MuiTableContainer-root)': flatPageSurfaceSx,
                '&& > .MuiStack-root > .MuiPaper-root:has(> .MuiTableContainer-root)': flatPageSurfaceSx,
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
