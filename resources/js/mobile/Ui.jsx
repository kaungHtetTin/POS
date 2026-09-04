import React, { useEffect } from 'react';
import Icon from './Icons';
import { getLocale } from './localization';

export function Modal({ open, title, children, onClose, wide = false, footer }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => event.key === 'Escape' && onClose?.();
        document.body.classList.add('modal-open');
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.classList.remove('modal-open');
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
            <section className={`modal-card ${wide ? 'modal-card--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
                <header><h2>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
                <div className="modal-card__body">{children}</div>
                {footer && <footer>{footer}</footer>}
            </section>
        </div>
    );
}

export function Sheet({ open, title, subtitle, children, onClose, footer }) {
    useEffect(() => {
        if (!open) return undefined;
        document.body.classList.add('modal-open');
        return () => document.body.classList.remove('modal-open');
    }, [open]);

    if (!open) return null;
    return (
        <div className="sheet-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
            <section className="sheet" role="dialog" aria-modal="true" aria-label={title}>
                <div className="sheet__handle" />
                <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
                <div className="sheet__body">{children}</div>
                {footer && <footer className="sheet__footer">{footer}</footer>}
            </section>
        </div>
    );
}

export function EmptyState({ icon = 'receipt', title, children, action }) {
    return (
        <div className="empty-state">
            <span><Icon name={icon} size={28} /></span>
            <h3>{title}</h3>
            {children && <p>{children}</p>}
            {action}
        </div>
    );
}

export function SkeletonList({ count = 4 }) {
    return <div className="skeleton-list" aria-label="Loading">{Array.from({ length: count }).map((_, index) => <div key={index} className="skeleton-card"><i /><span><b /><b /></span></div>)}</div>;
}

const intlLocale = () => getLocale() === 'my' ? 'my-MM' : 'en-US';

export const money = (value, symbol = '$') => `${symbol}${Number(value || 0).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (value, withTime = true) => {
    if (!value) return '—';
    try {
        return new Intl.DateTimeFormat(intlLocale(), withTime
            ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
            : { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
    } catch {
        return value;
    }
};

export function flattenErrors(errors) {
    if (!errors) return '';
    if (typeof errors === 'string') return errors;
    return Object.values(errors).flat().join(' ');
}
