import React from 'react';
import DataTable from '../../../shared/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { formatCurrency, formatDate } from '../../../shared/format';

const STAGES = [
  ['started', 'Started', 'is-neutral', 'Details entered, no quote yet'],
  ['quoted', 'Quoted', 'is-info', 'Quote generated'],
  ['accepted', 'Payment started', 'is-info', 'Payment in progress'],
  ['payment_failed', 'Payment failed', 'is-danger', 'Needs follow-up'],
  ['paid', 'Paid', 'is-success', 'Institution created'],
  ['expired', 'Expired', 'is-warning', 'Session lapsed before payment'],
];
const STAGE = Object.fromEntries(STAGES.map(([k, label, tone]) => [k, { label, tone }]));

export default function SupportOnboarding() {
  const list = useApiResource('/platform/onboarding');
  const rows = Array.isArray(list.data) ? list.data : [];
  const count = (k) => rows.filter((r) => r.stage === k).length;

  const columns = [
    { key: 'college_name', header: 'Institution', sortable: true, render: (r) => (<><strong>{r.college_name || 'Unnamed'}</strong><div className="sp-card-meta">{[r.city, r.state].filter(Boolean).join(', ')}</div></>) },
    { key: 'contact', header: 'Contact', render: (r) => (<>{r.contact || '-'}<div className="sp-card-meta">{[r.email, r.phone].filter(Boolean).join(' · ')}</div></>), value: (r) => `${r.contact} ${r.email || ''}` },
    { key: 'stage', header: 'Stage', sortable: true, value: (r) => STAGE[r.stage]?.label || r.stage, render: (r) => <span className={`sp-badge ${STAGE[r.stage]?.tone || 'is-neutral'}`}>{STAGE[r.stage]?.label || r.stage}</span> },
    { key: 'metrics', header: 'Size', sortable: false, value: (r) => (r.metrics ? `${r.metrics.student_count ?? ''} students` : ''), render: (r) => (r.metrics ? `${r.metrics.student_count ?? '-'} students · ${r.metrics.faculty_count ?? '-'} faculty` : <span className="sp-muted">No quote</span>) },
    { key: 'amount_paise', header: 'Quote', align: 'right', sortable: true, render: (r) => (typeof r.amount_paise === 'number' ? formatCurrency(r.amount_paise / 100) : '-'), csv: (r) => (typeof r.amount_paise === 'number' ? r.amount_paise / 100 : '') },
    { key: 'created_at', header: 'Started', sortable: true, render: (r) => formatDate(r.created_at) },
  ];

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Onboarding pipeline</h1>
          <p className="sp-page-subtitle">Colleges signing up through the public onboarding flow, from first details to payment.</p>
        </div>
      </div>
      <section className="sp-card">
        {list.status === 'loading' && !list.data && <LoadingState label="Loading pipeline..." lines={5} />}
        {list.status === 'failed' && <ErrorState error={list.error} onRetry={list.reload} />}
        {list.data && list.status !== 'failed' && (rows.length === 0 ? (
          <EmptyState title="No onboarding sessions" message="When a college starts signing up on the website, it appears here." />
        ) : (
          <>
            <div className="sup-pipeline" style={{ marginBottom: 18 }}>
              {STAGES.map(([k, label, , note]) => (
                <div key={k} className="sup-pipeline-step">
                  <span className="sp-stat-label">{label}</span>
                  <strong>{count(k)}</strong>
                  <span className="sp-muted" style={{ fontSize: 12 }}>{note}</span>
                </div>
              ))}
            </div>
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.session_id} searchPlaceholder="Search sign-ups..." csvName="onboarding" caption="Onboarding sessions" />
          </>
        ))}
      </section>
    </>
  );
}
