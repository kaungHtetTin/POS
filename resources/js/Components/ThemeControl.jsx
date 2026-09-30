import React, { useContext, useState } from 'react';
import {
    Box,
    IconButton,
    Popover,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { ColorModeContext } from '@/contexts/ColorModeContext';
import SimpleIcon from '@/Components/SimpleIcon';

const brandPresets = ['#0E684E', '#1565c0', '#7c3aed', '#c2410c', '#b42318', '#2f6f4e'];

export default function ThemeControl({ label = 'Theme', inverse = false }) {
    const { mode = 'light', primaryColor = '#0E684E', setMode, setPrimaryColor } = useContext(ColorModeContext);
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleModeChange = (event, nextMode) => {
        if (nextMode && setMode) {
            setMode(nextMode);
        }
    };

    const handleColorChange = (nextColor) => {
        if (setPrimaryColor) {
            setPrimaryColor(nextColor);
        }
    };

    return (
        <>
            <Tooltip title={label}>
                <IconButton
                    color="inherit"
                    size="small"
                    onClick={(event) => setAnchorEl(event.currentTarget)}
                    aria-label={label}
                    sx={{
                        border: '1px solid',
                        borderColor: inverse ? 'rgba(255,255,255,0.22)' : 'divider',
                        bgcolor: inverse ? 'rgba(255,255,255,0.10)' : 'background.paper',
                        color: inverse ? '#FFFFFF' : 'text.secondary',
                        '&:hover': inverse ? { bgcolor: 'rgba(255,255,255,0.18)', color: '#FFFFFF' } : undefined,
                    }}
                >
                    <SimpleIcon name="palette" size={17} />
                </IconButton>
            </Tooltip>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1,
                            width: 258,
                            p: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                        },
                    },
                }}
            >
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
                            Mode
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            value={mode}
                            onChange={handleModeChange}
                        >
                            <ToggleButton value="light">
                                <SimpleIcon name="sun" size={15} style={{ marginRight: 6 }} />
                                Light
                            </ToggleButton>
                            <ToggleButton value="dark">
                                <SimpleIcon name="moon" size={15} style={{ marginRight: 6 }} />
                                Dark
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
                            Brand
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                            {brandPresets.map((color) => {
                                const selected = color.toUpperCase() === primaryColor.toUpperCase();

                                return (
                                    <Tooltip key={color} title={color}>
                                        <IconButton
                                            size="small"
                                            aria-label={`Use ${color}`}
                                            onClick={() => handleColorChange(color)}
                                            sx={{
                                                width: 30,
                                                height: 30,
                                                bgcolor: color,
                                                color: '#ffffff',
                                                border: '2px solid',
                                                borderColor: selected ? 'text.primary' : 'background.paper',
                                                '&:hover': { bgcolor: color },
                                            }}
                                        >
                                            {selected && <SimpleIcon name="check" size={15} />}
                                        </IconButton>
                                    </Tooltip>
                                );
                            })}
                            <Box
                                component="input"
                                type="color"
                                value={primaryColor}
                                onChange={(event) => handleColorChange(event.target.value)}
                                aria-label="Custom brand color"
                                sx={{
                                    width: 30,
                                    height: 30,
                                    p: 0,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '6px',
                                    bgcolor: 'transparent',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                }}
                            />
                        </Stack>
                    </Box>
                </Stack>
            </Popover>
        </>
    );
}
