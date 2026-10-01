import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Eye, KeyRound, Pencil, Power, Upload, UserPlus } from 'lucide-react';
import { selectCurrentUser } from '../auth/authSlice';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import DataTable from '../../shared/ui/DataTable';
import Modal, { ConfirmDialog } from '../../shared/ui/Modal';
import { ErrorState, LoadingState, ProgressBar } from '../../shared/ui/StatusViews';
import PersonFormModal from './PersonFormModal';
import PersonDetailModal from './PersonDetailModal';
import TempPasswordDialog from './TempPasswordDialog';
import CsvImport from './CsvImport';
import { ROLE_LABEL, canManageRole, grantableRoles, isAdminRole, isHodRole, roleFilterOptions } from './collegeShared';
import './college.css';

function SeatUsage() {
  const overview = useApiResource('/college/overview');
  if (overview.status === 'loading') return <div className="sp-skeleton" style={{ height: 48 }} />;
  if (overview.status === 'failed') return <ErrorState error={overview.error} onRetry={overview.reload} />;
  const seats = overview.data?.seats;
  if (!seats) return null;
  return (
    <div className="cl-seats">
      {[['students', 'Student seats'], ['faculty', 'Faculty seats (incl. HODs)']].map(([key, label]) => {
        const s = seats[key];
        const pct = s.total ? Math.round((s.used / s.total) * 100) : 0;
        return (
          <div key={key}>
            <div className="cl-seat-row">
              <span>{label}</span>
              <strong>{s.total === null ? `${s.used} used · no active plan` : `${s.used} of ${s.total}`}</strong>
            </div>
            <ProgressBar value={pct} tone={pct >= 100 ? 'danger' : pct >= 90 ? 'warning' : 'default'} label={`${label} used`} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * People of the college: list with filters, add, edit, deactivate/reactivate,
 * reset password and CSV import. Reused by the SPOC, Director and HOD portals;
 * what each can do comes from the server's role grants.
 */
export default function PeopleManager({ title = 'People', subtitle } = {}) {
  const user = useSelector(selectCurrentUser);
  const role = user?.role;
  const [filters, setFilters] = useState({ role: '', department_id: '', status: '' });
  const [modal, setModal] = useState(null); // { type, person?, password? }
  const [actionRun, action] = useMutation();

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/college/people${s ? `?${s}` : ''}`;
  }, [filters]);

  const people = useApiResource(query);
  const config = useApiResource('/college/settings');
  const canAdd = grantableRoles(role).length > 0;
  const hod = isHodRole(role);

  const resetAction = action.reset;
  const close = useCallback(() => {
    setModal(null);
    resetAction();
  }, [resetAction]);

  const runStatus = async (person, next) => {
    const res = await actionRun('post', `/college/people/${person.user_id}/${next}`, undefined, {
      label: `${next === 'deactivate' ? 'Deactivated' : 'Reactivated'} ${person.name}`,
    });
    if (res.ok) {
      setModal(null);
      people.reload();
    }
  };

  const runReset = async (person) => {
    const res = await actionRun('post', `/college/people/${person.user_id}/reset-password`, undefined, { label: `Reset password for ${person.name}` });
    if (res.ok) setModal({ type: 'password', title: 'Password reset', person: res.data.person, password: res.data.temporary_password });
  };

  const manageable = (p) => canManageRole(role, p.role) && p.user_id !== user?.user_id;

  const columns = [
    { key: 'display_id', header: 'ID', render: (p) => (p.display_id ? <span className="sp-code">{p.display_id}</span> : '-') },
    {
      key: 'name',
      header: 'Name',
      render: (p) => (
        <>
          <button type="button" className="sp-link-btn cl-person-name" onClick={() => setModal({ type: 'view', person: p })}>{p.name}</button>
          <div className="sp-card-meta">{p.email}</div>
        </>
      ),
      value: (p) => `${p.name} ${p.email}`,
      csv: (p) => p.name,
    },
    { key: 'role', header: 'Role', value: (p) => ROLE_LABEL[p.role] || p.role_kind },
    { key: 'department_code', header: 'Dept', value: (p) => p.department_code || '' },
    {
      key: 'group',
      header: 'Section / designation',
      value: (p) => (p.role === 'student' ? [p.batch, p.section && `Sec ${p.section}`].filter(Boolean).join(' · ') : p.designation || ''),
    },
    {
      key: 'status',
      header: 'Status',
      value: (p) => p.status || 'active',
      render: (p) => <span className={`sp-badge ${p.status === 'inactive' ? 'is-danger' : 'is-success'}`}>{p.status === 'inactive' ? 'Inactive' : 'Active'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      csv: () => '',
      value: () => '',
      render: (p) => (
        <div className="cl-row-actions">
          <button type="button" className="sp-icon-btn" aria-label={`View ${p.name}`} title="View" onClick={() => setModal({ type: 'view', person: p })}><Eye size={15} /></button>
          {manageable(p) && (
            <>
              <button type="button" className="sp-icon-btn" aria-label={`Edit ${p.name}`} title="Edit" onClick={() => setModal({ type: 'edit', person: p })}><Pencil size={15} /></button>
              <button type="button" className="sp-icon-btn" aria-label={`Reset password for ${p.name}`} title="Reset password" onClick={() => setModal({ type: 'reset', person: p })}><KeyRound size={15} /></button>
              <button type="button" className="sp-icon-btn" aria-label={`${p.status === 'inactive' ? 'Reactivate' : 'Deactivate'} ${p.name}`} title={p.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                onClick={() => setModal({ type: p.status === 'inactive' ? 'reactivate' : 'deactivate', person: p })}><Power size={15} /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  const departments = config.data?.departments || [];
  const customFields = config.data?.settings?.custom_fields || [];

  const filterBar = (
    <>
      <select className="sp-select cl-filter" aria-label="Role" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
        <option value="">All roles</option>
        {roleFilterOptions(role).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {!hod && (
        <select className="sp-select cl-filter" aria-label="Department" value={filters.department_id} onChange={(e) => setFilters((f) => ({ ...f, department_id: e.target.value }))}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_code}</option>)}
        </select>
      )}
      <select className="sp-select cl-filter" aria-label="Status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </>
  );

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">{title}</h1>
          <p className="sp-page-subtitle">{subtitle || (hod ? 'Students and faculty of your department' : 'Everyone with an account at your college')}</p>
        </div>
        {canAdd && (
          <div className="sp-btn-row">
            <button type="button" className="sp-btn is-secondary" onClick={() => setModal({ type: 'import' })} disabled={config.status !== 'succeeded'}>
              <Upload size={15} /> Import CSV
            </button>
            <button type="button" className="sp-btn" onClick={() => setModal({ type: 'add' })} disabled={config.status !== 'succeeded'}>
              <UserPlus size={15} /> Add person
            </button>
          </div>
        )}
      </div>

      {isAdminRole(role) && (
        <section className="sp-card" style={{ marginBottom: 16 }} aria-label="Seat usage">
          <SeatUsage key={people.data ? people.data.length : 0} />
        </section>
      )}
      {config.status === 'failed' && (
        <div className="sp-alert is-error" role="alert" style={{ marginBottom: 14 }}>
          <span>College settings could not be loaded ({config.error?.message}). Adding people needs them.</span>
          <button type="button" className="sp-link-btn" onClick={config.reload}>Retry</button>
        </div>
      )}

      <section className="sp-card">
        {people.status === 'loading' && !people.data && <LoadingState label="Loading people" lines={6} />}
        {people.status === 'failed' && <ErrorState error={people.error} onRetry={people.reload} />}
        {people.data && people.status !== 'failed' && (
          <div style={{ opacity: people.status === 'loading' ? 0.6 : 1, transition: 'opacity 150ms' }}>
            <DataTable
              columns={columns}
              rows={Array.isArray(people.data) ? people.data : []}
              rowKey={(p) => p.user_id}
              searchPlaceholder="Search name, email or ID"
              toolbar={filterBar}
              csvName="people"
              pageSize={15}
              emptyTitle={Object.values(filters).some(Boolean) ? 'Nobody matches these filters' : 'No people yet'}
              emptyMessage={canAdd ? 'Add people one at a time or import a CSV file.' : undefined}
              caption="People"
            />
          </div>
        )}
      </section>

      {modal?.type === 'add' && (
        <PersonFormModal
          viewer={user}
          config={config.data}
          onClose={close}
          onSaved={(data) => {
            people.reload();
            setModal({ type: 'password', title: 'Person added', person: data.person, password: data.temporary_password });
          }}
        />
      )}
      {modal?.type === 'edit' && (
        <PersonFormModal viewer={user} config={config.data} person={modal.person} onClose={close} onSaved={() => { people.reload(); setModal(null); }} />
      )}
      {modal?.type === 'view' && (
        <PersonDetailModal
          personId={modal.person.user_id}
          customFields={customFields}
          onClose={close}
          actions={(p) => (p && manageable(p) ? (
            <button type="button" className="sp-btn is-secondary" onClick={() => setModal({ type: 'edit', person: p })}><Pencil size={14} /> Edit</button>
          ) : null)}
        />
      )}
      {modal?.type === 'password' && (
        <TempPasswordDialog title={modal.title} person={modal.person} password={modal.password} onClose={close} />
      )}
      {(modal?.type === 'deactivate' || modal?.type === 'reactivate') && (
        <ConfirmDialog
          title={modal.type === 'deactivate' ? 'Deactivate account' : 'Reactivate account'}
          message={
            <>
              {modal.type === 'deactivate'
                ? `${modal.person.name} will no longer be able to sign in, and their seat is freed. Their records are kept.`
                : `${modal.person.name} will be able to sign in again. This uses a seat on your plan.`}
              {action.error && <span className="sp-field-error" style={{ display: 'block', marginTop: 8 }}>{action.error.message}</span>}
            </>
          }
          confirmLabel={modal.type === 'deactivate' ? 'Deactivate' : 'Reactivate'}
          danger={modal.type === 'deactivate'}
          busy={action.loading}
          onCancel={close}
          onConfirm={() => runStatus(modal.person, modal.type)}
        />
      )}
      {modal?.type === 'reset' && (
        <ConfirmDialog
          title="Reset password"
          message={
            <>
              A new temporary password will be created for {modal.person.name} and their current password stops working. They must change it at next sign-in.
              {action.error && <span className="sp-field-error" style={{ display: 'block', marginTop: 8 }}>{action.error.message}</span>}
            </>
          }
          confirmLabel="Reset password"
          danger
          busy={action.loading}
          onCancel={close}
          onConfirm={() => runReset(modal.person)}
        />
      )}
      {modal?.type === 'import' && (
        <Modal title="Import people from CSV" onClose={close} width={900}>
          <CsvImport config={config.data} onImported={() => people.reload()} />
        </Modal>
      )}
    </>
  );
}
