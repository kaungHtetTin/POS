import { alpha, createTheme, darken, lighten } from '@mui/material/styles';

const statusColors = {
    success: '#168255',
    warning: '#b77700',
    error: '#ce4444',
    info: '#2874bc',
    neutral: '#7b8795',
};

export const getTheme = (mode, primaryColor = '#087f74') => {
    const isDark = mode === 'dark';
    const tokens = {
        bg: isDark ? '#0b151d' : '#eef4f4',
        surface: isDark ? '#101d28' : '#ffffff',
        glass: isDark ? alpha('#101d28', 0.78) : alpha('#ffffff', 0.78),
        border: isDark ? alpha('#e5eef2', 0.12) : alpha('#0f172a', 0.10),
        text: isDark ? '#e7edf2' : '#172033',
        muted: isDark ? '#9aa8b8' : '#69768a',
        soft: isDark ? alpha('#e5eef2', 0.06) : '#f2f6f6',
        shadow: isDark ? '0 14px 34px rgba(0, 0, 0, 0.28)' : '0 12px 30px rgba(16, 71, 67, 0.10)',
        primarySoft: alpha(primaryColor, isDark ? 0.22 : 0.11),
    };

    return createTheme({
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
                        backgroundImage: `radial-gradient(circle at 7% 4%, ${alpha(primaryColor, isDark ? 0.20 : 0.13)}, transparent 23rem),
                            radial-gradient(circle at 92% 95%, ${alpha('#569cbf', isDark ? 0.16 : 0.12)}, transparent 27rem)`,
                        backgroundAttachment: 'fixed',
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
                        backgroundColor: tokens.glass,
                        backgroundImage: 'none',
                        backdropFilter: 'blur(14px) saturate(125%)',
                        WebkitBackdropFilter: 'blur(14px) saturate(125%)',
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: tokens.glass,
                        backgroundImage: 'none',
                        borderColor: tokens.border,
                        boxShadow: tokens.shadow,
                        backdropFilter: 'blur(14px) saturate(125%)',
                        WebkitBackdropFilter: 'blur(14px) saturate(125%)',
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
                        backgroundColor: tokens.glass,
                        backgroundImage: 'none',
                        border: '1px solid',
                        borderColor: tokens.border,
                        borderRadius: 6,
                        boxShadow: tokens.shadow,
                        backdropFilter: 'blur(14px) saturate(125%)',
                        WebkitBackdropFilter: 'blur(14px) saturate(125%)',
                    },
                    outlined: {
                        backgroundColor: isDark ? alpha(tokens.surface, 0.72) : alpha('#ffffff', 0.74),
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
                        backgroundColor: tokens.glass,
                        backgroundImage: 'none',
                        border: '1px solid',
                        borderColor: tokens.border,
                        borderRadius: 6,
                        boxShadow: tokens.shadow,
                        backdropFilter: 'blur(14px) saturate(125%)',
                        WebkitBackdropFilter: 'blur(14px) saturate(125%)',
                    },
                },
            },
            MuiCardContent: {
                styleOverrides: {
                    root: {
                        padding: '13px !important',
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
                        minHeight: 36,
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontWeight: 800,
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
                        backgroundColor: isDark ? alpha(tokens.surface, 0.54) : alpha('#ffffff', 0.72),
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
                        width: 34,
                        height: 34,
                        borderRadius: 6,
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
                        fontSize: 12,
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
                        minHeight: 39,
                        borderRadius: 6,
                        fontSize: 12,
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
                            boxShadow: `0 0 0 3px ${tokens.primarySoft}`,
                        },
                    },
                    input: {
                        padding: '8.5px 12px',
                    },
                    multiline: {
                        padding: 0,
                        '& textarea': {
                            padding: '8.5px 12px',
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
                        padding: '8.5px 12px',
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
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor: tokens.border,
                        backgroundColor: isDark ? alpha(tokens.surface, 0.92) : alpha('#ffffff', 0.90),
                        backgroundImage: 'none',
                        boxShadow: 'none',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                        overflowX: 'auto',
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
                        height: 34,
                        padding: '7px 10px',
                        borderColor: tokens.border,
                        color: tokens.text,
                        fontSize: 11,
                        lineHeight: 1.35,
                        verticalAlign: 'middle',
                        '&:first-of-type': {
                            paddingLeft: 12,
                        },
                        '&:last-of-type': {
                            paddingRight: 12,
                            minWidth: 78,
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
                        height: 30,
                        paddingTop: 8,
                        paddingBottom: 8,
                        color: `${tokens.muted} !important`,
                        backgroundColor: `${tokens.soft} !important`,
                        borderBottom: `1px solid ${tokens.border}`,
                        fontSize: '9px !important',
                        fontWeight: '800 !important',
                        letterSpacing: '0.07em',
                        lineHeight: 1.2,
                        textTransform: 'uppercase',
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
                            minHeight: 42,
                            paddingLeft: 12,
                            paddingRight: 8,
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
                        minHeight: 20,
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 800,
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
                        backgroundColor: tokens.glass,
                        backgroundImage: 'none',
                        boxShadow: tokens.shadow,
                        backdropFilter: 'blur(14px) saturate(125%)',
                        WebkitBackdropFilter: 'blur(14px) saturate(125%)',
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
                        padding: '12px 16px !important',
                        fontSize: 15,
                        fontWeight: 800,
                        borderBottom: '1px solid',
                        borderColor: tokens.border,
                    },
                },
            },
            MuiDialogContent: {
                styleOverrides: {
                    root: {
                        padding: '14px 16px !important',
                        '&.MuiDialogContent-dividers': {
                            borderColor: tokens.border,
                        },
                    },
                },
            },
            MuiDialogActions: {
                styleOverrides: {
                    root: {
                        padding: '12px 16px !important',
                        borderTop: '1px solid',
                        borderColor: tokens.border,
                    },
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        backgroundColor: tokens.glass,
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
                        minHeight: 34,
                        borderRadius: 6,
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
