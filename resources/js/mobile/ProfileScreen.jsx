import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api';
import Icon from './Icons';
import { getPendingSales, keys, saveJson } from './storage';
import { Modal, formatDate, money } from './Ui';
import LocaleSelect from './LocaleSelect';

export default function ProfileScreen({ token, profile, setProfile, online, install, notify, onLogout }) {
    const [form, setForm] = useState({ name: profile.name || '', email: profile.email || '', phone: profile.phone || '', image: null });
    const [preview, setPreview] = useState(profile.image_url || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [password, setPassword] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [branches, setBranches] = useState([]);
    const [session, setSession] = useState(null);
    const [branchBusy, setBranchBusy] = useState(false);
    const [currency, setCurrency] = useState('$');
    const pendingCount = getPendingSales().length;

    const initials = useMemo(() => profile.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(), [profile.name]);

    useEffect(() => {
        if (!online) return;
        Promise.all([
            apiRequest('/account/branches', { token }),
            apiRequest('/cashier/sessions/active', { token }),
            apiRequest('/cashier/receipt-settings', { token }),
        ]).then(([branchResult, activeSession, settings]) => {
            setBranches(branchResult.branches || []);
            setSession(activeSession);
            setCurrency(settings.currency_symbol || '$');
        }).catch((requestError) => setError(requestError.message));
    }, [online, token]);

    useEffect(() => () => {
        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    }, [preview]);

    const chooseImage = (event) => {
        const image = event.target.files?.[0];
        if (!image) return;
        if (image.size > 250 * 1024) {
            setError('Profile photo must be 250 KB or smaller.');
            return;
        }
        setError('');
        setForm((current) => ({ ...current, image }));
        setPreview(URL.createObjectURL(image));
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        if (!online) return setError('Connect to update your profile.');
        setSaving(true);
        setError('');
        const body = new FormData();
        body.append('_method', 'PUT');
        body.append('name', form.name);
        body.append('email', form.email);
        body.append('phone', form.phone);
        if (form.image) body.append('image', form.image);
        try {
            const result = await apiRequest('/account/profile', { token, method: 'POST', body });
            setProfile(result.user);
            saveJson(keys.profile, result.user);
            setForm((current) => ({ ...current, image: null }));
            setPreview(result.user.image_url || '');
            notify('Profile updated.');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    };

    const savePassword = async (event) => {
        event.preventDefault();
        if (password.password !== password.password_confirmation) return setError('New password confirmation does not match.');
        setSaving(true);
        setError('');
        try {
            await apiRequest('/account/password', { token, method: 'POST', json: password });
            setPassword({ current_password: '', password: '', password_confirmation: '' });
            setPasswordOpen(false);
            notify('Password updated.');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    };

    const switchBranch = async (branchId) => {
        if (String(branchId) === String(profile.current_branch_id)) return;
        if (session) return setError('Close your active shift before switching branches.');
        if (!online) return setError('Connect to switch branches.');
        setBranchBusy(true);
        setError('');
        try {
            await apiRequest('/account/branches/switch', { token, method: 'POST', json: { branch_id: branchId } });
            const nextProfile = await apiRequest('/account/profile', { token });
            setProfile(nextProfile);
            saveJson(keys.profile, nextProfile);
            notify(`Switched to ${nextProfile.active_branch?.name || 'branch'}.`);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBranchBusy(false);
        }
    };

    return (
        <main className="profile-screen">
            {error && <div className="form-alert form-alert--page" role="alert">{error}<button type="button" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}

            <section className="profile-card">
                <label className="avatar-editor">
                    {preview ? <img src={preview} alt="Profile" /> : <span>{initials || 'C'}</span>}
                    <i><Icon name="camera" size={17} /></i>
                    <input type="file" accept="image/jpeg,image/png,image/gif" capture="user" onChange={chooseImage} />
                </label>
                <div><h2>{profile.name}</h2><p>{profile.email}</p><span>Cashier · {profile.active_branch?.name || profile.assigned_branch?.name || 'Unassigned'}</span></div>
            </section>

            <section className="settings-card">
                <div className="settings-card__title"><span><Icon name="user" size={19} /></span><div><h2>Personal details</h2><p>Keep your cashier account up to date</p></div></div>
                <form className="form-stack" onSubmit={saveProfile}>
                    <label className="field"><span>Full name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
                    <label className="field"><span>Email address</span><input type="email" inputMode="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
                    <label className="field"><span>Phone number <i>optional</i></span><input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                    <button className="button button--primary button--full" type="submit" disabled={saving || !online}>{saving ? 'Saving…' : 'Save profile'}</button>
                </form>
                <button className="settings-row" type="button" onClick={() => { setError(''); setPasswordOpen(true); }}><span className="settings-row__icon"><Icon name="lock" size={19} /></span><span><strong>Change password</strong><small>Update account security</small></span><Icon name="chevron" size={18} /></button>
            </section>

            <section className="settings-card">
                <div className="settings-card__title"><span><Icon name="store" size={19} /></span><div><h2>Register & branch</h2><p>Your current sales location</p></div></div>
                {branches.length > 1 ? (
                    <label className="field"><span>Active branch</span><select value={profile.current_branch_id || ''} onChange={(event) => switchBranch(event.target.value)} disabled={branchBusy || Boolean(session)}>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select>{session && <small>Close the current shift before switching.</small>}</label>
                ) : <div className="branch-summary"><span className="customer-initial"><Icon name="store" size={19} /></span><span><strong>{profile.active_branch?.name || profile.assigned_branch?.name || 'No branch assigned'}</strong><small>{profile.active_branch?.address || profile.assigned_branch?.address || 'Ask an administrator to assign a branch.'}</small></span></div>}
                {session ? <div className="active-session-card"><span><i className="status-dot status-dot--online" /> Shift open</span><strong>{money(session.total_sales, currency)} sales</strong><small>Opened {formatDate(session.opened_at)}</small></div> : <div className="active-session-card active-session-card--closed"><span><i className="status-dot" /> No active shift</span><small>Open a shift from the Sale screen.</small></div>}
            </section>

            <section className="settings-card">
                <div className="settings-card__title"><span><Icon name="language" size={19} /></span><div><h2>Language</h2><p>Cashier display language</p></div></div>
                <LocaleSelect onError={setError} />
            </section>

            <section className="settings-card">
                <div className="settings-card__title"><span><Icon name="download" size={19} /></span><div><h2>Installed app</h2><p>Fast access from your home screen</p></div></div>
                {install.standalone ? <div className="installed-state"><Icon name="check" size={19} /> This app is installed on your device.</div> : install.canInstall ? <button className="button button--soft button--full" type="button" onClick={install.install}><Icon name="download" size={18} /> Install Cashier POS</button> : <p className="install-help">Open your browser menu and choose <strong>Add to Home Screen</strong> to install this cashier app.</p>}
                {pendingCount > 0 && <div className="pending-summary"><Icon name="sync" size={18} /><span><strong>{pendingCount} sale{pendingCount === 1 ? '' : 's'} waiting to sync</strong><small>Do not clear browser data until synchronization finishes.</small></span></div>}
            </section>

            <button className="button button--logout button--full" type="button" onClick={onLogout}><Icon name="logout" size={19} /> Sign out</button>
            <p className="version-note">Cashier PWA · secure mobile workspace</p>

            <Modal
                open={passwordOpen}
                title="Change password"
                onClose={() => !saving && setPasswordOpen(false)}
                footer={<><button className="button button--ghost" type="button" onClick={() => setPasswordOpen(false)} disabled={saving}>Cancel</button><button className="button button--primary" type="submit" form="password-form" disabled={saving || !online}>{saving ? 'Updating…' : 'Update password'}</button></>}
            >
                <form id="password-form" className="form-stack" onSubmit={savePassword}>
                    <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={password.current_password} onChange={(event) => setPassword({ ...password, current_password: event.target.value })} required /></label>
                    <label className="field"><span>New password</span><input type="password" autoComplete="new-password" value={password.password} onChange={(event) => setPassword({ ...password, password: event.target.value })} required /></label>
                    <label className="field"><span>Confirm new password</span><input type="password" autoComplete="new-password" value={password.password_confirmation} onChange={(event) => setPassword({ ...password, password_confirmation: event.target.value })} required /></label>
                    {error && <div className="form-alert">{error}</div>}
                </form>
            </Modal>
        </main>
    );
}
