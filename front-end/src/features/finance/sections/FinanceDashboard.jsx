import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, IndianRupee, Percent, Wallet } from 'lucide-react';
import { selectCurrentUser } from '../../auth/authSlice';
import { fetchFeeSummary, selectFinanceResource } from '../financeSlice';
import { useApiResource } from '../../../hooks/useApiResource';
import CountUp from '../../../shared/ui/CountUp';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { EmptyState, LoadingState } from '../../../shared/ui/StatusViews';
import { formatCurrency, formatDate } from '../../../shared/format';
import { CurrencyCountUp, FeesErrorState, FeesGate, ReceiptModal, isModuleError, modeLabel } from '../feesUi';

function Kpi({ icon: Icon, label, summary, render, note, navy, onRetry }) {
  let body;
  if (summary.status === 'failed') {
    body = (
      <div className="sp-stat-note" style={{ color: navy ? '#fecaca' : 'var(--sp-danger)' }}>
        Failed to load{summary.error?.status ? ` (HTTP ${summary.error.status})` : ''}.{' '}
        <button type="button" className="sp-link-btn" onClick={onRetry}>Retry</button>
      </div>
    );
  } else if (summary.status !== 'succeeded') {
    body = <div className="sp-skeleton" style={{ height: 30, width: '60%', marginTop: 6, opacity: navy ? 0.3 : 1 }} />;
  } else {
    body = (
      <>
        <div className="sp-stat-value">{render(summary.data)}</div>
        {note && <div className="sp-stat-note">{note(summary.data)}</div>}
      </>
    );
  }
  return (
    <div className={`sp-card${navy ? ' is-navy' : ''}`}>
      <div className="sp-tile-icon" aria-hidden="true"><Icon size={19} /></div>
      <div className="sp-stat-label">{label}</div>
      {body}
    </div>
  );
}

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const summary = useSelector(selectFinanceResource('summary'));
  const payments = useApiResource('/fees/payments');
  const [receiptId, setReceiptId] = useState(null);
  const retry = () => dispatch(fetchFeeSummary({ force: true }));

  useEffect(() => {
    dispatch(fetchFeeSummary());
  }, [dispatch]);

  if (summary.status === 'failed' && isModuleError(summary.error)) return <FeesErrorState error={summary.error} />;

  const s = summary.data;
  const departments = Array.isArray(s?.by_department) ? s.by_department : [];
  const recent = Array.isArray(payments.data) ? payments.data.slice(0, 6) : [];

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">{user?.first_name ? `Welcome back, ${user.first_name}` : 'Finance dashboard'}</h1>
          <p className="sp-page-subtitle">{user?.college?.name ? `${user.college.name} · fee collection overview` : 'Fee collection overview'}</p>
        </div>
        <div className="sp-btn-row">
          <button type="button" className="sp-btn is-secondary" onClick={() => navigate('/finance/dues')}>Dues and reminders</button>
          <button type="button" className="sp-btn" onClick={() => navigate('/finance/records')}>Record a payment</button>
        </div>
      </div>

      <div className="sp-bento">
        <Kpi navy icon={IndianRupee} label="Total billed" summary={summary} onRetry={retry}
          render={(d) => <CurrencyCountUp value={d.billed} />}
          note={(d) => `${d.counts?.total ?? 0} fee records`} />
        <Kpi icon={Wallet} label="Collected" summary={summary} onRetry={retry}
          render={(d) => <CurrencyCountUp value={d.collected} />}
          note={(d) => `${d.counts?.paid ?? 0} fully paid, ${d.counts?.partial ?? 0} partly paid`} />
        <Kpi icon={Percent} label="Outstanding" summary={summary} onRetry={retry}
          render={(d) => <CurrencyCountUp value={d.outstanding} />}
          note={(d) => (typeof d.collection_rate === 'number' ? `Collection rate ${d.collection_rate}%` : 'Nothing billed yet')} />
        <Kpi icon={AlertTriangle} label="Overdue fees" summary={summary} onRetry={retry}
          render={(d) => <CountUp value={d.counts?.overdue ?? 0} />}
          note={(d) => `${formatCurrency(d.overdue_amount)} past due`} />

        <section className="sp-card sp-tile-2x2" aria-labelledby="fin-dept-chart">
          <div className="sp-card-head">
            <h2 id="fin-dept-chart" className="sp-section-title">Collection by department</h2>
            <button type="button" className="sp-link-btn" onClick={() => navigate('/finance/records')}>Fee records</button>
          </div>
          {summary.status === 'failed' ? (
            <FeesErrorState error={summary.error} onRetry={retry} />
          ) : summary.status !== 'succeeded' ? (
            <div className="sp-skeleton" style={{ height: 240, marginTop: 12 }} />
          ) : departments.length === 0 ? (
            <EmptyState title="No fees billed yet" message="Generate fees from a fee structure to see collection by department." />
          ) : (
            <>
              <SimpleBarChart
                title="Share of billed fees collected, by department"
                valueLabel="Collected"
                valueSuffix="%"
                maxValue={100}
                height={240}
                data={departments.map((d) => ({
                  label: d.department_code,
                  value: d.billed ? Math.round((d.collected / d.billed) * 1000) / 10 : 0,
                  note: `${formatCurrency(d.collected)} of ${formatCurrency(d.billed)}`,
                }))}
              />
              <div className="sp-table-wrap" style={{ marginTop: 12 }}>
                <table className="sp-table">
                  <thead>
                    <tr><th scope="col">Department</th><th scope="col" className="sp-num">Billed</th><th scope="col" className="sp-num">Collected</th><th scope="col" className="sp-num">Outstanding</th></tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr key={d.department_id}>
                        <td><span className="sp-code">{d.department_code}</span></td>
                        <td className="sp-num">{formatCurrency(d.billed)}</td>
                        <td className="sp-num">{formatCurrency(d.collected)}</td>
                        <td className="sp-num">{formatCurrency(d.billed - d.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="sp-card sp-tile-2" aria-labelledby="fin-status">
          <h2 id="fin-status" className="sp-section-title">Fee status</h2>
          {summary.status === 'succeeded' ? (
            <dl className="sp-details">
              <div><dt>Paid</dt><dd><span className="sp-badge is-success">{s.counts?.paid ?? 0}</span></dd></div>
              <div><dt>Partly paid</dt><dd><span className="sp-badge is-warning">{s.counts?.partial ?? 0}</span></dd></div>
              <div><dt>Pending</dt><dd><span className="sp-badge is-neutral">{s.counts?.pending ?? 0}</span></dd></div>
              <div><dt>Overdue</dt><dd><span className="sp-badge is-danger">{s.counts?.overdue ?? 0}</span></dd></div>
            </dl>
          ) : summary.status === 'failed' ? (
            <FeesErrorState error={summary.error} onRetry={retry} />
          ) : (
            <LoadingState lines={3} />
          )}
          {summary.status === 'succeeded' && (s.counts?.overdue ?? 0) > 0 && (
            <div className="sp-alert is-warning" style={{ marginTop: 12 }}>
              <span>{s.counts.overdue} fees are overdue ({formatCurrency(s.overdue_amount)}).</span>
              <button type="button" className="sp-link-btn" onClick={() => navigate('/finance/dues')}>Send reminders</button>
            </div>
          )}
        </section>

        <section className="sp-card sp-tile-2" aria-labelledby="fin-recent">
          <div className="sp-card-head">
            <h2 id="fin-recent" className="sp-section-title">Recent payments</h2>
            <button type="button" className="sp-link-btn" onClick={() => navigate('/finance/payments')}>All payments</button>
          </div>
          {payments.status === 'loading' && <LoadingState />}
          {payments.status === 'failed' && <FeesErrorState error={payments.error} onRetry={payments.reload} />}
          {payments.status === 'succeeded' && recent.length === 0 && (
            <EmptyState title="No payments yet" message="Payments you record and online payments by students appear here." />
          )}
          {recent.length > 0 && (
            <ul className="fin-list">
              {recent.map((p) => (
                <li key={p.payment_id}>
                  <div>
                    <strong>{p.student_name || 'Student'}</strong> <span className="sp-muted">{p.roll_no}</span>
                    <div className="sp-card-meta">{formatDate(p.paid_at)} · {modeLabel(p.mode)} · {p.receipt_no}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{formatCurrency(p.amount)}</strong>
                    <div><button type="button" className="sp-link-btn" onClick={() => setReceiptId(p.payment_id)}>Receipt</button></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {receiptId && <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />}
    </>
  );
}

export default function FinanceDashboard() {
  return (
    <FeesGate>
      <Dashboard />
    </FeesGate>
  );
}
