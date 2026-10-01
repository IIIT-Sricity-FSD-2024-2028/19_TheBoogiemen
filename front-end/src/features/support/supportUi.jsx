import React, { useEffect, useState } from 'react';
import { formatDateTime } from '../../shared/format';

/**
 * Vocabulary and small UI pieces shared by the Platform Support portal and the
 * college-side Help and support section. Mirrors back-end/src/support/support.service.ts
 * (LEVELS, STATUSES, PRIORITIES, sla()); the server stays the authority on rules.
 */

export const SALES_ROLE = 'PLATFORM_SALES_SUPPORT';

export const LEVELS = {
  PLATFORM_SUPPORT_AGENT: { tier: 1, name: 'L1 Support agent', short: 'L1' },
  PLATFORM_SALES_SUPPORT: { tier: 1, name: 'Sales and onboarding', short: 'Sales' },
  PLATFORM_TECH_SUPPORT: { tier: 2, name: 'L2 Technical support', short: 'L2' },
  PLATFORM_SUPPORT_MANAGER: { tier: 3, name: 'L3 Support manager', short: 'L3' },
  PLATFORM_SUPER_ADMIN: { tier: 4, name: 'L4 Platform admin', short: 'L4' },
};

export const TIER_NAMES = { 1: 'L1 Support agent', 2: 'L2 Technical support', 3: 'L3 Support manager', 4: 'L4 Platform admin' };

/** { role, tier, name, short, isSales } for the signed-in staff member. */
export function levelOf(user) {
  const def = LEVELS[user?.role];
  const tier = Number(user?.tier_level ?? def?.tier ?? 0);
  return { role: user?.role, tier, name: def?.name ?? `L${tier}`, short: def?.short ?? `L${tier}`, isSales: user?.role === SALES_ROLE };
}

export const isStaffRole = (role) => !!LEVELS[role];

export const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_on_customer: 'Waiting on customer',
  resolved: 'Resolved',
  closed: 'Closed',
};
const STATUS_TONE = { open: 'is-info', in_progress: 'is-info', waiting_on_customer: 'is-warning', resolved: 'is-success', closed: 'is-neutral' };
const PRIORITY_TONE = { critical: 'is-danger', high: 'is-warning', medium: 'is-info', low: 'is-neutral' };

export const PRIORITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
export const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

export function StatusBadge({ status }) {
  return <span className={`sp-badge ${STATUS_TONE[status] || 'is-neutral'}`}>{STATUS_LABEL[status] || status}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`sp-badge ${PRIORITY_TONE[priority] || 'is-neutral'}`}>{PRIORITY_LABEL[priority] || priority}</span>;
}

/** Re-renders every `ms` so countdowns stay current. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function formatDuration(msAbs) {
  const minutes = Math.max(0, Math.round(msAbs / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim();
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24 ? `${hours % 24} h` : ''}`.trim();
}

/**
 * SLA badge from the server's sla object: breached is red, at risk amber,
 * met green, on track neutral navy. Shows a live countdown to the next target.
 */
export function SlaBadge({ sla, compact }) {
  const now = useNow();
  if (!sla) return null;
  const due = sla.next_due ? Date.parse(sla.next_due) : null;
  const left = due ? due - now : null;
  let text;
  let tone;
  if (sla.status === 'breached') {
    tone = 'is-danger';
    text = left !== null && left < 0 ? `SLA breached ${formatDuration(-left)} ago` : 'SLA breached';
  } else if (sla.status === 'met') {
    tone = 'is-success';
    text = 'SLA met';
  } else if (sla.status === 'at_risk') {
    tone = 'is-warning';
    text = left !== null ? (left < 0 ? `Overdue ${formatDuration(-left)}` : `At risk: ${formatDuration(left)} left`) : 'At risk';
  } else {
    tone = 'is-info';
    text = left !== null ? `Due in ${formatDuration(left)}` : 'On track';
  }
  if (compact && sla.status === 'breached') text = 'SLA breached';
  return (
    <span className={`sp-badge ${tone}`} title={sla.next_due ? `Next target ${formatDateTime(sla.next_due)}` : undefined}>
      {text}
    </span>
  );
}

/** Has a platform staff member sent a public reply (required before resolving)? */
export function hasStaffReply(ticket) {
  return (ticket?.messages || []).some((m) => m.kind === 'public' && isStaffRole(m.author_role));
}

export const REOPEN_DAYS = 7;

/** One message in a ticket thread. Internal notes are marked and never reach the college. */
export function ThreadMessage({ message, viewer }) {
  const staff = isStaffRole(message.author_role);
  const internal = message.kind === 'internal';
  const who = staff
    ? viewer === 'college'
      ? `${message.author_name} · Support team`
      : `${message.author_name} · ${LEVELS[message.author_role]?.name || 'Support'}`
    : `${message.author_name} · ${viewer === 'college' ? 'Your institution' : 'Customer'}`;
  return (
    <li className={`sup-msg${staff ? ' is-staff' : ' is-customer'}${internal ? ' is-internal' : ''}`}>
      <div className="sup-msg-head">
        <strong>{who}</strong>
        {internal && <span className="sp-badge is-neutral">Internal note</span>}
        <span className="sp-muted">{formatDateTime(message.created_at)}</span>
      </div>
      <p className="sup-msg-text">{message.text}</p>
    </li>
  );
}
