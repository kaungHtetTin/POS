import React from 'react';
import { Box } from '@mui/material';

const filterGap = 1.25;

const fieldWidths = {
    search: { flex: '1 0 220px', minWidth: '220px' },
    select: { flex: '0 0 150px', minWidth: '150px' },
    date: { flex: '0 0 142px', minWidth: '142px' },
    amount: { flex: '0 0 190px', minWidth: '190px' },
    wide: { flex: '0 0 220px', minWidth: '220px' },
};

export function ReportFilterField({ kind = 'select', children, sx = {} }) {
    const constrainedSx = React.isValidElement(children)
        ? {
            ...(children.props.sx || {}),
            width: '100%',
            minWidth: 0,
            maxWidth: '100%',
        }
        : undefined;
    const childProps = kind === 'search' && React.isValidElement(children)
        ? {
            fullWidth: children.props.fullWidth ?? true,
            sx: constrainedSx,
            inputProps: {
                'aria-label': children.props.label || children.props.placeholder || 'Search',
                ...(children.props.inputProps || {}),
            },
        }
        : {
            fullWidth: children?.props?.fullWidth ?? true,
            sx: constrainedSx,
        };

    return (
        <Box sx={{ ...fieldWidths[kind], ...sx }}>
            {React.isValidElement(children)
                ? React.cloneElement(children, childProps)
                : children}
        </Box>
    );
}

export default function ReportFilterToolbar({
    children,
    actions,
    onSubmit,
    ariaLabel = 'Report filters',
    fieldKinds = [],
    sx = {},
}) {
    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit?.(event);
    };

    return (
        <Box
            component={onSubmit ? 'form' : 'div'}
            aria-label={ariaLabel}
            onSubmit={onSubmit ? handleSubmit : undefined}
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) auto' },
                alignItems: 'start',
                gap: filterGap,
                minWidth: 0,
                mb: 2,
                ...sx,
            }}
        >
            <Box
                sx={{
                    minWidth: 0,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    pt: 1.25,
                    pb: 0.75,
                    scrollbarWidth: 'thin',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: filterGap,
                        width: 'max-content',
                        minWidth: '100%',
                    }}
                >
                    {React.Children.map(children, (child, index) => (
                        <ReportFilterField kind={fieldKinds[index] || 'select'}>
                            {child}
                        </ReportFilterField>
                    ))}
                </Box>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    minHeight: 40,
                    gap: filterGap,
                    pt: 1.25,
                    justifyContent: { xs: 'stretch', sm: 'flex-end', md: 'flex-start' },
                    '& .MuiButton-root': { minHeight: 34, whiteSpace: 'nowrap' },
                    '& > *': {
                        flex: { xs: 1, sm: '0 0 auto' },
                        margin: '0 !important',
                    },
                }}
            >
                {actions}
            </Box>
        </Box>
    );
}
