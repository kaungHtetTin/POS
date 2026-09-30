import React from 'react';
import { TableRow } from '@mui/material';
import { router } from '@/spa';

export default function ClickableTableRow({ href, label, children, sx, ...props }) {
    const clickable = Boolean(href);
    const visit = () => {
        if (href) router.visit(href);
    };

    const handleClick = (event) => {
        if (event.target.closest('a, button, input, select, textarea, [role="button"], .table-action-cell')) return;
        visit();
    };

    const handleKeyDown = (event) => {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        visit();
    };

    return (
        <TableRow
            {...props}
            hover={clickable || props.hover}
            role={clickable ? 'link' : undefined}
            tabIndex={clickable ? 0 : props.tabIndex}
            aria-label={clickable ? label : undefined}
            onClick={clickable ? handleClick : props.onClick}
            onKeyDown={clickable ? handleKeyDown : props.onKeyDown}
            sx={[
                ...(clickable ? [{ cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }] : []),
                ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
            ]}
        >
            {children}
        </TableRow>
    );
}
