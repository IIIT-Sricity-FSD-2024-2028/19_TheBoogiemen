import React, { useState } from 'react';
import { useMutation } from '../../hooks/useMutation';

/** College profile and short code (PUT /college/settings/profile). */
export default function ProfileForm({ config, canEdit = true, onSaved, submitLabel = 'Save profile' }) {
  const college = config?.college || {};
  const [form, setForm] = useState({
    name: college.name || '',
    code: college.code || '',
    city: college.city || '',
    state: college.state || '',
    type: college.type || '',
  });
  const [touched, setTouched] = useState(false);
  const [save, { loading, error, status }] = useMutation();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const errors = {};
  if (!form.name.trim()) errors.name = 'College name is required.';
  if (!/^[A-Za-z0-9]{2,10}$/.test(form.code.trim())) errors.code = 'Use 2-10 letters or digits.';

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    const body = { name: form.name.trim(), code: form.code.trim().toUpperCase(), city: form.city.trim(), state: form.state.trim() };
    if (form.type) body.type = form.type;
    const res = await save('put', '/college/settings/profile', body, { label: 'Updated college profile' });
    if (res.ok) onSaved?.(res.data);
  };

  const show = (k) => (touched ? errors[k] : null);

  return (
    <form className="sp-form" onSubmit={submit} noValidate>
      <div className="sp-form-row">
        <div className="sp-field">
          <label htmlFor="cp-name">College name *</label>
          <input id="cp-name" className="sp-input" value={form.name} onChange={set('name')} disabled={!canEdit} aria-invalid={!!show('name')} />
          {show('name') && <p className="sp-field-error">{show('name')}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="cp-code">College code *</label>
          <input id="cp-code" className="sp-input" value={form.code} onChange={set('code')} disabled={!canEdit} aria-invalid={!!show('code')} maxLength={10} style={{ textTransform: 'uppercase' }} />
          {show('code') ? <p className="sp-field-error">{show('code')}</p> : <p className="sp-hint">Short unique code used in IDs and reports, e.g. DIT.</p>}
        </div>
      </div>
      <div className="sp-form-row">
        <div className="sp-field">
          <label htmlFor="cp-city">City</label>
          <input id="cp-city" className="sp-input" value={form.city} onChange={set('city')} disabled={!canEdit} />
        </div>
        <div className="sp-field">
          <label htmlFor="cp-state">State</label>
          <input id="cp-state" className="sp-input" value={form.state} onChange={set('state')} disabled={!canEdit} />
        </div>
        <div className="sp-field">
          <label htmlFor="cp-type">Type</label>
          <select id="cp-type" className="sp-select" value={form.type} onChange={set('type')} disabled={!canEdit}>
            <option value="">Not set</option>
            <option value="government">Government</option>
            <option value="private">Private</option>
            <option value="deemed">Deemed university</option>
          </select>
        </div>
      </div>
      {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      {canEdit && (
        <div className="cl-form-actions">
          <button type="submit" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : submitLabel}</button>
          {status === 'succeeded' && <span className="sp-hint" role="status">Saved.</span>}
        </div>
      )}
    </form>
  );
}
