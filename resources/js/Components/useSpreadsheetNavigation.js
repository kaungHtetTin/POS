import { useEffect } from 'react';

// Keep native caret, select, autocomplete and Tab behavior; Enter moves by row.
export default function useSpreadsheetNavigation() {
    useEffect(() => {
        const handleKeyDown = (event) => {
            const input = event.target;
            if (event.defaultPrevented || event.isComposing || event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey) return;
            if (!(input instanceof HTMLInputElement) || !['text', 'search', 'number', 'date', 'tel', 'email', 'url'].includes(input.type) || input.disabled || input.readOnly || input.getAttribute('aria-expanded') === 'true') return;
            const cell = input.closest('td');
            const table = cell?.closest('table.MuiTable-root');
            if (!table || !cell.closest('tbody')) return;
            const rows = [...table.tBodies].flatMap(body => [...body.rows]);
            const direction = event.shiftKey ? -1 : 1;
            for (let index = rows.indexOf(cell.parentElement) + direction; index >= 0 && index < rows.length; index += direction) {
                const target = rows[index].cells[cell.cellIndex]?.querySelector('input:not([type="hidden"]):not([disabled]):not([readonly])');
                if (target && target.getClientRects().length) {
                    event.preventDefault();
                    target.focus();
                    if (['text', 'search', 'tel', 'url', 'password'].includes(target.type)) target.select();
                    return;
                }
            }
            // Reaching the edge must not submit an unfinished document.
            event.preventDefault();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
}
