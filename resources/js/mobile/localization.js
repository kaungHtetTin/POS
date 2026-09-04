import { config } from './api';

const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'placeholder', 'title', 'alt'];
const locale = String(config.locale || document.documentElement.lang || 'en').toLowerCase().split('-')[0];
const translations = config.translations || {};

export const getLocale = () => locale;

function translateExact(value) {
    const translated = translations[value];
    return typeof translated === 'string' && translated ? translated : value;
}

export function t(value) {
    if (locale === 'en' || typeof value !== 'string' || !value.trim()) return value;

    const leading = value.match(/^\s*/)?.[0] || '';
    const trailing = value.match(/\s*$/)?.[0] || '';
    const text = value.trim();
    let translated = translateExact(text);

    if (translated === text) {
        const punctuated = text.match(/^(.+)([.!?])$/);
        if (punctuated) {
            const stem = translateExact(punctuated[1]);
            if (stem !== punctuated[1]) translated = `${stem}${punctuated[2]}`;
        }
    }

    if (translated === text) {
        // Translate compact UI phrases while preserving their visual separator.
        for (const separator of [' · ', ': ']) {
            if (!text.includes(separator)) continue;
            const parts = text.split(separator);
            const next = parts.map((part) => t(part)).join(separator);
            if (next !== text) {
                translated = next;
                break;
            }
        }
    }

    if (translated === text) {
        const count = text.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
        if (count) {
            const unit = t(count[2]);
            if (unit !== count[2]) translated = `${count[1]} ${unit}`;
        }
    }

    if (translated === text) {
        const wrapped = text.match(/^(.+)\s+\((.+)\)$/);
        if (wrapped) translated = `${t(wrapped[1])} (${t(wrapped[2])})`;
    }

    if (translated === text) {
        const patterns = [
            [/^Since\s+(.+)$/, 'Since', false],
            [/^Opened\s+(.+)$/, 'Opened', false],
            [/^Includes\s+(.+)$/, 'Includes', false],
            [/^Remove\s+(.+)$/, 'Remove', false],
            [/^View cart with\s+(.+)$/, 'View cart with', false],
            [/^Switched to\s+(.+)$/, 'Switched to', false],
            [/^Cash received is short by\s+(.+)$/, 'Cash received is short by', false],
            [/^No product found for barcode\s+(.+)$/, 'No product found for barcode', false],
            [/^Receipt\s+(.+)$/, 'Receipt', false],
            [/^Total:\s+(.+)$/, 'Total:', false],
            [/^(.+)\s+added to cart\.$/, 'added to cart.', true],
            [/^(.+)\s+available results$/, 'available results', true],
            [/^(.+)\s+in this sale$/, 'in this sale', true],
            [/^(.+)\s+pricing$/, 'pricing', true],
            [/^(.+)\s+left$/, 'left', true],
            [/^(.+)\s+sales$/, 'sales', true],
            [/^(.+)\s+receipts$/, 'receipts', true],
            [/^(.+)\s+waiting to sync\.?$/, 'waiting to sync', true],
            [/^(.+)\s+stored on this device\.?$/, 'stored on this device', true],
            [/^(.+)\s+still need attention\.?$/, 'still need attention', true],
            [/^(.+)\s+synced\.?$/, 'synced', true],
        ];

        for (const [pattern, key, suffix] of patterns) {
            const match = text.match(pattern);
            const label = translateExact(key);
            if (!match || label === key) continue;
            translated = suffix ? `${t(match[1])} ${label}` : `${label} ${match[1]}`;
            break;
        }
    }

    return `${leading}${translated}${trailing}`;
}

function translateElement(element) {
    for (const attribute of TRANSLATABLE_ATTRIBUTES) {
        if (!element.hasAttribute?.(attribute)) continue;
        const current = element.getAttribute(attribute);
        const next = t(current);
        if (next !== current) element.setAttribute(attribute, next);
    }
}

function translateSubtree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
        const next = t(root.nodeValue);
        if (next !== root.nodeValue) root.nodeValue = next;
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;

    translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const next = t(node.nodeValue);
            if (next !== node.nodeValue) node.nodeValue = next;
        } else {
            translateElement(node);
        }
        node = walker.nextNode();
    }
}

export function installLocalization(root = document.body) {
    document.documentElement.lang = locale;
    if (locale === 'en' || !root) return;

    translateSubtree(root);
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'characterData') translateSubtree(mutation.target);
            if (mutation.type === 'attributes') translateElement(mutation.target);
            mutation.addedNodes?.forEach(translateSubtree);
        }
    });
    observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRIBUTES,
    });
}

export async function switchLocale(nextLocale) {
    if (!['en', 'my'].includes(nextLocale) || nextLocale === locale) return;

    const response = await fetch(config.languageUrl || `${String(config.baseUrl || '').replace(/\/$/, '')}/language`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': config.csrfToken || document.querySelector('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({ locale: nextLocale }),
    });

    if (!response.ok) throw new Error('Unable to change language.');
    window.location.reload();
}
