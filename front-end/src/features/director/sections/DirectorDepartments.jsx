import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import DataTable from '../../../shared/ui/DataTable';
import Modal from '../../../shared/ui/Modal';
import { ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { displayValue, fullName } from '../../../shared/format';
import DepartmentReport from '../../hod/components/DepartmentReport';
import '../../hod/hod.css';

function CreateModal({ onClose, onDone }) {
  const [form, setForm] = useState({ code: '', name: '' });
  const [errors, setErrors] = useState({});
  const [save, { loading, error }] = useMutation();

  const submit = async (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const errs = {};
    if (!/^[A-Z0-9]{2,8}$/.test(code)) errs.code = 'Use 2-8 letters or digits (e.g. CSE).';
    if (!form.name.trim()) errs.name = 'Department name is required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await save('post', '/college/departments', { code, name: form.name.trim() }, { label: `Created department ${code}` });
    if (res.ok) onDone();
  };

  return (
    <Modal
      title="New department"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="dir-dept-form" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : 'Create department'}</button>
        </>
      }
    >
      <form id="dir-dept-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-field">
          <label htmlFor="dir-dc">Code</label>
          <input id="dir-dc" className="sp-input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} aria-invalid={!!errors.code} placeholder="MECH" maxLength={8} />
          {errors.code && <p className="sp-field-error">{errors.code}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="dir-dn">Name</label>
          <input id="dir-dn" className="sp-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-invalid={!!errors.name} maxLength={120} placeholder="Mechanical Engineering" />
          {errors.name && <p className="sp-field-error">{errors.name}</p>}
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ dept, onClose, onDone }) {
  const hods = useApiResource(`/college/people?role=hod&status=active&department_id=${encodeURIComponent(dept.department_id)}`);
  const [form, setForm] = useState({ name: dept.department_name, hod_user_id: dept.hod_user_id || '' });
  const [err, setErr] = useState('');
  const [save, { loading, error }] = useMutation();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr('Department name is required.');
    setErr('');
    const res = await save('patch', `/college/departments/${dept.department_id}`, { name: form.name.trim(), hod_user_id: form.hod_user_id || null }, { label: `Updated department ${dept.department_code}` });
    if (res.ok) onDone();
    return undefined;
  };

  return (
    <Modal
      title={`Edit ${dept.department_code}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="dir-edit-form" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</button>
        </>
      }
    >
      <form id="dir-edit-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-field">
          <label htmlFor="dir-en">Name</label>
          <input id="dir-en" className="sp-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-invalid={!!err} maxLength={120} />
          {err && <p className="sp-field-error">{err}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="dir-eh">Head of department</label>
          {hods.status === 'loading' && <LoadingState label="Loading HODs" lines={1} />}
          {hods.status === 'failed' && <ErrorState error={hods.error} onRetry={hods.reload} />}
          {hods.status === 'succeeded' && (
            <>
              <select id="dir-eh" className="sp-select" value={form.hod_user_id} onChange={(e) => setForm((f) => ({ ...f, hod_user_id: e.target.value }))}>
                <option value="">No HOD assigned</option>
                {hods.data.map((h) => <option key={h.user_id} value={h.user_id}>{fullName(h)} ({h.email})</option>)}
              </select>
              <p className="sp-hint">
                {hods.data.length ? 'Only users with the HOD role in this department are listed.' : 'No HOD accounts in this department yet. Add one from People with the HOD role.'}
              </p>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default function DirectorDepartments() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('dept');
  const depts = useApiResource('/college/departments');
  const [modal, setModal] = useState(null);
  const list = Array.isArray(depts.data) ? depts.data : [];

  if (selected) {
    const dept = list.find((d) => d.department_id === selected);
    return (
      <>
        <button type="button" className="sp-link-btn hd-back" onClick={() => setParams({})}><ArrowLeft size={15} /> All departments</button>
        <div className="sp-page-header">
          <div>
            <h1 className="sp-page-title">{dept ? dept.department_name : 'Department report'}</h1>
            <p className="sp-page-subtitle">{dept ? `HOD: ${displayValue(dept.hod_name, 'not assigned')}` : 'Attendance, results and at-risk students.'}</p>
          </div>
        </div>
        <DepartmentReport key={selected} departmentId={selected} />
      </>
    );
  }

  const columns = [
    { key: 'department_code', header: 'Code', render: (d) => <span className="sp-code">{d.department_code}</span> },
    { key: 'department_name', header: 'Name' },
    { key: 'hod_name', header: 'HOD', render: (d) => (d.hod_name ? d.hod_name : <span className="sp-badge is-warning">Not assigned</span>), value: (d) => d.hod_name || '' },
    { key: 'student_count', header: 'Students', align: 'right' },
    { key: 'faculty_count', header: 'Faculty', align: 'right' },
    {
      key: 'actions', header: 'Actions', sortable: false, csv: () => '',
      render: (d) => (
        <div className="sp-btn-row">
          <button type="button" className="sp-btn is-small" onClick={() => setParams({ dept: d.department_id })}>View report</button>
          <button type="button" className="sp-btn is-secondary is-small" onClick={() => setModal({ type: 'edit', dept: d })} aria-label={`Edit ${d.department_name}`}><Pencil size={13} /> Edit</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Departments</h1>
          <p className="sp-page-subtitle">Create departments, assign HODs and open any department's report.</p>
        </div>
        <button type="button" className="sp-btn" onClick={() => setModal({ type: 'create' })}><Plus size={15} /> New department</button>
      </div>
      {depts.status === 'loading' && <div className="sp-card"><LoadingState label="Loading departments" /></div>}
      {depts.status === 'failed' && <div className="sp-card"><ErrorState error={depts.error} onRetry={depts.reload} /></div>}
      {depts.status === 'succeeded' && (
        <section className="sp-card">
        <DataTable
          columns={columns}
          rows={list}
          rowKey={(d) => d.department_id}
          searchPlaceholder="Search departments"
          csvName="departments"
          emptyTitle="No departments yet"
          emptyMessage="Create the first department to start adding courses and people."
          caption="Departments"
        />
        </section>
      )}
      {modal?.type === 'create' && <CreateModal onClose={() => setModal(null)} onDone={() => { setModal(null); depts.reload(); }} />}
      {modal?.type === 'edit' && <EditModal dept={modal.dept} onClose={() => setModal(null)} onDone={() => { setModal(null); depts.reload(); }} />}
    </>
  );
}
