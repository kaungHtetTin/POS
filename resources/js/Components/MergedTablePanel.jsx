import React from 'react';
import {
    Box,
    Divider,
    Paper,
    Stack,
    Typography,
} from '@mui/material';

export default function MergedTablePanel({
    eyebrow,
    title,
    icon = null,
    meta = null,
    actions = null,
    filters = null,
    children,
    sx = {},
    contentSx = {},
    hideHeader = true,
}) {
    const filtersInAppBar = React.isValidElement(filters) && Boolean(filters.props.appBar);

    return (
        <Paper
            elevation={0}
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: '6px',
                overflow: 'hidden',
                ...sx,
            }}
        >
            {!hideHeader && <Box sx={{ minHeight: 38, px: 1.25, py: 1, display: 'flex', alignItems: 'center' }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'flex-start' }}
                    spacing={1.5}
                >
                    <Box sx={{ minWidth: 0 }}>
                        {eyebrow && (
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    color: 'primary.main',
                                    fontWeight: 800,
                                    fontSize: 9,
                                    letterSpacing: '0.07em',
                                    textTransform: 'uppercase',
                                    mb: 0.35,
                                }}
                            >
                                {eyebrow}
                            </Typography>
                        )}
                        <Stack direction="row" spacing={1} alignItems="center">
                            {icon}
                            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
                                {title}
                            </Typography>
                        </Stack>
                    </Box>

                    {(meta || actions) && (
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            justifyContent="flex-end"
                        >
                            {meta}
                            {actions}
                        </Stack>
                    )}
                </Stack>
            </Box>}

            {filtersInAppBar && filters}

            {filters && !filtersInAppBar && (
                <Box sx={{ px: 1.25, pb: 1.25 }}>
                    {filters}
                </Box>
            )}

            {!hideHeader && <Divider />}

            <Box sx={{ p: 0, ...contentSx }}>
                {children}
            </Box>
        </Paper>
    );
}
