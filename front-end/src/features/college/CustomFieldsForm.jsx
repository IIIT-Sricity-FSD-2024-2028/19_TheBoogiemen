import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation } from '../../hooks/useMutation';

const TYPES = [
  ['text', 'Text'],
  ['number', 'Number'],
  ['date', 'Date'],
  ['select', 'Choice list'],
  ['phone', 'Phone'],
  ['email', 'Email'],
];

/** Extra profile fields collected for students or faculty (PUT /college/settings/custom-fields). */
export default function CustomFieldsForm({ config, canEdit = true, onSaved, submitLabel = 'Save custom fields' }) {
  const [fields, setFields] = useState(() =>
    (config?.settings?.custom_fields || []).map((f) => ({ ...f, _id: f.key, options: (f.options || []).join(', ') }))
  );
  const [touched, setTouched] = useState(false);
  const [save, { loading, error, status }] = useMutation();

  const errors = [];
  if (fields.length > 20) errors.push('At most 20 custom fields.');
  const labels = new Set();
  fields.forEach((f, i) => {
    const label = f.label.trim();
    if (!label) errors.push(`Field ${i + 1} needs a label.`);
    const k = label.toLowerCase();
    if (label && labels.has(k)) errors.push(`"${label}" is listed twice.`);
    labels.add(k);
    if (f.type === 'select' && f.options.split(',').map((o) => o.trim()).filter(Boolean).length < 2) errors.push(`"${label || i + 1}" needs at least two options.`);
  });

  const update = (i, key, value) => setFields((xs) => xs.map((x, j) => (j === i ? { ...x, [key]: value } : x)));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (errors.length) return;
    const body = {
      custom_fields: fields.map((f) => ({
        ...(f.key ? { key: f.key } : {}),
        label: f.label.trim(),
        type: f.type,
        options: f.type === 'select' ? f.options.split(',').map((o) => o.trim()).filter(Boolean) : [],
        required: !!f.required,
        applies_to: f.applies_to,
      })),
    };
    const res = await save('put', '/college/settings/custom-fields', body, { label: 'Updated custom fields' });
    if (res.ok) {
      setFields((res.data.settings?.custom_fields || []).map((f) => ({ ...f, _id: f.key, options: (f.options || []).join(', ') })));
      onSaved?.(res.data);
    }
  };

  return (
    <form className="sp-form" onSubmit={submit} noValidate>
      <p className="sp-muted" style={{ margin: 0 }}>
        Extra details your college records, such as admission category or parent phone. They appear on the add-person form and as CSV import columns.
      </p>
      <div className="cl-list-editor">
        {fields.length === 0 && <p className="sp-muted" style={{ margin: 0 }}>No custom fields. This step is optional.</p>}
        {fields.map((f, i) => (
          <div key={f._id} className="cl-list-row is-field">
            <div className="sp-field">
              <label htmlFor={`cf-l-${i}`}>Label</label>
              <input id={`cf-l-${i}`} className="sp-input" value={f.label} maxLength={60} disabled={!canEdit} onChange={(e) => update(i, 'label', e.target.value)} />
              {f.key && <p className="sp-hint">CSV column: <span className="sp-code">{f.key}</span></p>}
            </div>
            <div className="sp-field">
              <label htmlFor={`cf-t-${i}`}>Type</label>
              <select id={`cf-t-${i}`} className="sp-select" value={f.type} disabled={!canEdit} onChange={(e) => update(i, 'type', e.target.value)}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="sp-field">
              <label htmlFor={`cf-a-${i}`}>For</label>
              <select id={`cf-a-${i}`} className="sp-select" value={f.applies_to} disabled={!canEdit} onChange={(e) => update(i, 'applies_to', e.target.value)}>
                <option value="student">Students</option>
                <option value="faculty">Faculty and staff</option>
              </select>
            </div>
            <div className="sp-field">
              <label htmlFor={`cf-o-${i}`}>Options</label>
              <input id={`cf-o-${i}`} className="sp-input" value={f.options} disabled={!canEdit || f.type !== 'select'}
                placeholder={f.type === 'select' ? 'Comma separated' : 'Only for choice lists'} onChange={(e) => update(i, 'options', e.target.value)} />
            </div>
            <label className="sp-checkbox" style={{ alignSelf: 'center' }}>
              <input type="checkbox" checked={!!f.required} disabled={!canEdit} onChange={(e) => update(i, 'required', e.target.checked)} /> Required
            </label>
            {canEdit ? (
              <button type="button" className="sp-icon-btn" aria-label={`Remove ${f.label || `field ${i + 1}`}`} onClick={() => setFields((xs) => xs.filter((_, j) => j !== i))}>
                <Trash2 size={15} />
              </button>
            ) : <span />}
          </div>
        ))}
      </div>
      {canEdit && (
        <div>
          <button type="button" className="sp-btn is-secondary is-small" disabled={fields.length >= 20}
            onClick={() => setFields((xs) => [...xs, { _id: `n${Date.now()}`, key: '', label: '', type: 'text', options: '', required: false, applies_to: 'student' }])}>
            <Plus size={14} /> Add field
          </button>
        </div>
      )}
      {fields.some((f) => f.key) && canEdit && (
        <p className="sp-hint" style={{ margin: 0 }}>Removing a field hides it from forms; values already saved on people are kept.</p>
      )}
      {touched && errors.length > 0 && (
        <div className="sp-alert is-error" role="alert"><ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map((m) => <li key={m}>{m}</li>)}</ul></div>
      )}
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
