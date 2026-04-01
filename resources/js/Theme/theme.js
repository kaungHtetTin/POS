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
            },
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    padding: '4px 12px',
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
                    borderColor: mode === 'light' ? '#e0e0e0' : '#1e293b',
                    borderRadius: 4,
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
                    borderColor: mode === 'light' ? '#e0e0e0' : '#1e293b',
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
                    fontSize: '0.875rem',
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
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: mode === 'light' ? '#e0e0e0' : '#1e293b',
                    boxShadow: mode === 'light' ? '0 4px 20px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.5)',
                },
            },
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    padding: '12px 16px',
                    borderBottom: '1px solid',
                    borderColor: mode === 'light' ? '#f0f0f0' : '#1e293b',
                },
            },
        },
        MuiDialogActions: {
            styleOverrides: {
                root: {
                    padding: '8px 16px',
                    borderTop: '1px solid',
                    borderColor: mode === 'light' ? '#f0f0f0' : '#1e293b',
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
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
            },
        },
        MuiIconButton: {
            defaultProps: {
                size: 'small',
            },
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    border: '1px solid',
                    borderColor: mode === 'light' ? alpha(primaryColor, 0.22) : alpha(primaryColor, 0.38),
                    backgroundColor: mode === 'light' ? alpha(primaryColor, 0.07) : alpha(primaryColor, 0.18),
                    transition: 'all 180ms ease',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        backgroundColor: mode === 'light' ? alpha(primaryColor, 0.14) : alpha(primaryColor, 0.28),
                        borderColor: mode === 'light' ? alpha(primaryColor, 0.34) : alpha(primaryColor, 0.56),
                        boxShadow: mode === 'light'
                            ? `0 6px 16px ${alpha(primaryColor, 0.24)}`
                            : '0 6px 16px rgba(0, 0, 0, 0.45)',
                    },
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
