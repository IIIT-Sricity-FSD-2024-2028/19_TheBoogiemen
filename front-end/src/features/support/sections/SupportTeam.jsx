import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UserPlus } from 'lucide-react';
import DataTable from '../../../shared/ui/DataTable';
import Modal, { ConfirmDialog } from '../../../shared/ui/Modal';
import { ResourceView, EmptyState } from '../../../shared/ui/StatusViews';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { useMutation } from '../../../hooks/useMutation';
import { fetchSupportTeam, selectSupportResource } from '../supportSlice';
import { levelOf } from '../supportUi';

const LEVEL_OPTIONS = [
  ['1', 'L1 Support agent'],
  ['2', 'L2 Technical support'],
  ['3', 'L3 Support manager'],
  ['sales', 'Sales and onboarding'],
];
const levelValue = (m) => (m.role === 'PLATFORM_SALES_SUPPORT' ? 'sales' : String(m.tier));
const levelBody = (v) => (v === 'sales' ? { role: 'sales' } : { tier: Number(v) });

function AddStaffModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', level: '' });
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState(null);
  const [run, state] = useMutation();
  const errors = {};
  if (!form.first_name.trim()) errors.first_name = 'First name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email.';
  if (!form.level) errors.level = 'Choose a level.';
  const update = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); state.reset(); };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    const body = { first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(), ...levelBody(form.level) };
    const res = await run('post', '/platform/team', body, { label: `Added ${body.first_name} to the support team` });
    if (res.ok) {
      setCreated(res.data);
      onAdded();
    }
  };

  if (created) {
    return (
      <Modal title="Staff member added" onClose={onClose} width={480} footer={<button type="button" className="sp-btn" onClick={onClose}>Done</button>}>
        <p style={{ marginTop: 0 }}>{created.staff?.first_name} can sign in at the Platform Support portal with {created.staff?.email}.</p>
        <div className="sp-alert is-warning">
          Temporary password (shown once): <span className="sup-temp-pass">{created.temporary_password}</span>
          <br />They must set their own password at first sign-in.
        </div>
      </Modal>
    );
  }

  const field = (k, label, props = {}) => (
    <div className="sp-field">
      <label htmlFor={`staff-${k}`}>{label}</label>
      <input id={`staff-${k}`} className="sp-input" value={form[k]} onChange={update(k)} aria-invalid={touched && !!errors[k]} {...props} />
      {touched && errors[k] && <p className="sp-field-error">{errors[k]}</p>}
    </div>
  );

  return (
    <Modal title="Add support staff" onClose={onClose} width={520}>
      <form className="sp-form" onSubmit={submit} noValidate>
        <div className="sp-form-row">
          {field('first_name', 'First name')}
          {field('last_name', 'Last name')}
        </div>
        {field('email', 'Email', { type: 'email', autoComplete: 'off' })}
        <div className="sp-field">
          <label htmlFor="staff-level">Level</label>
          <select id="staff-level" className="sp-select" value={form.level} onChange={update('level')} aria-invalid={touched && !!errors.level}>
            <option value="">Choose level</option>
            {LEVEL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {touched && errors.level ? <p className="sp-field-error">{errors.level}</p> : <p className="sp-hint">There is one L4 platform admin; it cannot be granted here.</p>}
        </div>
        {state.error && <div className="sp-alert is-error" role="alert">{state.error.message}</div>}
        <div className="sp-btn-row">
          <button type="submit" className="sp-btn" disabled={state.loading}>{state.loading ? 'Adding...' : 'Add staff member'}</button>
        </div>
      </form>
    </Modal>
  );
}

function LevelCell({ member, disabled, onChanged }) {
  const [run, state] = useMutation();
  const change = async (e) => {
    const v = e.target.value;
    const res = await run('patch', `/platform/team/${member.user_id}`, levelBody(v), { label: `Changed ${member.name}'s level` });
    if (res.ok) onChanged();
  };
  if (disabled || member.tier >= 4) return member.level;
  return (
    <>
      <select className="sp-select" style={{ minWidth: 190 }} aria-label={`Level for ${member.name}`} value={levelValue(member)} onChange={change} disabled={state.loading}>
        {LEVEL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {state.error && <p className="sp-field-error">{state.error.message}</p>}
    </>
  );
}

export default function SupportTeam() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const canManage = levelOf(user).tier >= 4;
  const team = useSelector(selectSupportResource('team'));
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [toggle, toggleState] = useMutation();

  useEffect(() => {
    dispatch(fetchSupportTeam({ force: true }));
  }, [dispatch]);
  const reload = () => dispatch(fetchSupportTeam({ force: true }));

  const confirmToggle = async () => {
    const next = toggling.status === 'inactive' ? 'active' : 'inactive';
    const res = await toggle('patch', `/platform/team/${toggling.user_id}`, { status: next }, { label: `${next === 'inactive' ? 'Deactivated' : 'Reactivated'} ${toggling.name}` });
    if (res.ok) {
      setToggling(null);
      reload();
    }
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true, render: (m) => (<><strong>{m.name}</strong>{m.user_id === user?.user_id && <> <span className="sp-badge is-info">You</span></>}<div className="sp-card-meta">{m.email}</div></>) },
    { key: 'level', header: 'Level', sortable: true, value: (m) => m.level, render: (m) => <LevelCell member={m} disabled={!canManage || m.user_id === user?.user_id} onChanged={reload} /> },
    { key: 'status', header: 'Status', sortable: true, render: (m) => <span className={`sp-badge ${m.status === 'inactive' ? 'is-neutral' : 'is-success'}`}>{m.status === 'inactive' ? 'Inactive' : 'Active'}</span> },
    { key: 'active_tickets', header: 'Active', align: 'right', sortable: true },
    { key: 'breached', header: 'Breached', align: 'right', sortable: true, render: (m) => (m.breached ? <span className="sp-badge is-danger">{m.breached}</span> : 0) },
    { key: 'resolved_tickets', header: 'Resolved', align: 'right', sortable: true },
  ];
  if (canManage) {
    columns.push({
      key: 'actions',
      header: '',
      sortable: false,
      value: () => '',
      csv: () => '',
      render: (m) => (m.user_id === user?.user_id || m.tier >= 4 ? null : (
        <button type="button" className={`sp-btn is-small ${m.status === 'inactive' ? 'is-secondary' : 'is-outline'}`} onClick={() => { toggleState.reset(); setToggling(m); }}>
          {m.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
        </button>
      )),
    });
  }

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Support team</h1>
          <p className="sp-page-subtitle">Staff, their levels and current workload. {canManage ? 'You can add staff and change levels.' : 'Only the L4 platform admin manages staff.'}</p>
        </div>
        {canManage && (
          <button type="button" className="sp-btn" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Add staff
          </button>
        )}
      </div>

      <ResourceView
        resource={team}
        onRetry={reload}
        isEmpty={(d) => !d?.length}
        empty={<section className="sp-card"><EmptyState title="No support staff" message="Add staff to start working the queue." /></section>}
      >
        {(rows) => (
          <div className="sp-grid" style={{ gap: 18 }}>
            <section className="sp-card" aria-labelledby="team-load">
              <h2 id="team-load" className="sp-section-title">Workload: active tickets per person</h2>
              <SimpleBarChart
                title="Active tickets per staff member"
                valueLabel="Active tickets"
                height={220}
                data={rows.filter((m) => m.status !== 'inactive').map((m) => ({ label: m.first_name || m.name, fullLabel: `${m.name} (${m.level})`, value: m.active_tickets, note: `${m.breached} breached` }))}
              />
            </section>
            <section className="sp-card">
              <DataTable columns={columns} rows={rows} rowKey={(m) => m.user_id} searchPlaceholder="Search staff..." csvName="support-team" caption="Support team" />
            </section>
          </div>
        )}
      </ResourceView>

      {adding && <AddStaffModal onClose={() => setAdding(false)} onAdded={reload} />}
      {toggling && (
        <ConfirmDialog
          title={toggling.status === 'inactive' ? `Reactivate ${toggling.name}?` : `Deactivate ${toggling.name}?`}
          message={
            <>
              {toggling.status === 'inactive'
                ? 'They will be able to sign in and take tickets again.'
                : `They can no longer sign in. Their ${toggling.active_tickets} active ticket(s) return to the queue unassigned.`}
              {toggleState.error && <span className="sp-field-error" style={{ display: 'block', marginTop: 8 }}>{toggleState.error.message}</span>}
            </>
          }
          confirmLabel={toggling.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
          danger={toggling.status !== 'inactive'}
          busy={toggleState.loading}
          onConfirm={confirmToggle}
          onCancel={() => setToggling(null)}
        />
      )}
    </>
  );
}
