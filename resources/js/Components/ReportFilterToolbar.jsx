import React from 'react';
import { Badge, Box, Button, Drawer, IconButton, InputAdornment, Stack, Tooltip, Typography } from '@mui/material';
import { Close as CloseIcon, FilterAlt as FilterIcon, Search as SearchIcon } from '@mui/icons-material';
import AppBarPortal from '@/Components/AppBarPortal';

const filterGap = 1.25;

const appBarControlSx = {
    height: 30,
    minHeight: 30,
    borderRadius: '5px',
    borderColor: 'divider',
    bgcolor: 'background.paper',
};

const compactActionSx = {
    minWidth: 30,
    width: 30,
    maxWidth: 30,
    height: 30,
    minHeight: 30,
    px: 0,
    fontSize: 0,
    borderRadius: '5px',
    '& .MuiButton-startIcon, & .MuiButton-endIcon': { m: 0 },
    '& .MuiSvgIcon-root': { width: 15, height: 15, fontSize: 15 },
};

const fieldWidths = {
    search: { flex: '1 0 220px', minWidth: '220px' },
    select: { flex: '0 0 150px', minWidth: '150px' },
    date: { flex: '0 0 142px', minWidth: '142px' },
    amount: { flex: '0 0 190px', minWidth: '190px' },
    wide: { flex: '0 0 220px', minWidth: '220px' },
};

const flattenActionNodes = (nodes) => React.Children.toArray(nodes).flatMap((node) => (
    React.isValidElement(node) && node.type === React.Fragment
        ? flattenActionNodes(node.props.children)
        : [node]
));

const actionLabel = (node) => {
    const value = node?.props?.children;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return node?.props?.label || node?.props?.['aria-label'] || '';
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
    appBar = false,
}) {
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const [searchExpanded, setSearchExpanded] = React.useState(false);
    const searchWrapRef = React.useRef(null);
    const handleSubmit = (event) => {
        event?.preventDefault?.();
        onSubmit?.(event);
    };

    const fields = React.Children.toArray(children);
    const searchIndex = fieldKinds.findIndex((kind) => kind === 'search');
    const searchField = searchIndex >= 0 ? fields[searchIndex] : null;
    const secondaryFields = fields.filter((field, index) => index !== searchIndex);
    const secondaryKinds = fieldKinds.filter((kind, index) => index !== searchIndex);
    const activeFilterCount = secondaryFields.reduce((count, field) => {
        const value = field?.props?.value;
        return count + (value !== undefined && value !== null && value !== '' && value !== false ? 1 : 0);
    }, 0);
    const actionNodes = flattenActionNodes(actions);
    const submitActions = actionNodes.filter((action) => action?.props?.type === 'submit');
    const resetActions = secondaryFields.length > 0
        ? actionNodes.filter((action) => /^(clear|reset)$/i.test(actionLabel(action).trim()))
        : [];
    const toolbarActions = actionNodes.filter((action) => !submitActions.includes(action) && !resetActions.includes(action));
    const primaryActions = toolbarActions.filter((action) => action?.props?.variant === 'contained');
    const secondaryActions = toolbarActions.filter((action) => action?.props?.variant !== 'contained');

    React.useEffect(() => {
        if (!searchExpanded) return;
        const frame = window.requestAnimationFrame(() => searchWrapRef.current?.querySelector('input')?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [searchExpanded]);

    const decorateAction = (action, index) => {
        if (!React.isValidElement(action)) return action;
        const label = actionLabel(action);
        return React.cloneElement(action, {
            key: action.key || `${label || 'action'}-${index}`,
            ...(searchExpanded && label ? { title: label, 'aria-label': label } : {}),
        });
    };

    if (appBar) {
        return (
            <>
                <AppBarPortal>
                    <Box
                        component={onSubmit ? 'form' : 'div'}
                        aria-label={ariaLabel}
                        onSubmit={onSubmit ? handleSubmit : undefined}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, width: '100%' }}
                    >
                        {searchField && !searchExpanded && (
                            <Tooltip title="Search">
                                <IconButton
                                    type="button"
                                    size="small"
                                    className="mkpos-bare-action"
                                    aria-label="Expand search"
                                    onClick={() => setSearchExpanded(true)}
                                    sx={{
                                        bgcolor: 'transparent',
                                        '& .MuiSvgIcon-root': { width: 15, height: 15 },
                                    }}
                                >
                                    <SearchIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {searchField && searchExpanded && (
                            <Box ref={searchWrapRef} sx={{ width: { xs: 210, sm: 320, lg: 420 }, minWidth: { xs: 180, sm: 280 }, flexShrink: 1 }}>
                                {React.cloneElement(searchField, {
                                    fullWidth: true,
                                    size: 'small',
                                    label: undefined,
                                    placeholder: searchField.props.placeholder || searchField.props.label || 'Search',
                                    onKeyDown: (event) => {
                                        searchField.props.onKeyDown?.(event);
                                        if (event.key === 'Escape') setSearchExpanded(false);
                                    },
                                    onBlur: (event) => {
                                        searchField.props.onBlur?.(event);
                                        window.setTimeout(() => {
                                            if (!searchWrapRef.current?.contains(document.activeElement)) setSearchExpanded(false);
                                        }, 0);
                                    },
                                    inputProps: {
                                        'aria-label': searchField.props.label || searchField.props.placeholder || 'Search',
                                        ...(searchField.props.inputProps || {}),
                                    },
                                    InputProps: {
                                        ...(searchField.props.InputProps || {}),
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: searchField.props.InputProps?.endAdornment,
                                    },
                                    sx: {
                                        ...(searchField.props.sx || {}),
                                        '& .MuiOutlinedInput-root': {
                                            ...appBarControlSx,
                                            fontSize: 12,
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1 },
                                        },
                                        '& .MuiInputBase-input': { py: 0.5 },
                                    },
                                })}
                            </Box>
                        )}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                ml: 'auto',
                                '& .MuiButton-root': searchExpanded ? compactActionSx : undefined,
                            }}
                        >
                            {primaryActions.map(decorateAction)}
                        </Box>
                        {secondaryFields.length > 0 && (
                            <Badge
                                badgeContent={activeFilterCount}
                                color="primary"
                                invisible={activeFilterCount === 0}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                sx={{
                                    flexShrink: 0,
                                    overflow: 'visible',
                                    '& .MuiBadge-badge': {
                                        top: 2,
                                        right: 2,
                                        transform: 'none',
                                        minWidth: 16,
                                        height: 16,
                                        px: 0.4,
                                        fontSize: 9,
                                        fontWeight: 800,
                                        lineHeight: 1,
                                        border: '1px solid',
                                        borderColor: 'background.paper',
                                        boxSizing: 'border-box',
                                        zIndex: 1,
                                    },
                                }}
                            >
                                {searchExpanded ? (
                                    <Tooltip title="Filters">
                                        <IconButton type="button" aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : 'Filters'} onClick={() => setDrawerOpen(true)}>
                                            <FilterIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                ) : (
                                    <Button type="button" variant="outlined" startIcon={<FilterIcon />} onClick={() => setDrawerOpen(true)} aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : 'Filters'}>Filters</Button>
                                )}
                            </Badge>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, '& .MuiButton-root': searchExpanded ? compactActionSx : undefined }}>
                            {secondaryActions.map(decorateAction)}
                        </Box>
                    </Box>
                </AppBarPortal>
                <Drawer
                    anchor="right"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    PaperProps={{ sx: { width: { xs: 'min(100vw, 360px)', sm: 360 }, p: 0, borderRadius: 0 } }}
                >
                    <Stack
                        component={onSubmit ? 'form' : 'div'}
                        onSubmit={onSubmit ? (event) => { handleSubmit(event); setDrawerOpen(false); } : undefined}
                        sx={{ height: '100%' }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 48, px: 1.5, py: 1.125, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontSize: 16, fontWeight: 650 }}>Filters</Typography>
                                <Typography variant="caption" color="text.secondary">Search &amp; filter</Typography>
                            </Box>
                            <IconButton aria-label="Close filters" onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
                        </Stack>
                        <Stack spacing={1.25} sx={{ p: 1.5, overflowY: 'auto', flex: 1 }}>
                            {secondaryFields.map((field, index) => (
                                <ReportFilterField key={field.key || index} kind={secondaryKinds[index] || 'select'} sx={{ width: '100%', minWidth: 0, flex: '0 0 auto' }}>
                                    {field}
                                </ReportFilterField>
                            ))}
                        </Stack>
                        <Stack direction="row" justifyContent="flex-end" spacing={1.25} sx={{ minHeight: 52, px: 1.5, py: 1.125, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
                                {resetActions.map((action, index) => React.isValidElement(action) ? React.cloneElement(action, { key: action.key || `reset-${index}` }) : action)}
                            </Box>
                            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
                            <Button
                                type={onSubmit ? 'submit' : 'button'}
                                variant="contained"
                                onClick={onSubmit ? undefined : () => setDrawerOpen(false)}
                            >
                                {onSubmit ? 'Apply filters' : 'Done'}
                            </Button>
                        </Stack>
                    </Stack>
                </Drawer>
            </>
        );
    }

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
