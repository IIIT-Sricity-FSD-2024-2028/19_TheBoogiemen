import React from 'react';
import Modal from '../../shared/ui/Modal';
import { useApiResource } from '../../hooks/useApiResource';
import { ResourceView } from '../../shared/ui/StatusViews';
import { displayValue, formatDate } from '../../shared/format';
import { ROLE_LABEL } from './collegeShared';

/** Read-only profile of one person (GET /college/people/:id). */
export default function PersonDetailModal({ personId, customFields = [], onClose, actions }) {
  const res = useApiResource(`/college/people/${personId}`);
  const labelFor = (key) => customFields.find((f) => f.key === key)?.label || key.replace(/_/g, ' ');

  return (
    <Modal title="Person details" onClose={onClose} width={620} footer={actions ? actions(res.data) : null}>
      <ResourceView resource={res} onRetry={res.reload}>
        {(p) => (
          <div className="sp-form">
            <div>
              <h3 className="sp-card-title" style={{ fontSize: 18 }}>{p.name}</h3>
              <p className="sp-muted" style={{ margin: '2px 0 0' }}>
                {ROLE_LABEL[p.role] || p.role_kind}
                {' · '}
                <span className={`sp-badge ${p.status === 'inactive' ? 'is-danger' : 'is-success'}`}>{p.status === 'inactive' ? 'Inactive' : 'Active'}</span>
                {p.must_change_password && <> {' '}<span className="sp-badge is-warning">Password change pending</span></>}
              </p>
            </div>
            <dl className="sp-details">
              <div><dt>ID</dt><dd>{displayValue(p.display_id)}</dd></div>
              <div><dt>Email</dt><dd style={{ wordBreak: 'break-all' }}>{p.email}</dd></div>
              <div><dt>Phone</dt><dd>{displayValue(p.phone)}</dd></div>
              <div><dt>Department</dt><dd>{p.department_code ? `${p.department_code} · ${p.department_name}` : 'None'}</dd></div>
              {p.role === 'student' ? (
                <>
                  <div><dt>Batch</dt><dd>{displayValue(p.batch)}</dd></div>
                  <div><dt>Section</dt><dd>{displayValue(p.section)}</dd></div>
                  <div><dt>Semester</dt><dd>{displayValue(p.semester)}</dd></div>
                  <div><dt>CGPA</dt><dd>{displayValue(p.cgpa)}</dd></div>
                </>
              ) : (
                <div><dt>Designation</dt><dd>{displayValue(p.designation)}</dd></div>
              )}
              <div><dt>Added on</dt><dd>{formatDate(p.created_at)}</dd></div>
              {Object.entries(p.custom_fields || {}).map(([k, v]) => (
                <div key={k}><dt>{labelFor(k)}</dt><dd>{displayValue(v)}</dd></div>
              ))}
            </dl>
          </div>
        )}
      </ResourceView>
    </Modal>
  );
}
