import React from 'react';
import { AlertTriangle, IndianRupee, Percent, Wallet } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import DataTable from '../../../shared/ui/DataTable';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { formatCurrency } from '../../../shared/format';
import { StatTile } from '../../hod/components/common';
import '../../hod/hod.css';

const rate = (d) => (d.billed ? Math.round((d.collected / d.billed) * 1000) / 10 : null);

function monthLabel(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/** Read-only fee compliance: collection totals, per-department rates and monthly receipts. */
export default function DirectorFees() {
  const res = useApiResource('/fees/summary');

  const header = (
    <div className="sp-page-header">
      <div>
        <h1 className="sp-page-title">Fee compliance</h1>
        <p className="sp-page-subtitle">Read-only view of billing and collection. The finance office manages fees.</p>
      </div>
    </div>
  );

  if (res.status === 'loading') return <>{header}<div className="sp-card"><LoadingState label="Loading fee summary" lines={5} /></div></>;
  if (res.status === 'failed') return <>{header}<div className="sp-card"><ErrorState error={res.error} onRetry={res.reload} /></div></>;
  const s = res.data;
  if (!s || !s.counts?.total) {
    return <>{header}<div className="sp-card"><EmptyState title="No fees billed yet" message="Collection figures appear once the finance office raises fee demands." /></div></>;
  }

  const byDept = (s.by_department || []).map((d) => ({ ...d, rate: rate(d), outstanding: d.billed - d.collected }));
  const counts = s.counts;

  return (
    <>
      {header}
      <div className="sp-grid sp-grid-4" style={{ marginBottom: 18 }}>
        <StatTile navy icon={Percent} label="Collection rate" value={typeof s.collection_rate === 'number' ? s.collection_rate : 'No data'} decimals={1} suffix={typeof s.collection_rate === 'number' ? '%' : ''} note={`${counts.paid} of ${counts.total} fully paid`} />
        <StatTile icon={IndianRupee} label="Billed" value={formatCurrency(s.billed)} />
        <StatTile icon={Wallet} label="Collected" value={formatCurrency(s.collected)} note={`${formatCurrency(s.outstanding)} outstanding`} />
        <StatTile icon={AlertTriangle} label="Overdue" value={formatCurrency(s.overdue_amount)} note={`${counts.overdue} fee record(s) past due`} />
      </div>

      <div className="sp-grid sp-grid-2" style={{ marginBottom: 18 }}>
        <section className="sp-card" aria-labelledby="fee-dept">
          <h2 id="fee-dept" className="sp-section-title">Collection rate by department</h2>
          {byDept.length ? (
            <SimpleBarChart
              title="Collection rate by department"
              valueLabel="Collected"
              valueSuffix="%"
              maxValue={100}
              data={byDept.map((d) => ({ label: d.department_code, value: d.rate ?? 0, note: `${formatCurrency(d.collected)} of ${formatCurrency(d.billed)}` }))}
            />
          ) : (
            <EmptyState title="No department breakdown" />
          )}
        </section>
        <section className="sp-card" aria-labelledby="fee-month">
          <h2 id="fee-month" className="sp-section-title">Payments received by month</h2>
          {s.by_month?.length ? (
            <SimpleBarChart
              title="Payments received by month"
              valueLabel="Amount (INR)"
              data={s.by_month.map((m) => ({ label: monthLabel(m.month), value: m.amount, note: formatCurrency(m.amount) }))}
            />
          ) : (
            <EmptyState title="No payments yet" message="Monthly receipts appear once students pay." />
          )}
        </section>
      </div>

      <section className="sp-section" aria-labelledby="fee-status">
        <h2 id="fee-status" className="sp-section-title">Fee records by status</h2>
        <div className="sp-grid sp-grid-4">
          <div className="sp-card"><div className="sp-stat-label"><span className="sp-badge is-success">Paid</span></div><div className="sp-stat-value">{counts.paid}</div></div>
          <div className="sp-card"><div className="sp-stat-label"><span className="sp-badge is-warning">Partial</span></div><div className="sp-stat-value">{counts.partial}</div></div>
          <div className="sp-card"><div className="sp-stat-label"><span className="sp-badge is-neutral">Pending</span></div><div className="sp-stat-value">{counts.pending}</div></div>
          <div className="sp-card"><div className="sp-stat-label"><span className="sp-badge is-danger">Overdue</span></div><div className="sp-stat-value">{counts.overdue}</div></div>
        </div>
      </section>

      <section className="sp-section" aria-labelledby="fee-table">
        <h2 id="fee-table" className="sp-section-title">Departments</h2>
        <DataTable
          columns={[
            { key: 'department_code', header: 'Department', render: (d) => <span className="sp-code">{d.department_code}</span> },
            { key: 'billed', header: 'Billed', align: 'right', render: (d) => formatCurrency(d.billed) },
            { key: 'collected', header: 'Collected', align: 'right', render: (d) => formatCurrency(d.collected) },
            { key: 'outstanding', header: 'Outstanding', align: 'right', render: (d) => formatCurrency(d.outstanding) },
            {
              key: 'rate', header: 'Collection rate', align: 'right', csv: (d) => d.rate ?? '',
              render: (d) => (d.rate === null ? 'No data' : <span className={`sp-badge ${d.rate < 60 ? 'is-danger' : d.rate < 85 ? 'is-warning' : 'is-success'}`}>{d.rate}%</span>),
            },
          ]}
          rows={byDept}
          rowKey={(d) => d.department_id}
          searchPlaceholder="Search departments"
          csvName="fee-compliance"
          emptyTitle="No department breakdown"
          caption="Fee collection by department"
        />
      </section>
    </>
  );
}
