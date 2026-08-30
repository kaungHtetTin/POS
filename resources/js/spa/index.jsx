import React, {
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

const SpaContext = createContext(null);
const listeners = new Map();
let navigationHandler = null;

const emit = (name, detail = {}) => {
    (listeners.get(name) || new Set()).forEach((listener) => listener({ detail }));
};

const normalizeUrl = (value) => {
    const raw = typeof value === 'string' ? value : value?.url;
    const parsed = new URL(raw || window.location.href, window.location.href);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};

const buildGetUrl = (url, data = {}) => {
    const parsed = new URL(url, window.location.href);
    const params = new URLSearchParams(parsed.search);

    Object.entries(data || {}).forEach(([key, value]) => {
        params.delete(key);
        params.delete(`${key}[]`);
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (item !== undefined && item !== null && item !== '') params.append(`${key}[]`, String(item));
            });
            return;
        }
        params.set(key, String(value));
    });

    parsed.search = params.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};

const appendFormValue = (form, key, value) => {
    if (value === undefined) return;
    if (value === null) {
        form.append(key, '');
        return;
    }
    if (value instanceof File || value instanceof Blob) {
        form.append(key, value);
        return;
    }
    if (value instanceof Date) {
        form.append(key, value.toISOString());
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => appendFormValue(form, `${key}[${index}]`, item));
        return;
    }
    if (typeof value === 'object') {
        Object.entries(value).forEach(([childKey, item]) => appendFormValue(form, `${key}[${childKey}]`, item));
        return;
    }
    form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
};

const toFormData = (data = {}) => {
    const form = new FormData();
    Object.entries(data || {}).forEach(([key, value]) => appendFormValue(form, key, value));
    return form;
};

export const router = {
    bind(handler) {
        navigationHandler = handler;
        return () => {
            if (navigationHandler === handler) navigationHandler = null;
        };
    },
    on(name, listener) {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(listener);
        return () => listeners.get(name)?.delete(listener);
    },
    visit(url, options = {}) {
        if (!navigationHandler) return Promise.reject(new Error('SPA router is not ready.'));
        return navigationHandler(url, options);
    },
    get(url, data = {}, options = {}) {
        return this.visit(buildGetUrl(url, data), { ...options, method: 'get' });
    },
    post(url, data = {}, options = {}) {
        return this.visit(url, { ...options, method: 'post', data });
    },
    put(url, data = {}, options = {}) {
        return this.visit(url, { ...options, method: 'put', data });
    },
    patch(url, data = {}, options = {}) {
        return this.visit(url, { ...options, method: 'patch', data });
    },
    delete(url, data = {}, options = {}) {
        if (typeof data === 'object' && (data.onSuccess || data.onError || data.preserveScroll)) {
            return this.visit(url, { ...data, method: 'delete', data: {} });
        }
        return this.visit(url, { ...options, method: 'delete', data });
    },
    async action(url, data = {}, options = {}) {
        const target = normalizeUrl(url);
        const headers = {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        if (csrf) headers['X-CSRF-TOKEN'] = csrf;

        options.onStart?.();
        emit('start', { url: target, method: 'post' });

        try {
            const response = await fetch(target, {
                method: 'POST',
                headers,
                credentials: 'same-origin',
                body: toFormData(data),
            });
            const contentType = response.headers.get('content-type') || '';
            const payload = contentType.includes('application/json') ? await response.json() : null;

            if (response.status === 422) {
                const errors = payload?.errors || {};
                options.onError?.(errors);
                return { errors };
            }
            if (!response.ok) {
                throw new Error(payload?.message || `Request failed (${response.status}).`);
            }

            options.onSuccess?.(payload);
            if (options.reload === false) return payload;

            return this.reload({ preserveScroll: options.preserveScroll ?? true });
        } catch (error) {
            options.onError?.({ action: error.message || 'Unable to complete this action.' });
            emit('error', { error });
            return null;
        } finally {
            options.onFinish?.();
            emit('finish', {});
        }
    },
    reload(options = {}) {
        return this.visit(window.location.href, { ...options, method: 'get', replace: true });
    },
};

export function SpaProvider({ initialPage, resolve, children }) {
    const [page, setPage] = useState(initialPage);
    const [PageComponent, setPageComponent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [navigationError, setNavigationError] = useState('');
    const requestRef = useRef(null);
    const pageRef = useRef(initialPage);

    const loadComponent = useCallback(async (name) => {
        const module = await resolve(name);
        return module.default || module;
    }, [resolve]);

    useEffect(() => {
        let active = true;
        loadComponent(initialPage.component).then((component) => {
            if (!active) return;
            setPageComponent(() => component);
            setLoading(false);
        });
        return () => { active = false; };
    }, [initialPage.component, loadComponent]);

    const visit = useCallback(async (rawUrl, options = {}) => {
        const method = String(options.method || 'get').toLowerCase();
        const isGet = method === 'get';
        const target = isGet ? buildGetUrl(normalizeUrl(rawUrl), options.data || {}) : normalizeUrl(rawUrl);
        const previousScroll = { x: window.scrollX, y: window.scrollY };

        if (options.onBefore?.() === false) return null;
        if (isGet && !options.fromPopstate) {
            window.history[options.replace ? 'replaceState' : 'pushState']({}, '', target);
        }

        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setNavigationError('');
        setLoading(true);
        options.onStart?.();
        emit('start', { url: target, method });

        try {
            const headers = {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-SPA': 'true',
            };
            const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
            if (csrf) headers['X-CSRF-TOKEN'] = csrf;

            const fetchOptions = {
                method: isGet ? 'GET' : 'POST',
                headers,
                credentials: 'same-origin',
                redirect: 'follow',
                signal: controller.signal,
            };

            if (!isGet) {
                const body = toFormData(options.data || {});
                if (method !== 'post' && !body.has('_method')) body.append('_method', method.toUpperCase());
                fetchOptions.body = body;
            }

            const response = await fetch(target, fetchOptions);
            const contentType = response.headers.get('content-type') || '';
            const payload = contentType.includes('application/json') ? await response.json() : null;

            if (response.status === 422) {
                const errors = payload?.errors || {};
                options.onError?.(errors);
                return { errors };
            }
            if (!response.ok) {
                throw new Error(payload?.message || `Request failed (${response.status}).`);
            }
            if (!payload?.component) {
                window.location.assign(response.url || target);
                return null;
            }

            const component = await loadComponent(payload.component);
            const finalUrl = normalizeUrl(response.url || payload.url || target);
            if (!isGet || finalUrl !== target) window.history.replaceState({}, '', finalUrl);

            pageRef.current = payload;
            setPage(payload);
            setPageComponent(() => component);
            emit('navigate', { page: payload });
            options.onSuccess?.(payload);

            if (options.preserveScroll) {
                requestAnimationFrame(() => window.scrollTo(previousScroll.x, previousScroll.y));
            } else {
                requestAnimationFrame(() => window.scrollTo(0, 0));
            }
            return payload;
        } catch (error) {
            if (error.name === 'AbortError') return null;
            setNavigationError(error.message || 'Unable to load this page.');
            options.onError?.({ navigation: error.message });
            emit('error', { error });
            return null;
        } finally {
            if (requestRef.current === controller) {
                requestRef.current = null;
                setLoading(false);
            }
            options.onFinish?.();
            emit('finish', { page: pageRef.current });
        }
    }, [loadComponent]);

    useEffect(() => router.bind(visit), [visit]);

    useEffect(() => {
        const handlePopstate = () => visit(window.location.href, {
            method: 'get',
            replace: true,
            fromPopstate: true,
            preserveScroll: true,
        });
        window.addEventListener('popstate', handlePopstate);
        return () => window.removeEventListener('popstate', handlePopstate);
    }, [visit]);

    const context = useMemo(() => ({ ...page, loading }), [page, loading]);

    return (
        <SpaContext.Provider value={context}>
            {children({ PageComponent, page, loading, navigationError })}
        </SpaContext.Provider>
    );
}

export function usePage() {
    const page = useContext(SpaContext);
    if (!page) throw new Error('usePage must be used inside SpaProvider.');
    return page;
}

export function Head({ title }) {
    const { props } = usePage();
    useEffect(() => {
        if (!title) return;
        const translations = props?.translations || {};
        const translated = translations[title] || title;
        const appName = props?.settings?.invoice?.pharmacy_name || 'Pharmacy POS';
        document.title = `${translated} - ${appName}`;
    }, [title, props]);
    return null;
}

export const Link = forwardRef(function Link({
    href,
    method = 'get',
    as = 'a',
    data = {},
    replace = false,
    preserveScroll = false,
    preserveState = false,
    onClick,
    children,
    ...props
}, ref) {
    const tag = as === 'button' || method.toLowerCase() !== 'get' ? as : 'a';
    const handleClick = (event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const destination = new URL(href, window.location.href);
        if (tag === 'a' && (
            event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
            props.target === '_blank' || destination.origin !== window.location.origin
        )) return;
        event.preventDefault();
        router.visit(href, { method, data, replace, preserveScroll, preserveState });
    };
    const linkProps = tag === 'a' ? { href } : { type: props.type || 'button' };
    return React.createElement(tag, { ...props, ...linkProps, ref, onClick: handleClick }, children);
});

export function useForm(initialData = {}) {
    const defaults = useRef(initialData);
    const [data, setDataState] = useState(initialData);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const transformRef = useRef((value) => value);
    const successTimer = useRef(null);

    const setData = useCallback((key, value) => {
        if (typeof key === 'function') setDataState(key);
        else if (typeof key === 'object') setDataState(key);
        else setDataState((current) => ({ ...current, [key]: value }));
    }, []);

    const submit = useCallback((method, url, options = {}) => {
        setProcessing(true);
        setErrors({});
        const submittedData = options.data || transformRef.current(data);
        return router.visit(url, {
            ...options,
            method,
            data: submittedData,
            onSuccess: (page) => {
                setRecentlySuccessful(true);
                window.clearTimeout(successTimer.current);
                successTimer.current = window.setTimeout(() => setRecentlySuccessful(false), 2000);
                options.onSuccess?.(page);
            },
            onError: (nextErrors) => {
                setErrors(nextErrors || {});
                options.onError?.(nextErrors || {});
            },
            onFinish: () => {
                setProcessing(false);
                options.onFinish?.();
            },
        });
    }, [data]);

    const reset = useCallback((...fields) => {
        if (!fields.length) {
            setDataState(defaults.current);
            return;
        }
        setDataState((current) => {
            const next = { ...current };
            fields.forEach((field) => { next[field] = defaults.current[field]; });
            return next;
        });
    }, []);

    const clearErrors = useCallback((...fields) => {
        if (!fields.length) setErrors({});
        else setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !fields.includes(key))));
    }, []);

    return {
        data,
        setData,
        errors,
        setError: (key, value) => setErrors((current) => ({ ...current, [key]: value })),
        clearErrors,
        processing,
        progress: null,
        recentlySuccessful,
        isDirty: JSON.stringify(data) !== JSON.stringify(defaults.current),
        transform: (callback) => { transformRef.current = callback; },
        reset,
        submit,
        get: (url, options) => submit('get', url, options),
        post: (url, options) => submit('post', url, options),
        put: (url, options) => submit('put', url, options),
        patch: (url, options) => submit('patch', url, options),
        delete: (url, options) => submit('delete', url, options),
    };
}
