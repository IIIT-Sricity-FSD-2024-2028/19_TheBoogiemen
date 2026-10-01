import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import DataTable from '../../../shared/ui/DataTable';
import Modal, { ConfirmDialog } from '../../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { capitalize, displayValue, formatDate } from '../../../shared/format';
import { levelOf } from '../supportUi';

const PLAN_TONE = { active: 'is-success', expiring_soon: 'is-warning', expired: 'is-danger' };
const PLAN_LABEL = { active: 'Active', expiring_soon: 'Expiring soon', expired: 'Expired' };

function seatText(used, licensed) {
  return licensed ? `${used} / ${licensed}` : String(used);
}

function DetailsModal({ inst, onClose }) {
  const sub = inst.subscription;
  return (
    <Modal title={`${inst.name}${inst.code ? ` (${inst.code})` : ''}`} onClose={onClose} width={620}>
      <dl className="sp-details">
        <div><dt>Location</dt><dd>{[inst.city, inst.state].filter(Boolean).join(', ') || 'Not available'}</dd></div>
        <div><dt>Type</dt><dd>{capitalize(inst.type) || 'Not available'}</dd></div>
        <div><dt>Status</dt><dd>{capitalize(inst.status)}</dd></div>
        <div><dt>SPOC</dt><dd>{inst.spoc || 'Not assigned'}{inst.spoc_email ? ` · ${inst.spoc_email}` : ''}</dd></div>
        <div><dt>Plan</dt><dd>{sub ? `${capitalize(sub.plan_key)} (${PLAN_LABEL[sub.plan_status] || sub.plan_status})` : 'No active subscription'}</dd></div>
        <div><dt>Plan period</dt><dd>{sub ? `${formatDate(sub.starts_on)} to ${formatDate(sub.ends_on)}` : 'Not available'}</dd></div>
        <div><dt>Students</dt><dd>{seatText(inst.seats?.students ?? 0, sub?.student_seats)}</dd></div>
        <div><dt>Faculty</dt><dd>{seatText(inst.seats?.faculty ?? 0, sub?.faculty_seats)}</dd></div>
        <div><dt>Modules</dt><dd>{sub?.modules?.length ? sub.modules.map(capitalize).join(', ') : 'Core only'}</dd></div>
        <div><dt>Open tickets</dt><dd>{inst.open_tickets}</dd></div>
        <div><dt>Setup</dt><dd>{inst.setup_completed ? 'Completed' : 'Not completed'}</dd></div>
      </dl>
      {inst.config && (
        <>
          <h3 className="sup-block-title" style={{ marginTop: 18 }}>Configuration</h3>
          <dl className="sp-details">
            <div><dt>Term type</dt><dd>{capitalize(inst.config.term_type) || 'Not set'}</dd></div>
            <div><dt>Minimum attendance</dt><dd>{inst.config.attendance_min_pct != null ? `${inst.config.attendance_min_pct}%` : 'Not set'}</dd></div>
            <div><dt>Grading scale</dt><dd>{displayValue(inst.config.grading_scale, 'Not set')}</dd></div>
            <div><dt>Sections</dt><dd>{Array.isArray(inst.config.sections) ? inst.config.sections.join(', ') || 'None' : 'Not set'}</dd></div>
            <div><dt>Custom fields</dt><dd>{inst.config.custom_fields}</dd></div>
          </dl>
        </>
      )}
    </Modal>
  );
}

function EditModal({ inst, onClose, onSaved }) {
  const sub = inst.subscription;
  const [form, setForm] = useState({
    student_seats: sub?.student_seats ? String(sub.student_seats) : '',
    faculty_seats: sub?.faculty_seats ? String(sub.faculty_seats) : '',
    extend_months: '',
  });
  const [touched, setTouched] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [save, saveState] = useMutation();
  const [setStatus, statusState] = useMutation();

  const errors = {};
  const whole = (v, min, max) => /^\d+$/.test(v) && Number(v) >= min && (!max || Number(v) <= max);
  if (sub) {
    if (!whole(form.student_seats, 1)) errors.student_seats = 'Enter a positive whole number.';
    if (!whole(form.faculty_seats, 1)) errors.faculty_seats = 'Enter a positive whole number.';
    if (form.extend_months && !whole(form.extend_months, 1, 36)) errors.extend_months = 'Extend by 1 to 36 months.';
  }
  const update = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); saveState.reset(); };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    const body = { student_seats: Number(form.student_seats), faculty_seats: Number(form.faculty_seats) };
    if (form.extend_months) body.extend_months = Number(form.extend_months);
    const res = await save('patch', `/platform/institutions/${inst.college_id}`, body, { label: `Updated subscription for ${inst.name}` });
    if (res.ok) onSaved(res.data);
  };

  const toggleStatus = async () => {
    const next = inst.status === 'suspended' ? 'active' : 'suspended';
    const res = await setStatus('patch', `/platform/institutions/${inst.college_id}`, { status: next }, { label: `${next === 'suspended' ? 'Suspended' : 'Reactivated'} ${inst.name}` });
    setConfirm(false);
    if (res.ok) onSaved(res.data);
  };

  const field = (k, label, hint) => (
    <div className="sp-field">
      <label htmlFor={`inst-${k}`}>{label}</label>
      <input id={`inst-${k}`} className="sp-input" inputMode="numeric" value={form[k]} onChange={update(k)} aria-invalid={touched && !!errors[k]} />
      {touched && errors[k] ? <p className="sp-field-error">{errors[k]}</p> : hint && <p className="sp-hint">{hint}</p>}
    </div>
  );

  return (
    <Modal title={`Manage ${inst.name}`} onClose={onClose} width={560}>
      {sub ? (
        <form className="sp-form" onSubmit={submit} noValidate>
          <div className="sp-form-row">
            {field('student_seats', 'Student seats', `${inst.seats?.students ?? 0} in use`)}
            {field('faculty_seats', 'Faculty seats', `${inst.seats?.faculty ?? 0} in use`)}
          </div>
          {field('extend_months', 'Extend plan by (months)', `Current end date ${formatDate(sub.ends_on)}. Leave blank to keep it.`)}
          {saveState.error && <div className="sp-alert is-error" role="alert">{saveState.error.message}</div>}
          <div className="sp-btn-row">
            <button type="submit" className="sp-btn" disabled={saveState.loading}>{saveState.loading ? 'Saving...' : 'Save subscription'}</button>
          </div>
        </form>
      ) : (
        <div className="sp-alert is-info">This institution has no active subscription, so seats and dates cannot be changed.</div>
      )}

      <div className="sup-block">
        <h3 className="sup-block-title">Institution status</h3>
        <p style={{ marginTop: 0 }}>
          Currently <span className={`sp-badge ${inst.status === 'suspended' ? 'is-danger' : 'is-success'}`}>{capitalize(inst.status)}</span>
        </p>
        {statusState.error && <div className="sp-alert is-error" role="alert">{statusState.error.message}</div>}
        <button type="button" className={`sp-btn ${inst.status === 'suspended' ? 'is-secondary' : 'is-danger'}`} onClick={() => (inst.status === 'suspended' ? toggleStatus() : setConfirm(true))} disabled={statusState.loading}>
          {inst.status === 'suspended' ? (statusState.loading ? 'Reactivating...' : 'Reactivate institution') : 'Suspend institution'}
        </button>
      </div>

      {confirm && (
        <ConfirmDialog
          title={`Suspend ${inst.name}?`}
          message="Staff and students of this institution lose access until it is reactivated. Their data is kept."
          confirmLabel="Suspend"
          danger
          busy={statusState.loading}
          onConfirm={toggleStatus}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Modal>
  );
}

export default function SupportInstitutions() {
  const user = useSelector((state) => state.auth.user);
  const level = levelOf(user);
  const canEdit = level.tier >= 4;
  const list = useApiResource('/platform/institutions');
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  const columns = [
    {
      key: 'name',
      header: 'Institution',
      render: (r) => (
        <>
          <button type="button" className="sp-link-btn" onClick={() => setViewing(r)}>{r.name}</button>
          <div className="sp-card-meta">{[r.code, r.city].filter(Boolean).join(' · ')}</div>
        </>
      ),
      sortable: true,
    },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <span className={`sp-badge ${r.status === 'suspended' ? 'is-danger' : 'is-success'}`}>{capitalize(r.status)}</span> },
    {
      key: 'plan',
      header: 'Plan',
      value: (r) => r.subscription?.plan_key || '',
      render: (r) => (r.subscription ? (
        <>
          {capitalize(r.subscription.plan_key)} <span className={`sp-badge ${PLAN_TONE[r.subscription.plan_status] || 'is-neutral'}`}>{PLAN_LABEL[r.subscription.plan_status] || r.subscription.plan_status}</span>
        </>
      ) : <span className="sp-muted">None</span>),
      sortable: true,
    },
    { key: 'ends', header: 'Ends', value: (r) => r.subscription?.ends_on || '', render: (r) => (r.subscription ? formatDate(r.subscription.ends_on) : '-'), sortable: true },
    { key: 'students', header: 'Students', align: 'right', value: (r) => r.seats?.students ?? 0, render: (r) => seatText(r.seats?.students ?? 0, r.subscription?.student_seats), sortable: true },
    { key: 'faculty', header: 'Faculty', align: 'right', value: (r) => r.seats?.faculty ?? 0, render: (r) => seatText(r.seats?.faculty ?? 0, r.subscription?.faculty_seats), sortable: true },
    { key: 'open_tickets', header: 'Open tickets', align: 'right', sortable: true },
    { key: 'setup', header: 'Setup', value: (r) => (r.setup_completed ? 'Completed' : 'Pending'), render: (r) => <span className={`sp-badge ${r.setup_completed ? 'is-success' : 'is-warning'}`}>{r.setup_completed ? 'Completed' : 'Pending'}</span> },
    { key: 'spoc', header: 'SPOC', sortable: false, value: (r) => r.spoc || '', render: (r) => r.spoc || <span className="sp-muted">Not assigned</span> },
  ];
  if (canEdit) {
    columns.push({ key: 'actions', header: '', sortable: false, csv: () => '', value: () => '', render: (r) => <button type="button" className="sp-btn is-small is-secondary" onClick={() => setEditing(r)}>Manage</button> });
  }

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Institutions</h1>
          <p className="sp-page-subtitle">
            Colleges on the platform, their plans, seat use and open tickets. {canEdit ? 'As L4 you can change seats, extend plans and suspend access.' : 'Read only; the L4 platform admin changes subscriptions.'}
          </p>
        </div>
      </div>
      <section className="sp-card">
        {list.status === 'loading' && !list.data && <LoadingState label="Loading institutions..." lines={5} />}
        {list.status === 'failed' && <ErrorState error={list.error} onRetry={list.reload} />}
        {list.data && list.status !== 'failed' && (list.data.length === 0 ? (
          <EmptyState title="No institutions yet" message="Colleges appear here after they complete onboarding." />
        ) : (
          <DataTable columns={columns} rows={list.data} rowKey={(r) => r.college_id} searchPlaceholder="Search institutions..." csvName="institutions" caption="Institutions" />
        ))}
      </section>
      {viewing && <DetailsModal inst={viewing} onClose={() => setViewing(null)} />}
      {editing && (
        <EditModal
          inst={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            if (updated) setEditing(updated);
            list.reload();
          }}
        />
      )}
    </>
  );
}
