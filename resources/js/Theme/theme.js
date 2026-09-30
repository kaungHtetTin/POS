import { alpha, createTheme, darken, lighten } from '@mui/material/styles';

const statusColors = {
    success: '#168255',
    warning: '#b77700',
    error: '#ce4444',
    info: '#2874bc',
    neutral: '#7b8795',
};

export const getTheme = (mode, primaryColor = '#0E684E') => {
    const isDark = mode === 'dark';
    const tokens = {
        bg: isDark ? '#101915' : '#F6F8F7',
        surface: isDark ? '#17221D' : '#FFFFFF',
        glass: isDark ? '#17221D' : '#FFFFFF',
        border: isDark ? alpha('#DDE5E1', 0.16) : '#DDE5E1',
        text: isDark ? '#EDF4F0' : '#132238',
        muted: isDark ? '#A9B7B0' : '#687486',
        soft: isDark ? alpha('#DDE5E1', 0.07) : '#F6F8F7',
        shadow: 'none',
        primarySoft: alpha(primaryColor, isDark ? 0.22 : 0.11),
    };

    return createTheme({
        breakpoints: {
            values: { xs: 0, sm: 600, md: 981, lg: 1200, xl: 1536 },
        },
        palette: {
            mode,
            primary: {
                main: primaryColor,
                light: lighten(primaryColor, 0.22),
                dark: darken(primaryColor, 0.18),
                contrastText: '#ffffff',
                soft: tokens.primarySoft,
            },
            secondary: {
                main: '#2f6f4e',
                light: '#57906e',
                dark: '#204d36',
                contrastText: '#ffffff',
            },
            background: {
                default: tokens.bg,
                paper: tokens.surface,
            },
            text: {
                primary: tokens.text,
                secondary: tokens.muted,
            },
            error: { main: statusColors.error },
            warning: { main: statusColors.warning },
            info: { main: statusColors.info },
            success: { main: statusColors.success },
            divider: tokens.border,
            action: {
                hover: tokens.primarySoft,
                selected: tokens.primarySoft,
                disabledBackground: isDark ? alpha('#ffffff', 0.06) : alpha('#0f172a', 0.06),
            },
        },
        typography: {
            fontFamily: 'Inter, "Noto Sans Myanmar", system-ui, sans-serif',
            fontSize: 13,
            h1: { fontSize: 25, fontWeight: 800, letterSpacing: 0 },
            h2: { fontSize: 21, fontWeight: 800, letterSpacing: 0 },
            h3: { fontSize: 19, fontWeight: 800, letterSpacing: 0 },
            h4: { fontSize: 18, fontWeight: 800, letterSpacing: 0 },
            h5: { fontSize: 17, fontWeight: 800, letterSpacing: 0 },
            h6: { fontSize: 15, fontWeight: 800, letterSpacing: 0 },
            subtitle1: { fontSize: 13, fontWeight: 800, letterSpacing: 0 },
            subtitle2: { fontSize: 12, fontWeight: 800, letterSpacing: 0 },
            body1: { fontSize: 13, letterSpacing: 0 },
            body2: { fontSize: 12, letterSpacing: 0 },
            caption: { fontSize: 11, letterSpacing: 0 },
            button: {
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: 'none',
            },
        },
        shape: {
            // Compact radius scale: numeric sx values now resolve from a 4px base.
            // Keep fully rounded values only for semantic pills and circles.
            borderRadius: 4,
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    html: {
                        minHeight: '100%',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                    },
                    body: {
                        minHeight: '100%',
                        color: tokens.text,
                        backgroundColor: tokens.bg,
                        backgroundImage: 'none',
                        scrollbarColor: isDark ? '#415366 transparent' : '#b7c2c8 transparent',
                        '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                            width: 8,
                            height: 8,
                        },
                        '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
                            background: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                            background: isDark ? alpha('#e5eef2', 0.22) : alpha('#172033', 0.22),
                            borderRadius: 99,
                        },
                    },
                    '@media (prefers-reduced-transparency: reduce)': {
                        '.MuiPaper-root, .MuiDrawer-paper, .MuiAppBar-root': {
                            backdropFilter: 'none !important',
                            WebkitBackdropFilter: 'none !important',
                            backgroundColor: `${tokens.surface} !important`,
                        },
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: tokens.surface,
                        backgroundImage: 'none',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: tokens.surface,
                        backgroundImage: 'none',
                        borderColor: tokens.border,
                        boxShadow: 'none',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                    },
                },
            },
            MuiPaper: {
                defaultProps: {
                    elevation: 0,
                },
                styleOverrides: {
                    root: {
                        color: tokens.text,
                        backgroundColor: tokens.surface,
                        backgroundImage: 'none',
                        border: '1px solid',
                        borderColor: tokens.border,
                        borderRadius: 6,
                        boxShadow: 'none',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                    },
                    outlined: {
                        backgroundColor: tokens.surface,
                        borderColor: tokens.border,
                    },
                },
            },
            MuiCard: {
                defaultProps: {
                    elevation: 0,
                },
                styleOverrides: {
                    root: {
                        color: tokens.text,
                        backgroundColor: tokens.surface,
                        backgroundImage: 'none',
                        border: '1px solid',
                        borderColor: tokens.border,
                        borderRadius: 6,
                        boxShadow: 'none',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                    },
                },
            },
            MuiCardContent: {
                styleOverrides: {
                    root: {
                        padding: '10px !important',
                    },
                },
            },
            MuiButton: {
                defaultProps: {
                    size: 'small',
                    disableElevation: true,
                },
                styleOverrides: {
                    root: {
                        minHeight: 32,
                        borderRadius: 5,
                        padding: '5px 9px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        '& .MuiButton-startIcon': {
                            marginRight: 7,
                            color: 'inherit',
                        },
                        '& .MuiButton-startIcon .MuiSvgIcon-root, & .MuiButton-startIcon svg': {
                            width: 16,
                            height: 16,
                            fontSize: 16,
                        },
                    },
                    containedPrimary: {
                        color: '#ffffff',
                        backgroundColor: primaryColor,
                        '&:hover': {
                            backgroundColor: darken(primaryColor, 0.14),
                        },
                    },
                    outlined: {
                        borderColor: tokens.border,
                        backgroundColor: tokens.surface,
                    },
                    text: {
                        color: tokens.muted,
                        '&:hover': {
                            color: primaryColor,
                            backgroundColor: tokens.primarySoft,
                        },
                    },
                },
            },
            MuiIconButton: {
                defaultProps: {
                    size: 'small',
                },
                styleOverrides: {
                    root: {
                        width: 32,
                        height: 32,
                        borderRadius: 5,
                        color: tokens.muted,
                        transition: 'background-color 160ms ease, color 160ms ease, border-color 160ms ease',
                        '&:hover': {
                            color: primaryColor,
                            backgroundColor: tokens.primarySoft,
                        },
                        '& .MuiSvgIcon-root, & svg': {
                            width: 17,
                            height: 17,
                            fontSize: 17,
                        },
                    },
                    sizeSmall: {
                        width: 30,
                        height: 30,
                    },
                },
            },
            MuiTextField: {
                defaultProps: {
                    variant: 'outlined',
                    size: 'small',
                    fullWidth: true,
                },
            },
            MuiFormLabel: {
                styleOverrides: {
                    root: {
                        color: tokens.muted,
                        fontSize: 11,
                        fontWeight: 600,
                        '&.Mui-focused': {
                            color: primaryColor,
                        },
                    },
                },
            },
            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        transform: 'translate(12px, 8px) scale(1)',
                    },
                    shrink: {
                        transform: 'translate(12px, -8px) scale(0.75) !important',
                    },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        minHeight: 34,
                        borderRadius: 4,
                        fontSize: 13,
                        backgroundColor: isDark ? alpha(tokens.surface, 0.92) : '#ffffff',
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: tokens.border,
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: alpha(primaryColor, 0.48),
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: primaryColor,
                            borderWidth: 1,
                            boxShadow: `0 0 0 2px ${tokens.primarySoft}`,
                        },
                    },
                    input: {
                        padding: '6px 9px',
                    },
                    multiline: {
                        padding: 0,
                        '& textarea': {
                            padding: '6px 9px',
                        },
                    },
                },
            },
            MuiSelect: {
                defaultProps: {
                    size: 'small',
                },
                styleOverrides: {
                    select: {
                        padding: '6px 9px',
                    },
                },
            },
            MuiToggleButtonGroup: {
                styleOverrides: {
                    root: {
                        padding: 3,
                        gap: 3,
                        borderRadius: 6,
                        backgroundColor: tokens.soft,
                    },
                },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        minHeight: 30,
                        border: 0,
                        borderRadius: '5px !important',
                        padding: '4px 8px',
                        color: tokens.muted,
                        fontSize: 12,
                        fontWeight: 800,
                        '&.Mui-selected': {
                            color: primaryColor,
                            backgroundColor: isDark ? alpha(primaryColor, 0.22) : '#ffffff',
                            boxShadow: isDark ? 'none' : '0 1px 4px rgba(15, 23, 42, 0.08)',
                        },
                        '&.Mui-selected:hover': {
                            backgroundColor: isDark ? alpha(primaryColor, 0.26) : '#ffffff',
                        },
                    },
                },
            },
            MuiTableContainer: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: tokens.border,
                        backgroundColor: tokens.surface,
                        backgroundImage: 'none',
                        boxShadow: 'none',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                        overflowX: 'auto',
                        '&:has(+ .data-table-footer)': {
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                        },
                    },
                },
            },
            MuiTable: {
                styleOverrides: {
                    root: {
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        '& strong': {
                            color: tokens.text,
                            fontWeight: 800,
                        },
                        '& small': {
                            display: 'block',
                            marginTop: 2,
                            color: tokens.muted,
                            fontSize: 11,
                            lineHeight: 1.35,
                        },
                    },
                },
            },
            MuiTableHead: {
                styleOverrides: {
                    root: {
                        '& .MuiTableCell-root': {
                            backgroundColor: `${tokens.soft} !important`,
                        },
                    },
                },
            },
            MuiTableBody: {
                styleOverrides: {
                    root: {
                        '& .MuiTableRow-root:last-of-type .MuiTableCell-root': {
                            borderBottom: 0,
                        },
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        height: 42,
                        padding: '6px 9px',
                        borderColor: tokens.border,
                        color: tokens.text,
                        fontSize: 12,
                        lineHeight: 1.35,
                        verticalAlign: 'middle',
                        '&:first-of-type': {
                            paddingLeft: 10,
                        },
                        '&:last-of-type': {
                            paddingRight: 10,
                            minWidth: 80,
                            whiteSpace: 'nowrap',
                        },
                        '&:last-of-type > .MuiStack-root': {
                            flexDirection: 'row !important',
                            flexWrap: 'nowrap !important',
                            alignItems: 'center',
                        },
                        '&:last-of-type .MuiButton-root, &:last-of-type .MuiIconButton-root': {
                            flex: '0 0 auto',
                            verticalAlign: 'middle',
                        },
                        '&:last-of-type .MuiIconButton-root': {
                            width: 30,
                            height: 30,
                            marginLeft: 6,
                            border: `1px solid ${tokens.border}`,
                            borderRadius: 6,
                            color: tokens.muted,
                            backgroundColor: isDark ? alpha(tokens.surface, 0.58) : alpha('#ffffff', 0.82),
                            boxShadow: 'none',
                            '&:first-of-type': {
                                marginLeft: 0,
                            },
                            '&:hover': {
                                color: primaryColor,
                                borderColor: alpha(primaryColor, 0.45),
                                backgroundColor: tokens.primarySoft,
                            },
                            '&.MuiIconButton-colorError:hover': {
                                color: statusColors.error,
                                borderColor: alpha(statusColors.error, 0.42),
                                backgroundColor: alpha(statusColors.error, isDark ? 0.16 : 0.08),
                            },
                            '&.MuiIconButton-colorSuccess:hover': {
                                color: statusColors.success,
                                borderColor: alpha(statusColors.success, 0.42),
                                backgroundColor: alpha(statusColors.success, isDark ? 0.16 : 0.08),
                            },
                            '&.Mui-disabled': {
                                borderColor: tokens.border,
                                backgroundColor: isDark ? alpha(tokens.surface, 0.34) : alpha('#ffffff', 0.46),
                            },
                        },
                        '& .MuiTypography-root': {
                            lineHeight: 1.35,
                        },
                        '& .MuiTypography-caption, & .MuiTypography-body2': {
                            color: tokens.muted,
                        },
                    },
                    head: {
                        height: 34,
                        paddingTop: 6,
                        paddingBottom: 6,
                        color: `${tokens.muted} !important`,
                        backgroundColor: `${tokens.soft} !important`,
                        borderBottom: `1px solid ${tokens.border}`,
                        fontSize: '10px !important',
                        fontWeight: '650 !important',
                        letterSpacing: 0,
                        lineHeight: 1.2,
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                    },
                },
            },
            MuiTableRow: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'transparent',
                        transition: 'background-color 140ms ease',
                        '&.MuiTableRow-hover:hover': {
                            backgroundColor: `${tokens.primarySoft} !important`,
                        },
                        '&:hover': {
                            backgroundColor: tokens.primarySoft,
                        },
                    },
                },
            },
            MuiTablePagination: {
                styleOverrides: {
                    root: {
                        color: tokens.muted,
                        borderTop: '1px solid',
                        borderColor: tokens.border,
                        '& .MuiTablePagination-toolbar': {
                            minHeight: 44,
                            paddingLeft: 10,
                            paddingRight: 10,
                        },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            margin: 0,
                            fontSize: 11,
                        },
                        '& .MuiTablePagination-select': {
                            fontSize: 11,
                            fontWeight: 800,
                        },
                    },
                },
            },
            MuiTableSortLabel: {
                styleOverrides: {
                    root: {
                        color: `${tokens.muted} !important`,
                        '&.Mui-active': {
                            color: `${primaryColor} !important`,
                        },
                    },
                    icon: {
                        color: 'inherit !important',
                        fontSize: 15,
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        minHeight: 24,
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                    },
                    label: {
                        paddingLeft: 8,
                        paddingRight: 8,
                    },
                    colorSuccess: {
                        color: statusColors.success,
                        backgroundColor: alpha(statusColors.success, 0.10),
                    },
                    colorWarning: {
                        color: statusColors.warning,
                        backgroundColor: alpha(statusColors.warning, 0.12),
                    },
                    colorError: {
                        color: statusColors.error,
                        backgroundColor: alpha(statusColors.error, 0.10),
                    },
                    colorInfo: {
                        color: statusColors.info,
                        backgroundColor: alpha(statusColors.info, 0.11),
                    },
                },
            },
            MuiAvatar: {
                styleOverrides: {
                    root: {
                        fontSize: 12,
                        fontWeight: 800,
                    },
                    rounded: {
                        borderRadius: 6,
                    },
                },
            },
            MuiDialog: {
                defaultProps: {
                    elevation: 0,
                },
                styleOverrides: {
                    paper: {
                        maxHeight: '90vh',
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor: tokens.border,
                        backgroundColor: tokens.surface,
                        backgroundImage: 'none',
                        boxShadow: isDark ? '0 18px 50px rgba(0,0,0,0.40)' : '0 18px 50px rgba(12,74,58,0.16)',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                    },
                },
            },
            MuiBackdrop: {
                styleOverrides: {
                    root: {
                        backgroundColor: alpha('#0a1318', isDark ? 0.58 : 0.35),
                    },
                },
            },
            MuiDialogTitle: {
                styleOverrides: {
                    root: {
                        minHeight: 48,
                        padding: '9px 12px !important',
                        fontSize: 16,
                        fontWeight: 650,
                        borderBottom: '1px solid',
                        borderColor: tokens.border,
                    },
                },
            },
            MuiDialogContent: {
                styleOverrides: {
                    root: {
                        padding: '12px !important',
                        '&.MuiDialogContent-dividers': {
                            borderColor: tokens.border,
                        },
                    },
                },
            },
            MuiDialogActions: {
                styleOverrides: {
                    root: {
                        minHeight: 52,
                        padding: '9px 12px !important',
                        borderTop: '1px solid',
                        borderColor: tokens.border,
                        '& .MuiButton-root': { minWidth: 110, minHeight: 34 },
                    },
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        backgroundColor: tokens.surface,
                        backgroundImage: 'none',
                    },
                },
            },
            MuiMenuItem: {
                defaultProps: {
                    dense: true,
                },
                styleOverrides: {
                    root: {
                        minHeight: 32,
                        borderRadius: 4,
                        margin: '2px 6px',
                        fontSize: 12,
                    },
                },
            },
            MuiList: {
                defaultProps: {
                    dense: true,
                },
            },
            MuiListItemIcon: {
                styleOverrides: {
                    root: {
                        minWidth: 34,
                        color: 'inherit',
                        '& .MuiSvgIcon-root, & svg': {
                            width: 17,
                            height: 17,
                            fontSize: 17,
                        },
                    },
                },
            },
            MuiListItemText: {
                styleOverrides: {
                    primary: {
                        fontSize: 12,
                    },
                },
            },
            MuiDivider: {
                styleOverrides: {
                    root: {
                        borderColor: tokens.border,
                    },
                },
            },
            MuiAlert: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                        fontSize: 12,
                    },
                },
            },
            MuiSnackbar: {
                defaultProps: {
                    autoHideDuration: 3000,
                },
            },
            MuiTabs: {
                styleOverrides: {
                    root: {
                        minHeight: 38,
                    },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        minHeight: 38,
                        padding: '8px 12px',
                        textTransform: 'none',
                        fontWeight: 800,
                    },
                },
            },
            MuiAccordion: {
                defaultProps: { elevation: 0, disableGutters: true },
                styleOverrides: {
                    root: {
                        border: '1px solid',
                        borderColor: tokens.border,
                        borderRadius: '6px !important',
                        backgroundImage: 'none',
                        boxShadow: 'none',
                        '&:before': { display: 'none' },
                    },
                },
            },
            MuiAccordionSummary: {
                styleOverrides: {
                    root: { minHeight: 38, padding: '0 10px' },
                    content: { margin: '8px 0' },
                },
            },
            MuiAccordionDetails: {
                styleOverrides: { root: { padding: 10, borderTop: `1px solid ${tokens.border}` } },
            },
            MuiPaginationItem: {
                styleOverrides: {
                    root: { minWidth: 30, height: 30, borderRadius: 5, fontSize: 11, fontWeight: 600 },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: { borderRadius: 4, padding: '5px 7px', fontSize: 11, fontWeight: 600 },
                },
            },
            MuiBadge: {
                styleOverrides: {
                    badge: { minWidth: 15, height: 15, padding: '0 3px', fontSize: 9, fontWeight: 800 },
                },
            },
            MuiSkeleton: {
                styleOverrides: { root: { borderRadius: 5 } },
            },
            MuiSvgIcon: {
                styleOverrides: {
                    root: {
                        fontSize: 17,
                    },
                },
            },
        },
    });
};

export default getTheme;
