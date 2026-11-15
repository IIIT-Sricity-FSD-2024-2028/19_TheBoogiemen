/**
 * riskAlerts.js — FR10: the system must notify a student automatically when
 * they cross the at-risk threshold, not only when a faculty member notices
 * and writes a manual alert (SendAlertModal). Fires once per student per
 * distinct set of risk reasons — a re-render or a second faculty page
 * loading the same list won't resend it, but a NEW reason (e.g. CGPA
 * dropping on top of an existing attendance flag) gets its own notification.
 *
 * Dedup state lives in localStorage, the same store every other
 * notification in this app already uses (NotificationsContext.jsx) — there
 * is no backend notification table to persist this server-side against.
 */
const SENT_KEY = 'bp_risk_alerts_sent';

function readSent() {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * students: [{ user_id, risk_reasons: string[] }]
 * send: NotificationsContext's `send(toUserId, fromName, message, type)`
 */
export function autoAlertAtRiskStudents(students, send) {
  const sent = readSent();
  let changed = false;
  (students || []).forEach((s) => {
    const reasons = s.risk_reasons || [];
    if (!reasons.length) return;
    const signature = reasons.slice().sort().join('|');
    if (sent[s.user_id] === signature) return;
    send(s.user_id, 'System', `⚠ Automated alert: ${reasons.join('; ')}. Please take corrective action.`, 'alert');
    sent[s.user_id] = signature;
    changed = true;
  });
  if (changed) localStorage.setItem(SENT_KEY, JSON.stringify(sent));
}
