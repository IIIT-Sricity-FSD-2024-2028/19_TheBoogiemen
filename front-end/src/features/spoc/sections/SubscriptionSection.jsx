import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { EmptyState, ErrorState, LoadingState, ProgressBar } from '../../../shared/ui/StatusViews';
import { capitalize, formatDate, formatDateTime } from '../../../shared/format';
import { paiseToRupees } from '../../college/collegeShared';
import { fetchSpocOverview, selectSpocResource } from '../spocSlice';
import { MODULE_LABEL, PAYMENT_TONE, PLAN_STATUS, seatPercent, seatTone } from '../spocShared';

const ALL_MODULES = ['research', 'analytics', 'fees', 'forum'];

/** Plan, modules, seats and payments (GET /college/overview) with plan details from GET /billing/plans. */
export default function SubscriptionSection() {
  const dispatch = useDispatch();
  const overview = useSelector(selectSpocResource('overview'));
  const plans = useApiResource('/billing/plans');

  useEffect(() => {
    dispatch(fetchSpocOverview());
  }, [dispatch]);

  const reload = () => dispatch(fetchSpocOverview({ force: true }));
  const data = overview.data;
  const sub = data?.subscription;
  const planList = Array.isArray(plans.data?.data) ? plans.data.data : [];
  const currentPlan = sub?.plan_key ? planList.find((p) => p.key === sub.plan_key) : null;
  const status = sub ? PLAN_STATUS[sub.plan_status] || { label: capitalize(sub.plan_status), tone: 'is-neutral' } : null;

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Subscription</h1>
          <p className="sp-page-subtitle">Your plan, licensed modules, seats and payments</p>
        </div>
        <Link to="/spoc/support" className="sp-btn is-secondary">Contact support</Link>
      </div>

      {!data && overview.status === 'failed' && <div className="sp-card"><ErrorState error={overview.error} onRetry={reload} /></div>}
      {!data && overview.status !== 'failed' && <div className="sp-card"><LoadingState label="Loading subscription" lines={6} /></div>}

      {data && (
        <div className="sp-grid sp-grid-2">
          <section className="sp-card" aria-labelledby="sub-plan">
            <div className="sp-card-head">
              <h2 id="sub-plan" className="sp-section-title">Current plan</h2>
              {status && <span className={`sp-badge ${status.tone}`}>{status.label}</span>}
            </div>
            {!sub ? (
              <EmptyState title="No active subscription" message="Raise a ticket under Help & Support to activate or renew a plan." />
            ) : (
              <>
                <dl className="sp-details">
                  <div><dt>Plan</dt><dd>{currentPlan?.name || (sub.plan_key ? capitalize(sub.plan_key) : 'Custom (priced by size)')}</dd></div>
                  <div><dt>Starts</dt><dd>{formatDate(sub.starts_on)}</dd></div>
                  <div><dt>Ends</dt><dd>{formatDate(sub.ends_on)}</dd></div>
                  <div><dt>Student seats</dt><dd>{sub.student_seats}</dd></div>
                  <div><dt>Faculty seats</dt><dd>{sub.faculty_seats}</dd></div>
                </dl>
                {sub.plan_status === 'expiring_soon' && <div className="sp-alert is-warning" role="status" style={{ marginTop: 14 }}><span>Your plan ends on {formatDate(sub.ends_on)}. Contact support to renew.</span></div>}
                {sub.plan_status === 'expired' && <div className="sp-alert is-error" role="alert" style={{ marginTop: 14 }}><span>Your plan expired on {formatDate(sub.ends_on)}. Contact support to renew.</span></div>}
              </>
            )}
          </section>

          <section className="sp-card" aria-labelledby="sub-seats">
            <h2 id="sub-seats" className="sp-section-title">Seats</h2>
            {[['students', 'Student seats'], ['faculty', 'Faculty seats (incl. HODs)']].map(([key, label]) => {
              const seat = data.seats[key];
              const pct = seatPercent(seat);
              return (
                <div key={key} className="spoc-seat">
                  <div className="spoc-seat-row">
                    <span>{label}</span>
                    <strong>{seat.total === null ? `${seat.used} used` : `${seat.used} of ${seat.total} · ${Math.max(0, seat.total - seat.used)} free`}</strong>
                  </div>
                  <ProgressBar value={pct} tone={seatTone(pct)} label={`${label} used`} />
                </div>
              );
            })}
            <p className="sp-hint" style={{ margin: 0 }}>Deactivating an account frees its seat. To add seats, contact support.</p>
          </section>

          <section className="sp-card" aria-labelledby="sub-mod">
            <h2 id="sub-mod" className="sp-section-title">Modules</h2>
            <ul className="spoc-checklist">
              <li>
                <span className="spoc-check is-done" aria-hidden="true"><Check size={13} /></span>
                <span>Core academics (attendance, courses, assessments, leave)</span>
                <span className="sp-badge is-success">Included</span>
              </li>
              {ALL_MODULES.map((m) => {
                const on = !!sub?.modules?.includes(m);
                return (
                  <li key={m}>
                    <span className={`spoc-check${on ? ' is-done' : ''}`} aria-hidden="true"><Check size={13} /></span>
                    <span>{MODULE_LABEL[m]}</span>
                    <span className={`sp-badge ${on ? 'is-success' : 'is-neutral'}`}>{on ? 'Licensed' : 'Not licensed'}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="sp-card" aria-labelledby="sub-pay">
            <h2 id="sub-pay" className="sp-section-title">Payments</h2>
            {data.payments.length === 0 ? (
              <EmptyState title="No payments recorded" message="Payments made for your subscription appear here." />
            ) : (
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead><tr><th scope="col">Date</th><th scope="col" className="sp-num">Amount</th><th scope="col">Status</th></tr></thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.payment_id}>
                        <td>{formatDateTime(p.created_at)}</td>
                        <td className="sp-num">{paiseToRupees(p.amount_paise)}</td>
                        <td><span className={`sp-badge ${PAYMENT_TONE[p.status] || 'is-neutral'}`}>{capitalize(p.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <section className="sp-card" style={{ marginTop: 18 }} aria-labelledby="sub-plans">
        <h2 id="sub-plans" className="sp-section-title">Available plans</h2>
        <p className="sp-muted" style={{ margin: '2px 0 14px' }}>Prices come from the live rate card and include 18% GST. To change plan, raise a ticket under Help &amp; Support.</p>
        {plans.status === 'loading' && <LoadingState label="Loading plans" />}
        {plans.status === 'failed' && <ErrorState error={plans.error} onRetry={plans.reload} />}
        {plans.status === 'succeeded' && (planList.length === 0 ? (
          <EmptyState title="No plans published" />
        ) : (
          <div className="spoc-plan-grid">
            {planList.map((p) => (
              <article key={p.key} className={`spoc-plan${p.key === sub?.plan_key ? ' is-current' : ''}`}>
                <div className="sp-card-head">
                  <h3 className="sp-card-title">{p.name}</h3>
                  {p.key === sub?.plan_key && <span className="sp-badge is-info">Your plan</span>}
                </div>
                <div className="sp-muted" style={{ fontSize: 13 }}>{p.tagline} · {p.audience}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{paiseToRupees(p.per_year_paise)} <span className="sp-muted" style={{ fontSize: 13, fontWeight: 500 }}>per year</span></div>
                <div className="sp-muted" style={{ fontSize: 13 }}>
                  {p.metrics.student_count.toLocaleString('en-IN')} students · {p.metrics.faculty_count} faculty · {p.metrics.term_years}-year term
                </div>
                <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              </article>
            ))}
          </div>
        ))}
      </section>
    </>
  );
}
