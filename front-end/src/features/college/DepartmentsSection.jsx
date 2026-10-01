import React, { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import Modal from '../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import './college.css';

function EditDepartment({ dept, onClose, onSaved }) {
  const hods = useApiResource(`/college/people?role=hod&department_id=${encodeURIComponent(dept.department_id)}&status=active`);
  const [form, setForm] = useState({ name: dept.department_name, hod_user_id: dept.hod_user_id || '' });
  const [save, { loading, error }] = useMutation();
  const nameError = !form.name.trim() ? 'Department name is required.' : null;

  const submit = async (e) => {
    e.preventDefault();
    if (nameError) return;
    const res = await save('patch', `/college/departments/${dept.department_id}`, { name: form.name.trim(), hod_user_id: form.hod_user_id || null }, { label: `Updated department ${dept.department_code}` });
    if (res.ok) onSaved();
  };

  return (
    <Modal
      title={`Edit ${dept.department_code}`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="dept-edit" className="sp-btn" disabled={loading || !!nameError}>{loading ? 'Saving...' : 'Save'}</button>
        </>
      }
    >
      <form id="dept-edit" className="sp-form" onSubmit={submit} noValidate>
        <div className="sp-field">
          <label htmlFor="de-name">Name</label>
          <input id="de-name" className="sp-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-invalid={!!nameError} />
          {nameError && <p className="sp-field-error">{nameError}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="de-hod">Head of department</label>
          {hods.status === 'loading' ? (
            <div className="sp-skeleton" style={{ height: 38 }} />
          ) : hods.status === 'failed' ? (
            <ErrorState error={hods.error} onRetry={hods.reload} />
          ) : (
            <>
              <select id="de-hod" className="sp-select" value={form.hod_user_id} onChange={(e) => setForm((f) => ({ ...f, hod_user_id: e.target.value }))}>
                <option value="">No HOD assigned</option>
                {(hods.data || []).map((h) => <option key={h.user_id} value={h.user_id}>{h.name}{h.display_id ? ` (${h.display_id})` : ''}</option>)}
              </select>
              {!(hods.data || []).length && <p className="sp-hint">No HOD accounts in this department. Add one under People with the Head of Department role.</p>}
            </>
          )}
        </div>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      </form>
    </Modal>
  );
}

/** Departments list, add and edit (GET/POST /college/departments, PATCH /college/departments/:id). */
export default function DepartmentsSection({ canEdit = true, onChanged } = {}) {
  const depts = useApiResource('/college/departments');
  const [form, setForm] = useState({ code: '', name: '' });
  const [touched, setTouched] = useState(false);
  const [editing, setEditing] = useState(null);
  const [create, { loading, error, reset }] = useMutation();

  const errors = {};
  if (!/^[A-Za-z0-9]{2,8}$/.test(form.code.trim())) errors.code = 'Use 2-8 letters or digits, e.g. CSE.';
  if (!form.name.trim()) errors.name = 'Department name is required.';

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    const res = await create('post', '/college/departments', { code: form.code.trim().toUpperCase(), name: form.name.trim() }, { label: `Added department ${form.code.toUpperCase()}` });
    if (res.ok) {
      setForm({ code: '', name: '' });
      setTouched(false);
      depts.reload();
      onChanged?.();
    }
  };

  const list = Array.isArray(depts.data) ? depts.data : [];

  return (
    <div className="cl-dept-grid">
      <div>
        {depts.status === 'loading' && <LoadingState label="Loading departments" />}
        {depts.status === 'failed' && <ErrorState error={depts.error} onRetry={depts.reload} />}
        {depts.status === 'succeeded' && (list.length === 0 ? (
          <EmptyState title="No departments yet" message="Add your first department to start adding people." />
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <caption className="sp-visually-hidden">Departments</caption>
              <thead>
                <tr>
                  <th scope="col">Code</th><th scope="col">Name</th><th scope="col">HOD</th>
                  <th scope="col" className="sp-num">Students</th><th scope="col" className="sp-num">Faculty</th>
                  {canEdit && <th scope="col"><span className="sp-visually-hidden">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.department_id}>
                    <td><span className="sp-code">{d.department_code}</span></td>
                    <td>{d.department_name}</td>
                    <td>{d.hod_name || <span className="sp-muted">Not assigned</span>}</td>
                    <td className="sp-num">{d.student_count}</td>
                    <td className="sp-num">{d.faculty_count}</td>
                    {canEdit && (
                      <td className="sp-num">
                        <button type="button" className="sp-icon-btn" aria-label={`Edit ${d.department_code}`} onClick={() => setEditing(d)}><Pencil size={15} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {canEdit && (
        <form className="sp-card sp-form" onSubmit={submit} noValidate style={{ background: 'var(--sp-card-alt)' }}>
          <h3 className="sp-card-title">Add department</h3>
          <div className="sp-field">
            <label htmlFor="dn-code">Code *</label>
            <input id="dn-code" className="sp-input" value={form.code} maxLength={8} style={{ textTransform: 'uppercase' }}
              onChange={(e) => { setForm((f) => ({ ...f, code: e.target.value })); reset(); }} aria-invalid={touched && !!errors.code} />
            {touched && errors.code && <p className="sp-field-error">{errors.code}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="dn-name">Name *</label>
            <input id="dn-name" className="sp-input" value={form.name} placeholder="Computer Science and Engineering"
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); reset(); }} aria-invalid={touched && !!errors.name} />
            {touched && errors.name && <p className="sp-field-error">{errors.name}</p>}
          </div>
          {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
          <button type="submit" className="sp-btn" disabled={loading}><Plus size={15} /> {loading ? 'Adding...' : 'Add department'}</button>
        </form>
      )}
      {editing && <EditDepartment dept={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); depts.reload(); onChanged?.(); }} />}
    </div>
  );
}
