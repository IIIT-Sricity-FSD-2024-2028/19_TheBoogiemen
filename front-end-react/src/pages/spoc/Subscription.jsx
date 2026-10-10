/**
 * Subscription — ported from spoc.html's subscription-view +
 * loadSubscriptionAndAdmins()'s plan-rendering half (the admin-roster half
 * lives in Team.jsx; both panels read the same /billing/colleges/me call,
 * fetched separately per view like every other phase's pages do).
 *
 * The legacy page overrode .metrics-grid to a fixed 3 columns for its 4
 * cards (which actually wraps oddly); the shared .metrics-grid's own
 * auto-fit already lays out 4 cards cleanly, so that override isn't ported.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

const PLAN_STATUS_LABEL = { active: 'Active', expiring_soon: 'Expiring soon', expired: 'Expired' };
const MODULE_LABEL = { research: 'Research', fees: 'Fees', forum: 'Discussion Forum', analytics: 'Analytics' };
const PILL_COLORS = {
  active: { bg: '#dcfce7', c: '#166534' },
  expiring_soon: { bg: '#fef9c3', c: '#854d0e' },
  expired: { bg: '#fef2f2', c: '#991b1b' },
  none: { bg: '#f1f5f9', c: '#64748b' },
};

function StatusPill({ status, label }) {
  const sc = PILL_COLORS[status] || PILL_COLORS.none;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.c }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      {label}
    </span>
  );
}

function formatRupees(paise) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function Subscription() {
  const [college, setCollege] = useState(undefined);

  useEffect(() => {
    apiFetch('/billing/colleges/me')
      .then((res) => setCollege(res?.data))
      .catch(() => setCollege(null));
  }, []);

  if (college === undefined) return null;
  if (!college) return <p style={{ color: '#ef4444', padding: '12px 0' }}>Failed to load subscription.</p>;

  const plan = college.plan;

  return (
    <>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="label">Plan Status</div>
          <div className="value" style={{ fontSize: 16, marginTop: 10 }}>
            {plan ? <StatusPill status={plan.status} label={PLAN_STATUS_LABEL[plan.status]} /> : <StatusPill status="none" label="No active plan" />}
          </div>
          <div className="sub">{plan?.payable_paise != null ? `${formatRupees(plan.payable_paise)}/yr` : ''}</div>
        </div>
        <div className="metric-card">
          <div className="label">Student Seats</div>
          <div className="value">{plan ? `${college.student_count || 0} / ${plan.student_seats}` : String(college.student_count || 0)}</div>
          <div className="sub">enrolled / purchased</div>
        </div>
        <div className="metric-card">
          <div className="label">Faculty Seats</div>
          <div className="value">{plan ? `${college.faculty_count || 0} / ${plan.faculty_seats}` : String(college.faculty_count || 0)}</div>
          <div className="sub">enrolled / purchased</div>
        </div>
        <div className="metric-card">
          <div className="label">Renewal</div>
          <div className="value" style={{ fontSize: 16, marginTop: 10 }}>
            {plan ? (
              <span style={plan.status !== 'expired' ? undefined : { color: '#991b1b' }}>
                {plan.status === 'expired' ? `Expired ${new Date(plan.ends_on).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : new Date(plan.ends_on).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>—</span>
            )}
          </div>
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header"><div><h3>About your plan</h3></div></div>
        <div className="stats-card-body" style={{ padding: '20px 24px' }}>
          {plan ? (
            <>
              Seats: {plan.student_seats} students, {plan.faculty_seats} faculty. Modules included:{' '}
              {plan.modules.length ? plan.modules.map((m) => MODULE_LABEL[m] || m).join(', ') : 'none beyond the core dashboard'}.
              {plan.status === 'expired' && ' Your plan has expired — hiring new staff/students and the modules below are on hold until you renew.'}
              {plan.status === 'expiring_soon' && ' Your plan renews soon — contact support to keep it active.'}
            </>
          ) : (
            'No subscription is on record for your institution. Contact support if this looks wrong.'
          )}
        </div>
      </div>
    </>
  );
}
