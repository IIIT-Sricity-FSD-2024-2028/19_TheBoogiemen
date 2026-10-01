import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, Clock, Hourglass, Inbox, UserCheck, UserX } from 'lucide-react';
import CountUp from '../../../shared/ui/CountUp';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { EmptyState, ErrorState, LoadingState, ResourceView } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { fetchSupportSummary, selectSupportResource } from '../supportSlice';
import { PRIORITY_LABEL, PriorityBadge, SlaBadge, StatusBadge, TIER_NAMES, levelOf } from '../supportUi';

/** What each level handles and may do; mirrors the rules in SupportService. */
const LEVEL_GUIDE = [
  {
    key: 'L1',
    roles: ['PLATFORM_SUPPORT_AGENT'],
    name: 'L1 Support agent',
    handles: 'First response on every new ticket: access, accounts, how-to questions.',
    can: 'Reply, add internal notes, take a ticket, mark waiting or resolved, escalate to L2.',
  },
  {
    key: 'Sales',
    roles: ['PLATFORM_SALES_SUPPORT'],
    name: 'Sales and onboarding',
    handles: 'Billing and fees tickets only, at any level. Institutions and onboarding pipeline (read).',
    can: 'Reply, take a ticket, resolve, escalate one level at a time up to L3.',
  },
  {
    key: 'L2',
    roles: ['PLATFORM_TECH_SUPPORT'],
    name: 'L2 Technical support',
    handles: 'Tickets escalated from L1: bugs, reports, data and configuration problems.',
    can: 'Everything L1 can on L2 tickets, and escalate to L3.',
  },
  {
    key: 'L3',
    roles: ['PLATFORM_SUPPORT_MANAGER'],
    name: 'L3 Support manager',
    handles: 'Every ticket in the queue, SLA breaches and customer escalations.',
    can: 'Assign to anyone at the ticket level or above, change priority, close tickets, escalate to L4. Team and analytics.',
  },
  {
    key: 'L4',
    roles: ['PLATFORM_SUPER_ADMIN'],
    name: 'L4 Platform admin',
    handles: 'Platform-wide issues, subscriptions and institution status.',
    can: 'Everything L3 can, plus suspend institutions, change seats, extend plans and manage staff.',
  },
];

function StatTile({ icon: Icon, label, value, note, navy, tone, onClick, resource, onRetry }) {
  let body;
  if (resource.status === 'failed') {
    body = (
      <div className="sp-stat-note">
        Failed to load. <button type="button" className="sp-link-btn" onClick={onRetry}>Retry</button>
      </div>
    );
  } else if (resource.status !== 'succeeded') {
    body = <div className="sp-skeleton" style={{ height: 30, width: '50%', marginTop: 6, opacity: navy ? 0.3 : 1 }} />;
  } else {
    body = (
      <>
        <div className="sp-stat-value" style={tone && value > 0 ? { color: tone } : undefined}><CountUp value={value} /></div>
        {note && <div className="sp-stat-note">{note}</div>}
      </>
    );
  }
  return (
    <div className={`sp-card${navy ? ' is-navy' : ''}`}>
      <div className="sp-tile-icon" aria-hidden="true"><Icon size={19} /></div>
      <div className="sp-stat-label">{label}</div>
      {body}
      {onClick && resource.status === 'succeeded' && (
        <button type="button" className="sp-link-btn" onClick={onClick} style={{ marginTop: 6 }}>Open in queue</button>
      )}
    </div>
  );
}

export default function SupportDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const level = levelOf(user);
  const summary = useSelector(selectSupportResource('summary'));
  const meta = useApiResource('/support/meta');
  const attention = useApiResource('/platform/tickets?status=active');

  useEffect(() => {
    dispatch(fetchSupportSummary({ force: true }));
  }, [dispatch]);
  const retry = () => dispatch(fetchSupportSummary({ force: true }));
  const s = summary.data || {};
  const toQueue = (qs) => navigate(`/support/queue${qs ? `?${qs}` : ''}`);
  const scopeNote = level.isSales ? 'Billing and fees tickets' : level.tier >= 3 ? 'All tickets on the platform' : `Tickets at L${level.tier} and tickets assigned to you`;

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">{user?.first_name ? `Welcome, ${user.first_name}` : 'Support desk'}</h1>
          <p className="sp-page-subtitle">Your queue: {scopeNote}.</p>
          <div className="sup-hero-level">
            <span>{level.short}</span>
            <span aria-hidden="true">·</span>
            <span>{String(summary.data?.level?.name || level.name).replace(/^L\d\s+/, '')}</span>
          </div>
        </div>
        <button type="button" className="sp-btn" onClick={() => toQueue('')}>
          <Inbox size={15} /> Open ticket queue
        </button>
      </div>

      <div className="sp-bento">
        <StatTile navy icon={Inbox} label="Active tickets" value={s.active ?? 0} note={scopeNote} resource={summary} onRetry={retry} onClick={() => toQueue('status=active')} />
        <StatTile icon={AlertTriangle} label="SLA breached" value={s.breached ?? 0} tone="var(--sp-danger)" note="Active tickets past a response or resolution target" resource={summary} onRetry={retry} onClick={() => toQueue('sla=breached')} />
        <StatTile icon={Clock} label="At risk" value={s.at_risk ?? 0} tone="var(--sp-warning)" note="Under 25% of the SLA window left" resource={summary} onRetry={retry} onClick={() => toQueue('sla=at_risk')} />
        <StatTile icon={UserCheck} label="Assigned to me" value={s.assigned_to_me ?? 0} note="Active tickets you own" resource={summary} onRetry={retry} onClick={() => toQueue('assignee=me')} />
        <StatTile icon={UserX} label="Unassigned" value={s.unassigned ?? 0} note="Waiting for someone to take them" resource={summary} onRetry={retry} onClick={() => toQueue('assignee=unassigned')} />
        <StatTile icon={Hourglass} label="Waiting on customer" value={s.waiting_on_customer ?? 0} note="Paused until the college replies" resource={summary} onRetry={retry} onClick={() => toQueue('status=waiting_on_customer')} />

        <section className="sp-card sp-tile-2" aria-labelledby="sup-by-priority">
          <h2 id="sup-by-priority" className="sp-section-title">Active tickets by priority</h2>
          <ResourceView resource={summary} onRetry={retry} isEmpty={(d) => !d?.active} empty={<EmptyState title="Queue is clear" message="No active tickets in your queue." />}>
            {(d) => (
              <SimpleBarChart
                title="Active tickets by priority"
                valueLabel="Tickets"
                height={220}
                data={[...d.by_priority].reverse().map((p) => ({ label: PRIORITY_LABEL[p.priority] || p.priority, value: p.count }))}
              />
            )}
          </ResourceView>
        </section>

        <section className="sp-card sp-tile-2" aria-labelledby="sup-by-tier">
          <h2 id="sup-by-tier" className="sp-section-title">Active tickets by level</h2>
          <ResourceView resource={summary} onRetry={retry} isEmpty={(d) => !d?.active} empty={<EmptyState title="Queue is clear" message="No active tickets in your queue." />}>
            {(d) => (
              <SimpleBarChart
                title="Active tickets by support level"
                valueLabel="Tickets"
                height={220}
                data={d.by_tier.map((t) => ({ label: `L${t.tier}`, fullLabel: TIER_NAMES[t.tier], value: t.count }))}
              />
            )}
          </ResourceView>
        </section>

        <section className="sp-card sp-tile-4" aria-labelledby="sup-attention">
          <div className="sp-card-head">
            <h2 id="sup-attention" className="sp-section-title">Needs attention</h2>
            <button type="button" className="sp-link-btn" onClick={() => toQueue('status=active')}>Full queue</button>
          </div>
          <p className="sp-muted" style={{ marginTop: 0 }}>Breached first, then by priority and age.</p>
          <ResourceView
            resource={attention}
            onRetry={attention.reload}
            isEmpty={(d) => !d?.length}
            empty={<EmptyState title="Nothing waiting" message="There are no active tickets in your queue." />}
          >
            {(rows) => (
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th scope="col">Ticket</th>
                      <th scope="col">Institution</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Status</th>
                      <th scope="col">Level</th>
                      <th scope="col">SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 6).map((t) => (
                      <tr key={t.ticket_id}>
                        <td>
                          <button type="button" className="sp-link-btn" onClick={() => toQueue(`t=${encodeURIComponent(t.ticket_id)}&status=active`)}>
                            {t.display_id}
                          </button>
                          <div className="sp-card-meta">{t.subject}</div>
                        </td>
                        <td>{t.college_name || 'Unknown institution'}</td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>L{t.tier}</td>
                        <td><SlaBadge sla={t.sla} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ResourceView>
        </section>

        <section className="sp-card sp-tile-4" aria-labelledby="sup-levels">
          <h2 id="sup-levels" className="sp-section-title">Support levels</h2>
          <p className="sp-muted" style={{ marginTop: 0 }}>
            New tickets start at L1. Escalation only moves up; L1 and L2 go one level at a time, managers can jump to any higher level.
            Billing and fees tickets are also handled by Sales.
          </p>
          <div className="sup-path" aria-label="Escalation path">
            {['L1', 'L2', 'L3', 'L4'].map((k, i) => (
              <React.Fragment key={k}>
                {i > 0 && <span className="sup-path-arrow" aria-hidden="true">&rarr;</span>}
                <span className={`sup-path-step${!level.isSales && level.short === k ? ' is-you' : ''}`}>{TIER_NAMES[i + 1]}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="sp-table-wrap" style={{ marginTop: 12 }}>
            <table className="sp-table sup-level-table">
              <thead>
                <tr>
                  <th scope="col">Level</th>
                  <th scope="col">Handles</th>
                  <th scope="col">Can</th>
                </tr>
              </thead>
              <tbody>
                {LEVEL_GUIDE.map((g) => (
                  <tr key={g.key}>
                    <td>
                      <strong>{g.name}</strong>
                      {g.roles.includes(user?.role) && <div><span className="sp-badge is-info">You</span></div>}
                    </td>
                    <td>{g.handles}</td>
                    <td>{g.can}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="sup-block-title" style={{ marginTop: 18 }}>SLA targets</h3>
          {meta.status === 'loading' && <LoadingState lines={2} />}
          {meta.status === 'failed' && <ErrorState error={meta.error} onRetry={meta.reload} />}
          {meta.status === 'succeeded' && (
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th scope="col">Priority</th>
                    <th scope="col" className="sp-num">First response</th>
                    <th scope="col" className="sp-num">Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {(meta.data?.priorities || []).slice().reverse().map((p) => (
                    <tr key={p}>
                      <td><PriorityBadge priority={p} /></td>
                      <td className="sp-num">{meta.data.sla_hours?.[p]?.response} h</td>
                      <td className="sp-num">{meta.data.sla_hours?.[p]?.resolution} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="sp-hint">Clocks start when the ticket is raised. A ticket is at risk when under a quarter of its window remains.</p>
        </section>
      </div>
    </>
  );
}
