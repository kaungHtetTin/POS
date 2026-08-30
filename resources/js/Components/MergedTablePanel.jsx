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
}) {
    return (
        <Paper
            elevation={0}
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                overflow: 'hidden',
                ...sx,
            }}
        >
            <Box sx={{ px: { xs: 1.5, md: 2 }, pt: { xs: 1.5, md: 2 }, pb: filters ? 1.25 : 2 }}>
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
                                    letterSpacing: '0.11em',
                                    textTransform: 'uppercase',
                                    mb: 0.35,
                                }}
                            >
                                {eyebrow}
                            </Typography>
                        )}
                        <Stack direction="row" spacing={1} alignItems="center">
                            {icon}
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
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
            </Box>

            {filters && (
                <Box sx={{ px: { xs: 1.5, md: 2 }, pb: { xs: 1.5, md: 2 } }}>
                    {filters}
                </Box>
            )}

            <Divider />

            <Box sx={{ px: { xs: 1.5, md: 2 }, py: { xs: 1.5, md: 2 }, ...contentSx }}>
                {children}
            </Box>
        </Paper>
    );
}
