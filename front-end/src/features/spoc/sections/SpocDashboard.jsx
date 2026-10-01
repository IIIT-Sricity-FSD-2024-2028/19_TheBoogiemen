import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Check, CreditCard, GraduationCap, Users } from 'lucide-react';
import CountUp from '../../../shared/ui/CountUp';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { EmptyState, ErrorState, ProgressBar } from '../../../shared/ui/StatusViews';
import { capitalize, formatDate } from '../../../shared/format';
import { selectCurrentUser } from '../../auth/authSlice';
import { paiseToRupees } from '../../college/collegeShared';
import { fetchSpocOverview, selectSpocResource } from '../spocSlice';
import { MODULE_LABEL, PAYMENT_TONE, PLAN_STATUS, SETUP_STEPS, seatPercent, seatTone } from '../spocShared';

function Skeleton() {
  return (
    <div className="sp-bento" role="status" aria-label="Loading dashboard">
      <div className="sp-card sp-tile-2"><div className="sp-skeleton" style={{ height: 120 }} /></div>
      <div className="sp-card"><div className="sp-skeleton" style={{ height: 120 }} /></div>
      <div className="sp-card"><div className="sp-skeleton" style={{ height: 120 }} /></div>
      <div className="sp-card sp-tile-2"><div className="sp-skeleton" style={{ height: 200 }} /></div>
      <div className="sp-card sp-tile-2"><div className="sp-skeleton" style={{ height: 200 }} /></div>
    </div>
  );
}

function SeatBar({ label, seat }) {
  const pct = seatPercent(seat);
  return (
    <div className="spoc-seat">
      <div className="spoc-seat-row">
        <span>{label}</span>
        <strong>{seat.total === null ? `${seat.used} used` : `${seat.used} of ${seat.total} (${pct}%)`}</strong>
      </div>
      <ProgressBar value={pct} tone={seatTone(pct)} label={`${label} used`} />
    </div>
  );
}

export default function SpocDashboard() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const overview = useSelector(selectSpocResource('overview'));

  useEffect(() => {
    // Always refresh on entry: people and setup change in other sections.
    dispatch(fetchSpocOverview({ force: true }));
  }, [dispatch]);

  const data = overview.data;
  const reload = () => dispatch(fetchSpocOverview({ force: true }));

  const header = (
    <div className="sp-page-header">
      <div>
        <h1 className="sp-page-title">{user?.first_name ? `Welcome, ${user.first_name}` : 'Dashboard'}</h1>
        <p className="sp-page-subtitle">
          {data?.college ? `${data.college.name} · ${data.college.code}${data.college.city ? ` · ${data.college.city}` : ''}` : 'Your institute at a glance'}
        </p>
      </div>
      <Link to="/spoc/people" className="sp-btn is-secondary"><Users size={15} /> Manage people</Link>
    </div>
  );

  if (!data && overview.status === 'failed') return <>{header}<div className="sp-card"><ErrorState error={overview.error} onRetry={reload} /></div></>;
  if (!data) return <>{header}<Skeleton /></>;

  const { subscription: sub, seats, people, setup, payments } = data;
  const steps = setup?.steps || {};
  const doneCount = SETUP_STEPS.filter((s) => steps[s.key]).length;
  const setupDone = !!setup?.completed_at;
  const status = sub ? PLAN_STATUS[sub.plan_status] || { label: capitalize(sub.plan_status), tone: 'is-neutral' } : null;
  const peopleData = [
    { label: 'Students', value: people.students },
    { label: 'Faculty', value: people.faculty },
    { label: 'HODs', value: people.hods },
    { label: 'Directors', value: people.directors },
    { label: 'Finance', value: people.finance },
  ];
  const totalPeople = peopleData.reduce((s, r) => s + r.value, 0);

  return (
    <>
      {header}
      {!setupDone && (
        <div className="spoc-cta" role="region" aria-label="Setup">
          <div>
            <h2>Finish setting up your college</h2>
            <p>{doneCount} of {SETUP_STEPS.length} steps done. Departments, programmes and batches are needed before people can be added.</p>
          </div>
          <Link to="/spoc/setup" className="sp-btn is-light">Continue setup <ArrowRight size={15} /></Link>
        </div>
      )}
      {overview.status === 'failed' && (
        <div className="sp-alert is-error" role="alert" style={{ marginBottom: 14 }}>
          <span>Could not refresh: {overview.error?.message}</span>
          <button type="button" className="sp-link-btn" onClick={reload}>Retry</button>
        </div>
      )}

      <div className="sp-bento">
        <section className="sp-card is-navy sp-tile-2" aria-labelledby="sd-plan">
          <div className="sp-tile-icon" aria-hidden="true"><CreditCard size={19} /></div>
          <div className="sp-stat-label" id="sd-plan">Plan</div>
          {sub ? (
            <>
              <div className="sp-stat-value">{sub.plan_key ? capitalize(sub.plan_key) : 'Custom plan'}</div>
              <div className="sp-stat-note">
                <span className={`sp-badge ${status.tone}`}>{status.label}</span>{' '}
                Valid {formatDate(sub.starts_on)} to {formatDate(sub.ends_on)}
              </div>
              <div className="sp-stat-note" style={{ marginTop: 8 }}>
                {sub.modules?.length ? `Modules: ${sub.modules.map((m) => MODULE_LABEL[m] || m).join(', ')}` : 'Core academics only, no add-on modules'}
              </div>
            </>
          ) : (
            <>
              <div className="sp-stat-value">No active plan</div>
              <div className="sp-stat-note">Contact support to activate a subscription.</div>
            </>
          )}
          <Link to="/spoc/subscription" className="sp-btn is-light is-small" style={{ marginTop: 12 }}>View subscription</Link>
        </section>

        <div className="sp-card">
          <div className="sp-tile-icon" aria-hidden="true"><GraduationCap size={19} /></div>
          <div className="sp-stat-label">Active students</div>
          <div className="sp-stat-value"><CountUp value={people.students} /></div>
          <div className="sp-stat-note">{seats.students.total === null ? 'No seat limit set' : `${Math.max(0, seats.students.total - seats.students.used)} seats free`}</div>
        </div>
        <div className="sp-card">
          <div className="sp-tile-icon" aria-hidden="true"><Building2 size={19} /></div>
          <div className="sp-stat-label">Departments</div>
          <div className="sp-stat-value"><CountUp value={data.departments} /></div>
          <div className="sp-stat-note">{people.hods} HOD{people.hods === 1 ? '' : 's'} · {people.faculty} faculty</div>
        </div>

        <section className="sp-card sp-tile-2" aria-labelledby="sd-seats">
          <div className="sp-card-head">
            <h2 id="sd-seats" className="sp-section-title">Seat usage</h2>
            <Link to="/spoc/people" className="sp-link-btn">People</Link>
          </div>
          <SeatBar label="Student seats" seat={seats.students} />
          <SeatBar label="Faculty seats (incl. HODs)" seat={seats.faculty} />
          {!sub && <p className="sp-muted" style={{ margin: 0 }}>Seat limits apply once a plan is active.</p>}
        </section>

        <section className="sp-card sp-tile-2" aria-labelledby="sd-setup">
          <div className="sp-card-head">
            <h2 id="sd-setup" className="sp-section-title">Setup progress</h2>
            <span className={`sp-badge ${setupDone ? 'is-success' : 'is-warning'}`}>{setupDone ? `Completed ${formatDate(setup.completed_at)}` : `${doneCount} of ${SETUP_STEPS.length}`}</span>
          </div>
          <ul className="spoc-checklist">
            {SETUP_STEPS.map((s) => (
              <li key={s.key}>
                <span className={`spoc-check${steps[s.key] ? ' is-done' : ''}`} aria-hidden="true"><Check size={13} /></span>
                <span>{s.label}</span>
                <span className="sp-visually-hidden">{steps[s.key] ? '(done)' : '(not done)'}</span>
              </li>
            ))}
          </ul>
          {!setupDone && <Link to="/spoc/setup" className="sp-btn is-small" style={{ marginTop: 12 }}>Continue setup</Link>}
        </section>

        <section className="sp-card sp-tile-2" aria-labelledby="sd-people">
          <h2 id="sd-people" className="sp-section-title">People by role</h2>
          {totalPeople === 0 ? (
            <EmptyState title="No people yet" message="Add students, faculty and staff from the People section." />
          ) : (
            <SimpleBarChart title="Active people by role" valueLabel="Active accounts" data={peopleData} height={220} />
          )}
        </section>

        <section className="sp-card sp-tile-2" aria-labelledby="sd-pay">
          <h2 id="sd-pay" className="sp-section-title">Payments</h2>
          {payments.length === 0 ? (
            <EmptyState title="No payments recorded" message="Payments made for your subscription appear here." />
          ) : (
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead><tr><th scope="col">Date</th><th scope="col" className="sp-num">Amount</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {payments.slice(0, 5).map((p) => (
                    <tr key={p.payment_id}>
                      <td>{formatDate(p.created_at)}</td>
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
    </>
  );
}
