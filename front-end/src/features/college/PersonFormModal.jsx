import React, { useMemo, useState } from 'react';
import Modal from '../../shared/ui/Modal';
import { useMutation } from '../../hooks/useMutation';
import {
  PERSON_EMAIL,
  PERSON_PHONE,
  ROLE_LABEL,
  customFieldsFor,
  grantableRoles,
  idKindForRole,
  isHodRole,
  needsDepartment,
} from './collegeShared';

function CustomFieldInput({ field, value, onChange, error, idPrefix }) {
  const id = `${idPrefix}-cf-${field.key}`;
  const common = { id, value: value ?? '', onChange: (e) => onChange(e.target.value), 'aria-invalid': !!error };
  return (
    <div className="sp-field">
      <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
      {field.type === 'select' ? (
        <select className="sp-select" {...common}>
          <option value="">Select</option>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          className="sp-input"
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
          {...common}
        />
      )}
      {error && <p className="sp-field-error">{error}</p>}
    </div>
  );
}

/**
 * Add a person (POST /college/people) or edit one (PATCH /college/people/:id).
 * `config` is the GET /college/settings response. On create the server
 * allocates the ID from the college's format and returns a one-time password.
 */
export default function PersonFormModal({ viewer, config, person, onClose, onSaved }) {
  const editing = !!person;
  const roles = grantableRoles(viewer.role);
  const settings = config?.settings || {};
  const departments = config?.departments || [];
  const hodViewer = isHodRole(viewer.role);

  const [form, setForm] = useState(() => ({
    role: person?.role || roles[roles.length - 1] || 'student',
    first_name: person?.first_name || '',
    last_name: person?.last_name || '',
    email: person?.email || '',
    phone: person?.phone || '',
    department_id: person?.department_id || (hodViewer ? viewer.department?.department_id || '' : ''),
    batch_id: person?.batch_id || '',
    section: person?.section || '',
    designation: person?.designation || '',
    display_id: '',
    custom_fields: { ...(person?.custom_fields || {}) },
  }));
  const [touched, setTouched] = useState(false);
  const [submit, { loading, error }] = useMutation();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const fields = customFieldsFor(settings, form.role);
  const kind = idKindForRole(form.role);
  const isStudent = form.role === 'student';

  const errors = useMemo(() => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required.';
    if (!editing && !PERSON_EMAIL.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (form.phone && !PERSON_PHONE.test(form.phone)) e.phone = 'Phone must be 7-15 digits.';
    if (!editing && !hodViewer && needsDepartment(form.role) && !form.department_id) e.department_id = 'Choose a department.';
    if (isStudent && !editing && !form.batch_id) e.batch_id = 'Choose a batch.';
    if (isStudent && !form.section) e.section = 'Choose a section.';
    fields.forEach((f) => {
      const v = form.custom_fields[f.key];
      const empty = v === undefined || v === null || String(v).trim() === '';
      if (f.required && empty) e[`cf_${f.key}`] = `${f.label} is required.`;
      else if (!empty && f.type === 'phone' && !PERSON_PHONE.test(String(v))) e[`cf_${f.key}`] = `${f.label} must be a phone number.`;
      else if (!empty && f.type === 'email' && !PERSON_EMAIL.test(String(v))) e[`cf_${f.key}`] = `${f.label} must be an email address.`;
    });
    return e;
  }, [form, editing, hodViewer, isStudent, fields]);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    const custom = Object.fromEntries(fields.map((f) => [f.key, form.custom_fields[f.key] ?? '']).filter(([, v]) => String(v).trim() !== ''));
    let res;
    if (editing) {
      const body = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        custom_fields: custom,
      };
      if (form.role !== 'student') body.designation = form.designation;
      if (isStudent) body.section = form.section;
      if (!hodViewer && form.department_id && form.department_id !== person.department_id) body.department_id = form.department_id;
      res = await submit('patch', `/college/people/${person.user_id}`, body, { label: `Updated ${form.first_name}` });
    } else {
      const body = {
        role: form.role,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        custom_fields: custom,
      };
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.department_id) body.department_id = form.department_id;
      if (isStudent) {
        body.batch_id = form.batch_id;
        body.section = form.section;
      } else if (form.designation.trim()) body.designation = form.designation.trim();
      if (form.display_id.trim()) body.display_id = form.display_id.trim();
      res = await submit('post', '/college/people', body, { label: `Added ${ROLE_LABEL[form.role] || 'person'} ${form.first_name}` });
    }
    if (res.ok) onSaved(res.data);
  };

  const show = (key) => (touched ? errors[key] : null);

  return (
    <Modal
      title={editing ? `Edit ${person.name}` : 'Add person'}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="person-form" className="sp-btn" disabled={loading}>
            {loading ? 'Saving...' : editing ? 'Save changes' : 'Add person'}
          </button>
        </>
      }
    >
      <form id="person-form" className="sp-form" onSubmit={onSubmit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="pf-role">Role</label>
            {editing ? (
              <input id="pf-role" className="sp-input" value={ROLE_LABEL[form.role] || form.role} disabled />
            ) : (
              <select id="pf-role" className="sp-select" value={form.role} onChange={set('role')}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            )}
          </div>
          {!hodViewer && (
            <div className="sp-field">
              <label htmlFor="pf-dept">Department{needsDepartment(form.role) ? ' *' : ' (optional)'}</label>
              <select id="pf-dept" className="sp-select" value={form.department_id} onChange={set('department_id')} aria-invalid={!!show('department_id')}>
                <option value="">{needsDepartment(form.role) ? 'Select a department' : 'None'}</option>
                {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_code} · {d.department_name}</option>)}
              </select>
              {show('department_id') && <p className="sp-field-error">{show('department_id')}</p>}
              {departments.length === 0 && <p className="sp-hint">No departments yet. Add one under Configuration first.</p>}
            </div>
          )}
        </div>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="pf-first">First name *</label>
            <input id="pf-first" className="sp-input" value={form.first_name} onChange={set('first_name')} aria-invalid={!!show('first_name')} autoComplete="off" />
            {show('first_name') && <p className="sp-field-error">{show('first_name')}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="pf-last">Last name</label>
            <input id="pf-last" className="sp-input" value={form.last_name} onChange={set('last_name')} autoComplete="off" />
          </div>
        </div>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="pf-email">Email{editing ? '' : ' *'}</label>
            <input id="pf-email" type="email" className="sp-input" value={form.email} onChange={set('email')} disabled={editing} aria-invalid={!!show('email')} autoComplete="off" />
            {show('email') && <p className="sp-field-error">{show('email')}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="pf-phone">Phone</label>
            <input id="pf-phone" type="tel" className="sp-input" value={form.phone} onChange={set('phone')} aria-invalid={!!show('phone')} autoComplete="off" />
            {show('phone') && <p className="sp-field-error">{show('phone')}</p>}
          </div>
        </div>

        {isStudent ? (
          <div className="sp-form-row">
            <div className="sp-field">
              <label htmlFor="pf-batch">Batch{editing ? '' : ' *'}</label>
              <select id="pf-batch" className="sp-select" value={form.batch_id} onChange={set('batch_id')} disabled={editing} aria-invalid={!!show('batch_id')}>
                <option value="">Select a batch</option>
                {(settings.batches || []).map((b) => {
                  const prog = (settings.programmes || []).find((p) => p.programme_id === b.programme_id);
                  return <option key={b.batch_id} value={b.batch_id}>{prog ? `${prog.code} ` : ''}{b.label}</option>;
                })}
              </select>
              {show('batch_id') && <p className="sp-field-error">{show('batch_id')}</p>}
              {!editing && !(settings.batches || []).length && <p className="sp-hint">No batches yet. Add programmes and batches under Configuration.</p>}
            </div>
            <div className="sp-field">
              <label htmlFor="pf-section">Section *</label>
              <select id="pf-section" className="sp-select" value={form.section} onChange={set('section')} aria-invalid={!!show('section')}>
                <option value="">Select</option>
                {(settings.sections || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {show('section') && <p className="sp-field-error">{show('section')}</p>}
            </div>
          </div>
        ) : (
          <div className="sp-field">
            <label htmlFor="pf-desig">Designation</label>
            <input id="pf-desig" className="sp-input" value={form.designation} onChange={set('designation')} placeholder={form.role === 'faculty' ? 'e.g. Assistant Professor' : ''} />
          </div>
        )}

        {!editing && (
          <div className="sp-field">
            <label htmlFor="pf-id">ID (optional)</label>
            <input id="pf-id" className="sp-input" value={form.display_id} onChange={set('display_id')} autoComplete="off"
              placeholder={config?.previews?.[kind] ? `e.g. ${config.previews[kind]}` : ''} />
            <p className="sp-hint">Leave blank and the next ID is allocated from your {kind} ID format. A typed ID must match that format.</p>
          </div>
        )}

        {fields.length > 0 && (
          <fieldset className="sp-form" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sp-section-title" style={{ fontSize: 14, marginBottom: 8 }}>Additional details</legend>
            <div className="sp-form-row">
              {fields.map((f) => (
                <CustomFieldInput
                  key={f.key}
                  idPrefix="pf"
                  field={f}
                  value={form.custom_fields[f.key]}
                  error={show(`cf_${f.key}`)}
                  onChange={(v) => setForm((s) => ({ ...s, custom_fields: { ...s.custom_fields, [f.key]: v } }))}
                />
              ))}
            </div>
          </fieldset>
        )}
      </form>
    </Modal>
  );
}
