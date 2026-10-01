import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { profileUpdated, selectCurrentUser } from '../auth/authSlice';
import { api } from '../../services/apiClient';
import { apiRequestFailed } from '../../app/apiActions';
import { useMutation } from '../../hooks/useMutation';
import { roleLabel } from '../../app/roleRoutes';
import { displayValue, formatUserId } from '../../shared/format';
import Avatar from '../../shared/ui/Avatar';
import ChangePasswordForm from './ChangePasswordForm';

const PHONE = /^[0-9+\-\s]{7,15}$/;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function PhotoCard({ user }) {
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const [saveProfile] = useMutation();
  const [state, setState] = useState({ busy: false, error: null, success: null });
  const [version, setVersion] = useState(0);

  const upload = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setState({ busy: false, error: 'Choose a JPG or PNG image.', success: null });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setState({ busy: false, error: 'The image must be smaller than 5 MB.', success: null });
      return;
    }
    setState({ busy: true, error: null, success: null });
    try {
      const uploaded = await api.upload(file, 'profile_photo');
      const fileId = uploaded?.file_id || uploaded?.data?.file_id;
      const result = await saveProfile('patch', '/auth/me', { photo_file_id: fileId }, { label: 'Updated profile photo' });
      if (!result.ok) throw result.error;
      dispatch(profileUpdated(result.data.user));
      setVersion((v) => v + 1);
      setState({ busy: false, error: null, success: 'Profile photo updated.' });
    } catch (err) {
      setState({ busy: false, error: err.message || 'Upload failed.', success: null });
      if (err.status !== undefined) dispatch(apiRequestFailed({ status: err.status, message: err.message, path: '/uploads', method: 'POST' }));
    }
  };

  const remove = async () => {
    setState({ busy: true, error: null, success: null });
    const result = await saveProfile('patch', '/auth/me', { photo_file_id: null }, { label: 'Removed profile photo' });
    if (result.ok) {
      dispatch(profileUpdated(result.data.user));
      setState({ busy: false, error: null, success: 'Profile photo removed.' });
    } else {
      setState({ busy: false, error: result.error.message, success: null });
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <Avatar user={user} large version={version} />
      <div style={{ display: 'grid', gap: 8 }}>
        <div className="sp-btn-row">
          <button type="button" className="sp-btn is-secondary is-small" disabled={state.busy} onClick={() => inputRef.current?.click()}>
            {state.busy ? 'Saving...' : user?.photo_file_id ? 'Change photo' : 'Upload photo'}
          </button>
          {user?.photo_file_id && (
            <button type="button" className="sp-btn is-secondary is-small" disabled={state.busy} onClick={remove}>Remove</button>
          )}
        </div>
        <p className="sp-hint">JPG or PNG, up to 5 MB.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="sp-visually-hidden"
          aria-label="Upload profile photo"
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {state.error && <p className="sp-field-error" role="alert">{state.error}</p>}
        {state.success && <p className="sp-hint" role="status" style={{ color: 'var(--sp-success)' }}>{state.success}</p>}
      </div>
    </div>
  );
}

function ContactForm({ user }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ phone: user?.phone || '', address: user?.address || '' });
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState(null);
  const [save, { loading, error }] = useMutation();

  useEffect(() => {
    setForm({ phone: user?.phone || '', address: user?.address || '' });
  }, [user?.phone, user?.address]);

  const phoneError = form.phone && !PHONE.test(form.phone.trim()) ? 'Phone must be 7-15 digits (spaces, + and - allowed).' : null;
  const addressError = form.address.length > 200 ? 'Address must be at most 200 characters.' : null;
  const dirty = form.phone !== (user?.phone || '') || form.address !== (user?.address || '');

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setMessage(null);
    if (phoneError || addressError) return;
    const result = await save('patch', '/auth/me', { phone: form.phone.trim(), address: form.address.trim() }, { label: 'Updated contact details' });
    if (result.ok) {
      dispatch(profileUpdated(result.data.user));
      setMessage('Contact details saved.');
      setSubmitted(false);
    }
  };

  return (
    <form className="sp-form" onSubmit={submit} noValidate>
      {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      {message && <div className="sp-alert is-success" role="status">{message}</div>}
      <div className="sp-field">
        <label htmlFor="acc-phone">Phone</label>
        <input id="acc-phone" type="tel" autoComplete="tel" className="sp-input" value={form.phone}
          aria-invalid={submitted && !!phoneError}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        {submitted && phoneError && <p className="sp-field-error">{phoneError}</p>}
      </div>
      <div className="sp-field">
        <label htmlFor="acc-address">Address</label>
        <textarea id="acc-address" autoComplete="street-address" className="sp-textarea" style={{ minHeight: 70 }} value={form.address}
          maxLength={200} aria-invalid={submitted && !!addressError}
          onChange={(e) => setForm({ ...form, address: e.target.value })} />
        {submitted && addressError && <p className="sp-field-error">{addressError}</p>}
      </div>
      <div className="sp-btn-row">
        <button type="submit" className="sp-btn" disabled={loading || !dirty}>{loading ? 'Saving...' : 'Save changes'}</button>
      </div>
    </form>
  );
}

/** "My Account" — available in every portal at <portal>/account. */
export default function AccountPage() {
  const user = useSelector(selectCurrentUser);
  const location = useLocation();
  const passwordRef = useRef(null);

  useEffect(() => {
    if (location.hash === '#password') passwordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">My Account</h1>
          <p className="sp-page-subtitle">Your profile photo, contact details and password.</p>
        </div>
      </div>

      <div className="sp-grid sp-grid-2" style={{ alignItems: 'start' }}>
        <section className="sp-card" aria-labelledby="acc-profile">
          <h2 id="acc-profile" className="sp-section-title">Profile</h2>
          <PhotoCard user={user} />
          <dl className="sp-details" style={{ marginTop: 20 }}>
            <div><dt>Name</dt><dd>{displayValue(user?.name)}</dd></div>
            <div><dt>ID</dt><dd>{formatUserId(user)}</dd></div>
            <div><dt>Email</dt><dd>{displayValue(user?.email)}</dd></div>
            <div><dt>Role</dt><dd>{roleLabel(user?.role)}</dd></div>
          </dl>
          <p className="sp-hint" style={{ marginTop: 12 }}>Name, email and role are managed by your institute. Contact your administrator to change them.</p>
        </section>

        <section className="sp-card" aria-labelledby="acc-contact">
          <h2 id="acc-contact" className="sp-section-title">Contact details</h2>
          <ContactForm user={user} />
        </section>

        <section className="sp-card" aria-labelledby="acc-password" id="password" ref={passwordRef}>
          <h2 id="acc-password" className="sp-section-title">Change password</h2>
          <ChangePasswordForm email={user?.email} />
        </section>
      </div>
    </>
  );
}
