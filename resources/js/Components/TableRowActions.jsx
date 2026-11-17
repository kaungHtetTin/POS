import React from 'react';
import {
    ClickAwayListener,
    IconButton,
    ListItemIcon,
    ListItemText,
    MenuList,
    MenuItem,
    Paper,
    Popper,
    TableCell,
    Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';

function actionElements(children, inheritedLabel = '') {
    return React.Children.toArray(children).flatMap((child) => {
        if (!React.isValidElement(child)) return [];

        if (child.type === React.Fragment) {
            return actionElements(child.props.children, inheritedLabel);
        }

        const componentName = child.type?.muiName || child.type?.displayName || child.type?.name;
        const isTooltip = (child.type === Tooltip || componentName === 'Tooltip') && child.props?.children;
        if (isTooltip && React.isValidElement(child.props.children)) {
            return actionElements(child.props.children, child.props.title);
        }

        if (
            typeof child.type === 'string'
            && !child.props.onClick
            && !child.props.href
            && React.Children.count(child.props.children) === 1
            && React.isValidElement(child.props.children)
        ) {
            return actionElements(child.props.children, inheritedLabel);
        }

        const label = child.props.title
            || inheritedLabel
            || child.props['aria-label']
            || (typeof child.props.children === 'string' ? child.props.children : 'Action');

        return [{ child, label }];
    });
}

export function TableActionHead({ children = 'Actions', sx = {}, ...props }) {
    return (
        <TableCell
            className="table-action-head"
            align="center"
            {...props}
            sx={{
                position: 'sticky',
                right: 0,
                zIndex: 4,
                width: 80,
                minWidth: 80,
                maxWidth: 80,
                px: '9px',
                textAlign: 'center',
                bgcolor: 'background.paper',
                boxShadow: '-1px 0 0',
                boxShadowColor: 'divider',
                ...sx,
            }}
        >
            {children}
        </TableCell>
    );
}

export function TableActionCell({ children, sx = {}, ...props }) {
    return (
        <TableCell
            className="table-action-cell"
            align="center"
            {...props}
            sx={{
                position: 'sticky',
                right: 0,
                zIndex: 3,
                width: 80,
                minWidth: 80,
                maxWidth: 80,
                px: '9px',
                textAlign: 'center',
                bgcolor: 'background.paper',
                boxShadow: '-1px 0 0',
                boxShadowColor: 'divider',
                ...sx,
            }}
        >
            {children}
        </TableCell>
    );
}

export default function TableRowActions({ label, children, disabled = false }) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const menuId = React.useId();
    const closeTimer = React.useRef(null);
    const openedByHover = React.useRef(false);
    const actions = actionElements(children);
    const open = Boolean(anchorEl);

    const cancelScheduledClose = React.useCallback(() => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
    }, []);

    const close = React.useCallback(() => {
        cancelScheduledClose();
        openedByHover.current = false;
        setAnchorEl(null);
    }, [cancelScheduledClose]);

    const openFromHover = (event) => {
        if (disabled || actions.length === 0 || event.pointerType !== 'mouse') return;
        cancelScheduledClose();
        openedByHover.current = true;
        setAnchorEl(event.currentTarget);
    };

    const scheduleHoverClose = (event) => {
        if (event.pointerType !== 'mouse' || !openedByHover.current) return;
        cancelScheduledClose();
        closeTimer.current = window.setTimeout(close, 160);
    };

    const toggle = (event) => {
        cancelScheduledClose();
        if (open) {
            if (openedByHover.current) {
                openedByHover.current = false;
                return;
            }
            close();
            return;
        }
        openedByHover.current = false;
        setAnchorEl(event.currentTarget);
    };

    React.useEffect(() => () => cancelScheduledClose(), [cancelScheduledClose]);

    return (
        <>
            <IconButton
                type="button"
                aria-label={`Actions for ${label}`}
                aria-haspopup="menu"
                aria-controls={open ? menuId : undefined}
                aria-expanded={open ? 'true' : undefined}
                disabled={disabled || actions.length === 0}
                onClick={toggle}
                onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); openedByHover.current = false; cancelScheduledClose(); setAnchorEl(event.currentTarget); } }}
                onPointerEnter={openFromHover}
                onPointerLeave={scheduleHoverClose}
                sx={{
                    '&&': { width: { xs: 34, md: 30 }, minWidth: { xs: 34, md: 30 }, height: { xs: 34, md: 30 }, minHeight: { xs: 34, md: 30 }, border: '1px solid', borderColor: open ? 'primary.main' : 'divider', borderRadius: '7px', color: open ? 'primary.main' : 'text.secondary', bgcolor: open ? 'primary.soft' : 'background.paper', '&:hover': { bgcolor: 'primary.soft', borderColor: 'primary.main' }, '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } },
                    p: 0,
                    border: 0,
                    borderRadius: '5px',
                    bgcolor: open ? 'primary.soft' : 'transparent',
                    color: open ? 'primary.main' : 'text.primary',
                    '&:hover': { bgcolor: 'primary.soft', color: 'primary.main' },
                }}
            >
                <MoreVertIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <Popper
                anchorEl={anchorEl}
                open={open}
                placement="bottom-end"
                disablePortal={false}
                modifiers={[
                    { name: 'offset', options: { offset: [0, 4] } },
                    { name: 'flip', options: { padding: 8 } },
                    { name: 'preventOverflow', options: { padding: 8 } },
                ]}
                sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
            >
                <ClickAwayListener onClickAway={(event) => {
                    if (anchorEl?.contains(event.target)) return;
                    close();
                }}>
                    <Paper
                        role="presentation"
                        onPointerEnter={cancelScheduledClose}
                        onPointerLeave={scheduleHoverClose}
                        sx={{
                            minWidth: 196,
                            maxWidth: 'calc(100vw - 24px)',
                            p: 0.5,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: '10px',
                            boxShadow: '0 10px 28px rgba(19, 34, 56, 0.16)',
                        }}
                    >
                        <MenuList
                            dense
                            id={menuId}
                            autoFocusItem={!openedByHover.current}
                            aria-label={`Actions for ${label}`}
                            onKeyDown={(event) => {
                                if (event.key === 'Tab') { close(); anchorEl?.focus(); return; }
                                if (event.key !== 'Escape') return;
                                event.preventDefault();
                                close();
                                anchorEl?.focus();
                            }}
                            sx={{ p: '4px' }}
                        >
                            {actions.map(({ child, label: actionLabel }, index) => {
                                const color = child.props.color;
                                const isDanger = color === 'error' || child.props.className?.includes('danger');
                                const icon = child.props.startIcon || child.props.children;
                                const componentProps = {};

                                if (child.props.component) componentProps.component = child.props.component;
                                if (child.props.href) componentProps.href = child.props.href;
                                if (child.props.target) componentProps.target = child.props.target;

                                return (
                                    <MenuItem
                                        key={`${actionLabel}-${index}`}
                                        {...componentProps}
                                        disabled={child.props.disabled}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            close();
                                            child.props.onClick?.(event);
                                        }}
                                        sx={{
                                            minHeight: { xs: 40, md: 34 },
                                            py: 0.75,
                                            px: 1,
                                            gap: 1,
                                            borderRadius: '6px',
                                            ...(isDanger && index > 0 ? { mt: 0.5, borderTop: '1px solid', borderColor: 'divider' } : {}),
                                            color: isDanger ? 'error.main' : 'text.primary',
                                            fontSize: 12,
                                            '&:hover, &.Mui-focusVisible': { bgcolor: (theme) => isDanger ? alpha(theme.palette.error.main, 0.1) : theme.palette.primary.soft },
                                        }}
                                    >
                                        {React.isValidElement(icon) && (
                                            <ListItemIcon sx={{ minWidth: '18px !important', color: 'inherit', '& svg': { fontSize: 15 } }}>
                                                {icon}
                                            </ListItemIcon>
                                        )}
                                        <ListItemText primary={actionLabel} primaryTypographyProps={{ fontSize: 12, fontWeight: 500 }} />
                                    </MenuItem>
                                );
                            })}
                        </MenuList>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </>
    );
}
