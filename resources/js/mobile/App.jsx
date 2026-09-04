import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiRequest, config } from './api';
import { keys, loadJson, saveJson } from './storage';
import Icon from './Icons';
import SalesScreen from './SalesScreen';
import HistoryScreen from './HistoryScreen';
import ProfileScreen from './ProfileScreen';

const ROUTES = ['sale', 'history', 'profile'];

function useNetworkStatus() {
    const [online, setOnline] = useState(navigator.onLine);
    useEffect(() => {
        const connected = () => setOnline(true);
        const disconnected = () => setOnline(false);
        window.addEventListener('online', connected);
        window.addEventListener('offline', disconnected);
        return () => {
            window.removeEventListener('online', connected);
            window.removeEventListener('offline', disconnected);
        };
    }, []);
    return online;
}

function useInstallPrompt() {
    const [prompt, setPrompt] = useState(null);
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;

    useEffect(() => {
        const handler = (event) => {
            event.preventDefault();
            setPrompt(event);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const install = useCallback(async () => {
        if (!prompt) return false;
        await prompt.prompt();
        const result = await prompt.userChoice;
        setPrompt(null);
        return result.outcome === 'accepted';
    }, [prompt]);

    return { canInstall: Boolean(prompt) && !standalone, standalone: Boolean(standalone), install };
}

function Toast({ toast, onClose }) {
    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(onClose, 4200);
        return () => window.clearTimeout(timer);
    }, [toast, onClose]);

    if (!toast) return null;
    return (
        <div className={`toast toast--${toast.type || 'info'}`} role="status">
            <Icon name={toast.type === 'error' ? 'close' : 'check'} size={18} />
            <span>{toast.message}</span>
            <button type="button" onClick={onClose} aria-label="Dismiss"><Icon name="close" size={16} /></button>
        </div>
    );
}

function PullToRefresh({ onRefresh, children }) {
    const [distance, setDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const startY = React.useRef(null);
    const armed = distance >= 66;

    const start = (event) => {
        if (window.scrollY <= 0 && !document.body.classList.contains('modal-open')) startY.current = event.touches[0]?.clientY ?? null;
    };
    const move = (event) => {
        if (startY.current === null || refreshing) return;
        const delta = (event.touches[0]?.clientY ?? startY.current) - startY.current;
        setDistance(delta > 0 ? Math.min(92, delta * 0.46) : 0);
    };
    const end = async () => {
        if (startY.current === null) return;
        startY.current = null;
        if (!armed || refreshing) return setDistance(0);
        setRefreshing(true);
        setDistance(54);
        try { await onRefresh(); }
        finally { setRefreshing(false); setDistance(0); }
    };

    return (
        <div className={`pull-refresh ${refreshing ? 'pull-refresh--refreshing' : ''}`} style={{ '--pull-distance': `${distance}px` }} onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}>
            <div className="pull-refresh__indicator" role="status" aria-live="polite"><Icon name="sync" size={20} /><span>{refreshing ? 'Refreshing…' : armed ? 'Release to refresh' : 'Pull to refresh'}</span></div>
            <div className="pull-refresh__content">{children}</div>
        </div>
    );
}

function Login({ onLogin, online, install }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        if (!online) {
            setError('Connect to the internet to sign in.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await apiRequest('/login', {
                method: 'POST',
                json: { email, password, device_name: 'Cashier PWA' },
            });
            await onLogin(result.token);
        } catch (requestError) {
            setError(requestError.message || 'Unable to sign in.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-page">
            <section className="login-card">
                <div className="brand-lockup">
                    <span className="brand-mark"><Icon name="cash" size={30} strokeWidth={1.8} /></span>
                    <span><strong>{config.appName || 'Pharmacy POS'}</strong><small>Cashier mobile</small></span>
                </div>

                <div className="login-intro">
                    <span className="eyebrow">SECURE WORKSPACE</span>
                    <h1>Ready for your shift?</h1>
                    <p>Sign in to start sales, review receipts, and manage your cashier profile.</p>
                </div>

                {!online && <div className="offline-callout"><Icon name="wifiOff" size={18} /> You are offline</div>}
                {error && <div className="form-alert" role="alert">{error}</div>}

                <form onSubmit={submit} className="form-stack">
                    <label className="field">
                        <span>Email address</span>
                        <input type="email" inputMode="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cashier@example.com" required autoFocus />
                    </label>
                    <label className="field">
                        <span>Password</span>
                        <span className="input-action-wrap">
                            <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
                            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name="eye" size={20} /></button>
                        </span>
                    </label>
                    <button className="button button--primary button--large" type="submit" disabled={loading || !online}>
                        {loading ? <span className="spinner" /> : <Icon name="lock" size={19} />}
                        {loading ? 'Signing in…' : 'Sign in securely'}
                    </button>
                </form>

                {install.canInstall && (
                    <button className="install-link" type="button" onClick={install.install}>
                        <Icon name="download" size={18} /> Install this app on your device
                    </button>
                )}
                <p className="login-footnote">Only authorized cashier accounts with sale permission can continue.</p>
            </section>
        </main>
    );
}

function Splash() {
    return (
        <main className="splash" aria-label="Loading cashier app">
            <span className="brand-mark brand-mark--large"><Icon name="cash" size={40} /></span>
            <div className="spinner spinner--brand" />
            <strong>Preparing your register…</strong>
        </main>
    );
}

function AuthenticatedApp({ token, profile, setProfile, online, install, onLogout }) {
    const initialRoute = window.location.hash.replace('#', '') || 'sale';
    const [route, setRoute] = useState(ROUTES.includes(initialRoute) ? initialRoute : 'sale');
    const [toast, setToast] = useState(null);
    const [pendingCount, setPendingCount] = useState(() => loadJson(keys.pendingSales, []).length);
    const [salePriceMode, setSalePriceMode] = useState('retail');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const onHash = () => {
            const next = window.location.hash.replace('#', '') || 'sale';
            setRoute(ROUTES.includes(next) ? next : 'sale');
        };
        const onPending = (event) => setPendingCount((event.detail || []).length);
        window.addEventListener('hashchange', onHash);
        window.addEventListener('cashier:pending-sales', onPending);
        return () => {
            window.removeEventListener('hashchange', onHash);
            window.removeEventListener('cashier:pending-sales', onPending);
        };
    }, []);

    const navigate = (next) => {
        window.location.hash = next;
        setRoute(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const notify = useCallback((message, type = 'success') => setToast({ message, type, id: Date.now() }), []);
    const branchName = profile.active_branch?.name || profile.assigned_branch?.name || 'No branch';
    const refreshPage = useCallback(async () => {
        if (online) {
            try {
                const nextProfile = await apiRequest('/account/profile', { token });
                setProfile(nextProfile);
                saveJson(keys.profile, nextProfile);
            } catch (error) {
                notify(error.message || 'Refresh failed.', 'error');
                return;
            }
        }
        setPendingCount(loadJson(keys.pendingSales, []).length);
        setSalePriceMode('retail');
        setRefreshKey((value) => value + 1);
        notify(online ? 'Page refreshed.' : 'Offline data refreshed.', 'info');
    }, [notify, online, setProfile, token]);

    return (
        <div className="app-shell">
            <header className="app-header">
                <div>
                    <span className="app-header__label">{route === 'sale' ? 'POINT OF SALE' : route.toUpperCase()}</span>
                    <h1>
                        {route === 'sale' ? 'New sale' : route === 'history' ? 'Sale history' : 'My profile'}
                        {route === 'sale' && salePriceMode === 'wholesale' && <span className="header-mode-alert" role="status">Wholesale</span>}
                    </h1>
                </div>
                <div className="header-branch" title={branchName}>
                    <Icon name="store" size={17} />
                    <span>{branchName}</span>
                    <i className={online ? 'status-dot status-dot--online' : 'status-dot'} />
                </div>
            </header>

            <PullToRefresh onRefresh={refreshPage}>
            {!online && (
                <div className="network-banner">
                    <Icon name="wifiOff" size={17} /> Offline mode — completed sales will wait safely on this device.
                </div>
            )}

            <div className="screen-area" key={`${route}-${refreshKey}`}>
                {route === 'sale' && <SalesScreen token={token} profile={profile} online={online} notify={notify} navigate={navigate} onPriceModeChange={setSalePriceMode} />}
                {route === 'history' && <HistoryScreen token={token} online={online} notify={notify} />}
                {route === 'profile' && <ProfileScreen token={token} profile={profile} setProfile={setProfile} online={online} install={install} notify={notify} onLogout={onLogout} />}
            </div>
            </PullToRefresh>

            <nav className="bottom-nav" aria-label="Cashier navigation">
                <button type="button" className={route === 'sale' ? 'active' : ''} onClick={() => navigate('sale')}><Icon name="cart" /><span>Sale</span></button>
                <button type="button" className={route === 'history' ? 'active' : ''} onClick={() => navigate('history')}>
                    <span className="nav-icon-wrap"><Icon name="history" />{pendingCount > 0 && <b>{pendingCount > 9 ? '9+' : pendingCount}</b>}</span><span>History</span>
                </button>
                <button type="button" className={route === 'profile' ? 'active' : ''} onClick={() => navigate('profile')}><Icon name="user" /><span>Profile</span></button>
            </nav>
            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}

export default function App() {
    const online = useNetworkStatus();
    const install = useInstallPrompt();
    const [token, setToken] = useState(() => localStorage.getItem(keys.token) || '');
    const [profile, setProfile] = useState(() => loadJson(keys.profile, null));
    const [booting, setBooting] = useState(Boolean(token));
    const [fatalError, setFatalError] = useState('');

    const bootstrap = useCallback(async (activeToken) => {
        setBooting(true);
        setFatalError('');
        try {
            const [nextProfile, access] = await Promise.all([
                apiRequest('/account/profile', { token: activeToken }),
                apiRequest('/user/access', { token: activeToken }),
            ]);
            if (!access.permission_slugs?.includes('process_sale')) {
                try { await apiRequest('/logout', { token: activeToken, method: 'POST' }); } catch { /* token cleanup below */ }
                localStorage.removeItem(keys.token);
                setToken('');
                setProfile(null);
                throw new ApiError('This account does not have permission to process sales.', 403);
            }
            saveJson(keys.profile, nextProfile);
            setProfile(nextProfile);
            setToken(activeToken);
            localStorage.setItem(keys.token, activeToken);
        } catch (error) {
            if (error.status === 401) {
                localStorage.removeItem(keys.token);
                setToken('');
                setProfile(null);
            } else if (!navigator.onLine && profile) {
                setToken(activeToken);
            } else {
                setFatalError(error.message || 'Unable to open the cashier app.');
                if (!profile) {
                    localStorage.removeItem(keys.token);
                    setToken('');
                }
            }
        } finally {
            setBooting(false);
        }
    }, [profile]);

    useEffect(() => {
        if (token) bootstrap(token);
        else setBooting(false);
        // Token validation is intentionally only performed on mount/login.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const logout = async () => {
        if (online) {
            try { await apiRequest('/logout', { token, method: 'POST' }); } catch { /* local logout must still work */ }
        }
        localStorage.removeItem(keys.token);
        localStorage.removeItem(keys.profile);
        setToken('');
        setProfile(null);
        window.location.hash = '';
    };

    if (booting) return <Splash />;
    if (!token || !profile) {
        return (
            <>
                {fatalError && <div className="standalone-alert">{fatalError}</div>}
                <Login onLogin={bootstrap} online={online} install={install} />
            </>
        );
    }

    return <AuthenticatedApp token={token} profile={profile} setProfile={setProfile} online={online} install={install} onLogout={logout} />;
}
