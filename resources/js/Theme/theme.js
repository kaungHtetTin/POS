import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => createTheme({
    palette: {
        mode,
        primary: {
            main: '#00796b', // Medical Teal
            light: '#48a999',
            dark: '#004c40',
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
                        borderColor: '#00796b',
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
        },
    },
});

export default getTheme;
