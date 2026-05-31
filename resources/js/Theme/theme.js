import { alpha, createTheme, darken, lighten } from '@mui/material/styles';

export const getTheme = (mode, primaryColor = '#00796b') => createTheme({
    palette: {
        mode,
        primary: {
            main: primaryColor,
            light: lighten(primaryColor, 0.22),
            dark: darken(primaryColor, 0.22),
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#2e7d32', // Health Green
            light: '#60ad5e',
            dark: '#005005',
            contrastText: '#ffffff',
        },
        background: {
            default: mode === 'light' ? '#f4f7f6' : '#0a1929', // Deep dark blue for dark mode
            paper: mode === 'light' ? '#ffffff' : '#101f33',
        },
        error: {
            main: '#d32f2f',
        },
        warning: {
            main: '#ffa000',
        },
        info: {
            main: '#1976d2',
        },
        success: {
            main: '#388e3c',
        },
        divider: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
    },
    typography: {
        fontFamily: [
            'Inter',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
        ].join(','),
        fontSize: 13,
        h1: { fontWeight: 600 },
        h2: { fontWeight: 600 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 4,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: mode === 'light' ? '#eef6f4' : '#071522',
                    backgroundImage: mode === 'light'
                        ? `radial-gradient(circle at 12% 8%, ${alpha(primaryColor, 0.16)} 0, transparent 28%),
                           radial-gradient(circle at 88% 18%, ${alpha('#1976d2', 0.10)} 0, transparent 24%),
                           linear-gradient(145deg, #f8fbfa 0%, #edf5f3 52%, #f4f8fb 100%)`
                        : `radial-gradient(circle at 12% 8%, ${alpha(primaryColor, 0.24)} 0, transparent 30%),
                           radial-gradient(circle at 88% 18%, ${alpha('#1976d2', 0.18)} 0, transparent 26%),
                           linear-gradient(145deg, #071522 0%, #0a1929 55%, #0b1d2d 100%)`,
                    backgroundAttachment: 'fixed',
                    scrollbarColor: mode === 'light' ? '#bdbdbd #f5f5f5' : '#455a64 #101f33',
                    '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
                        background: mode === 'light' ? '#f5f5f5' : '#101f33',
                        borderRadius: '10px',
                    },
                    '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                        background: mode === 'light' ? '#bdbdbd' : '#455a64',
                        borderRadius: '10px',
                        border: '2px solid',
                        borderColor: mode === 'light' ? '#f5f5f5' : '#101f33',
                    },
                    '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
                        background: mode === 'light' ? '#9e9e9e' : '#607d8b',
                    },
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
                    borderRadius: 3,
                    minHeight: 32,
                    padding: '4px 12px',
                    fontWeight: 600,
                },
            },
        },
        MuiCard: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    border: '1px solid',
                    borderColor: mode === 'light' ? alpha('#ffffff', 0.72) : alpha('#ffffff', 0.12),
                    borderRadius: 3,
                    backgroundColor: mode === 'light' ? alpha('#ffffff', 0.68) : alpha('#101f33', 0.72),
                    backgroundImage: 'none',
                    backdropFilter: 'blur(16px) saturate(125%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(125%)',
                    boxShadow: mode === 'light'
                        ? '0 10px 28px rgba(40, 84, 78, 0.08)'
                        : '0 12px 30px rgba(0, 0, 0, 0.20)',
                },
            },
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    border: '1px solid',
                    borderColor: mode === 'light' ? alpha('#ffffff', 0.68) : alpha('#ffffff', 0.12),
                    borderRadius: 3,
                    backgroundColor: mode === 'light' ? alpha('#ffffff', 0.66) : alpha('#101f33', 0.70),
                    backgroundImage: 'none',
                    backdropFilter: 'blur(16px) saturate(125%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(125%)',
                },
            },
        },
        MuiCardContent: {
            styleOverrides: {
                root: {
                    padding: '12px !important',
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
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    fontSize: '0.875rem',
                    transform: 'translate(14px, 9px) scale(1)',
                },
                shrink: {
                    transform: 'translate(14px, -8px) scale(0.75) !important',
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 3,
                    fontSize: '0.875rem',
                    backgroundColor: mode === 'light' ? '#ffffff' : '#101f33',
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: mode === 'light' ? '#e0e0e0' : '#1e293b',
                        '& legend': {
                            fontSize: '0.65rem',
                        },
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: mode === 'light' ? '#bdbdbd' : '#334155',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: primaryColor,
                        borderWidth: '1.5px',
                        boxShadow: 'none !important',
                        outline: 'none !important',
                    },
                },
                input: {
                    padding: '8.5px 14px',
                    outline: 'none !important',
                    boxShadow: 'none !important',
                },
                multiline: {
                    padding: 0,
                    outline: 'none !important',
                    boxShadow: 'none !important',
                    '& textarea': {
                        padding: '8.5px 14px',
                        outline: 'none !important',
                        boxShadow: 'none !important',
                    }
                }
            },
        },
        MuiSelect: {
            defaultProps: {
                size: 'small',
            },
            styleOverrides: {
                select: {
                    padding: '8.5px 14px',
                    '&:focus': {
                        backgroundColor: 'transparent',
                        outline: 'none !important',
                        boxShadow: 'none !important',
                    },
                },
            },
        },
        MuiDialog: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                paper: {
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: mode === 'light' ? '#d8e1df' : '#24364a',
                    backgroundColor: mode === 'light' ? '#ffffff' : '#101f33',
                    backgroundImage: 'none',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                    boxShadow: mode === 'light' ? '0 4px 20px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.5)',
                    '& .MuiPaper-root': {
                        backgroundColor: mode === 'light' ? '#ffffff' : '#101f33',
                        backgroundImage: 'none',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                        boxShadow: 'none',
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'light' ? alpha('#ffffff', 0.72) : alpha('#101f33', 0.76),
                    backgroundImage: 'none',
                    backdropFilter: 'blur(18px) saturate(135%)',
                    WebkitBackdropFilter: 'blur(18px) saturate(135%)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: mode === 'light' ? alpha('#ffffff', 0.70) : alpha('#101f33', 0.76),
                    backgroundImage: 'none',
                    backdropFilter: 'blur(18px) saturate(135%)',
                    WebkitBackdropFilter: 'blur(18px) saturate(135%)',
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    backgroundColor: mode === 'light' ? '#ffffff' : '#101f33',
                    backgroundImage: 'none',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                },
            },
        },
        MuiAutocomplete: {
            styleOverrides: {
                paper: {
                    backgroundColor: mode === 'light' ? '#ffffff' : '#101f33',
                    backgroundImage: 'none',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                },
            },
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    padding: '10px 14px !important',
                    borderBottom: '1px solid',
                    borderColor: mode === 'light' ? '#f0f0f0' : '#1e293b',
                },
            },
        },
        MuiDialogContent: {
            styleOverrides: {
                root: {
                    padding: '12px 14px !important',
                    '&.MuiDialogContent-dividers': {
                        padding: '12px 14px !important',
                    },
                    '& .MuiStack-root': {
                        gap: '10px',
                    },
                },
            },
        },
        MuiDialogActions: {
            styleOverrides: {
                root: {
                    padding: '8px 14px !important',
                    borderTop: '1px solid',
                    borderColor: mode === 'light' ? '#f0f0f0' : '#1e293b',
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 3,
                    fontSize: '0.875rem',
                },
            },
        },
        MuiSnackbar: {
            defaultProps: {
                autoHideDuration: 3000,
            },
        },
        MuiList: {
            defaultProps: {
                dense: true,
            },
        },
        MuiMenuItem: {
            defaultProps: {
                dense: true,
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    padding: '6px 12px',
                    borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
                },
                head: {
                    backgroundColor: mode === 'light' ? '#f7faf9' : '#14263a',
                    color: mode === 'light' ? '#40514f' : '#d7e2e1',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                },
            },
        },
        MuiIconButton: {
            defaultProps: {
                size: 'small',
            },
            styleOverrides: {
                root: {
                    borderRadius: 3,
                    transition: 'background-color 160ms ease, color 160ms ease, border-color 160ms ease',
                    '&:hover': {
                        backgroundColor: mode === 'light' ? alpha(primaryColor, 0.08) : alpha(primaryColor, 0.18),
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 3,
                    fontWeight: 600,
                },
            },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    borderRadius: 3,
                    padding: '4px 8px',
                },
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
                    fontWeight: 600,
                },
            },
        },
        MuiSvgIcon: {
            styleOverrides: {
                root: {
                    fontSize: '1.02rem',
                    strokeLinejoin: 'round',
                    strokeLinecap: 'round',
                },
            },
        },
        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    minWidth: 38,
                    color: mode === 'light' ? '#0f766e' : '#7dd3c6',
                },
            },
        },
    },
});

export default getTheme;
