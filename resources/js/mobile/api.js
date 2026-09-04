const config = window.cashierPwa || {};

export class ApiError extends Error {
    constructor(message, status = 0, errors = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}

const urlFor = (path) => `${String(config.apiUrl || '/api').replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;

export async function apiRequest(path, { token, method = 'GET', json, body, signal } = {}) {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (json !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
        response = await fetch(urlFor(path), {
            method,
            headers,
            body: json !== undefined ? JSON.stringify(json) : body,
            signal,
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new ApiError('Cannot reach the server. Check your connection and try again.');
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
        const firstValidationError = Object.values(payload?.errors || {}).flat()[0];
        throw new ApiError(
            firstValidationError || payload?.message || `Request failed (${response.status}).`,
            response.status,
            payload?.errors || {},
        );
    }

    return payload;
}

export function queryString(values = {}) {
    const query = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) query.set(key, String(value));
    });
    const result = query.toString();
    return result ? `?${result}` : '';
}

export { config };
