import React, { useState } from 'react';
import Icon from './Icons';
import { getLocale, switchLocale } from './localization';

export default function LocaleSelect({ onError, compact = false }) {
    const [busy, setBusy] = useState(false);

    const change = async (event) => {
        setBusy(true);
        try {
            await switchLocale(event.target.value);
        } catch (error) {
            onError?.(error.message || 'Unable to change language.');
            setBusy(false);
        }
    };

    return (
        <label className={`locale-select ${compact ? 'locale-select--compact' : ''}`}>
            <Icon name="language" size={18} />
            {!compact && <span>Language</span>}
            <select value={getLocale()} onChange={change} disabled={busy} aria-label="Language">
                <option value="en">English</option>
                <option value="my">မြန်မာ</option>
            </select>
        </label>
    );
}
