import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { formatDateTime, timeAgo } from '../../../shared/format';
import { fetchSupportSummary, fetchSupportTeam, selectSupportResource } from '../supportSlice';
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  PriorityBadge,
  STATUS_LABEL,
  SlaBadge,
  StatusBadge,
  TIER_NAMES,
  ThreadMessage,
  hasStaffReply,
  levelOf,
} from '../supportUi';

const BILLING = 'Billing and fees';
const STATUS_FILTERS = [
  ['active', 'Active'],
  ['all', 'All'],
  ['open', 'Open'],
  ['in_progress', 'In progress'],
  ['waiting_on_customer', 'Waiting on customer'],
  ['resolved', 'Resolved'],
  ['closed', 'Closed'],
];
const FILTER_KEYS = ['status', 'priority', 'tier', 'assignee', 'sla', 'search'];

/** Whether this staff member still sees the ticket (same rule as SupportService.visible). */
function stillVisible(level, userId, t) {
  if (level.isSales) return t.category === BILLING;
  if (level.tier >= 3) return true;
  return t.tier === level.tier || t.assigned_to_id === userId;
}

function Filters({ params, setParam }) {
  const [search, setSearch] = useState(params.get('search') || '');
  const current = params.get('search') || '';
  useEffect(() => {
    if (search.trim() === current) return undefined;
    const id = setTimeout(() => setParam('search', search.trim()), 300);
    return () => clearTimeout(id);
  }, [search, current, setParam]);

  return (
    <div className="sup-filters" role="group" aria-label="Queue filters">
      <div className="sp-field" style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="q-search">Search</label>
        <input id="q-search" className="sp-input" type="search" placeholder="Ticket id, subject, institution, category" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="sp-field">
        <label htmlFor="q-status">Status</label>
        <select id="q-status" className="sp-select" value={params.get('status') || 'active'} onChange={(e) => setParam('status', e.target.value)}>
          {STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="sp-field">
        <label htmlFor="q-priority">Priority</label>
        <select id="q-priority" className="sp-select" value={params.get('priority') || ''} onChange={(e) => setParam('priority', e.target.value)}>
          <option value="">Any</option>
          {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
      </div>
      <div className="sp-field">
        <label htmlFor="q-tier">Level</label>
        <select id="q-tier" className="sp-select" value={params.get('tier') || ''} onChange={(e) => setParam('tier', e.target.value)}>
          <option value="">Any</option>
          {[1, 2, 3, 4].map((t) => <option key={t} value={t}>L{t}</option>)}
        </select>
      </div>
      <div className="sp-field">
        <label htmlFor="q-assignee">Assigned</label>
        <select id="q-assignee" className="sp-select" value={params.get('assignee') || ''} onChange={(e) => setParam('assignee', e.target.value)}>
          <option value="">Anyone</option>
          <option value="me">Me</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>
      <div className="sp-field">
        <label htmlFor="q-sla">SLA</label>
        <select id="q-sla" className="sp-select" value={params.get('sla') || ''} onChange={(e) => setParam('sla', e.target.value)}>
          <option value="">Any</option>
          <option value="breached">Breached</option>
          <option value="at_risk">At risk</option>
          <option value="on_track">On track</option>
          <option value="met">Met</option>
        </select>
      </div>
    </div>
  );
}

function ActionError({ state }) {
  if (!state.error) return null;
  const gone = state.error.status === 404;
  return (
    <div className="sp-alert is-error" role="alert">
      {gone ? 'This ticket is no longer in your queue (it may have been escalated or reassigned). Refresh the list.' : state.error.message}
    </div>
  );
}

function ReplyBox({ ticket, onDone }) {
  const [kind, setKind] = useState('public');
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [run, state] = useMutation();
  const closed = ticket.status === 'closed';
  const error = text.trim().length < 2 ? 'Write a message (at least 2 characters).' : null;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (error || closed) return;
    const res = await run('post', `/platform/tickets/${ticket.ticket_id}/reply`, { text: text.trim(), kind }, { label: kind === 'internal' ? `Internal note on ${ticket.display_id}` : `Replied to ${ticket.display_id}` });
    if (res.ok) {
      setText('');
      setTouched(false);
      onDone(res.data);
    }
  };

  return (
    <form className="sp-form" onSubmit={submit} noValidate>
      <div className="sp-segmented" role="group" aria-label="Message type">
        <button type="button" aria-pressed={kind === 'public'} onClick={() => setKind('public')}>Public reply</button>
        <button type="button" aria-pressed={kind === 'internal'} onClick={() => setKind('internal')}>Internal note</button>
      </div>
      {closed && <div className="sp-alert is-info">This ticket is closed. Change its status to add messages.</div>}
      <div className="sp-field">
        <label htmlFor="q-reply">{kind === 'public' ? 'Reply to the college' : 'Note for platform staff'}</label>
        <textarea
          id="q-reply"
          className="sp-textarea"
          rows={4}
          maxLength={4000}
          value={text}
          disabled={closed}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={touched && !!error}
        />
        {touched && error ? (
          <p className="sp-field-error">{error}</p>
        ) : (
          <p className="sp-hint">
            {kind === 'public'
              ? 'The college sees this. The first public reply meets the response target and moves an open ticket to in progress.'
              : 'Only platform staff see internal notes.'}
          </p>
        )}
      </div>
      <ActionError state={state} />
      <div className="sp-btn-row">
        <button type="submit" className="sp-btn" disabled={state.loading || closed}>
          {state.loading ? 'Sending...' : kind === 'public' ? 'Send reply' : 'Add note'}
        </button>
      </div>
    </form>
  );
}

function StatusAction({ ticket, level, onDone }) {
  const options = ['in_progress', 'waiting_on_customer', 'resolved', 'closed'].filter((s) => s !== ticket.status);
  const [value, setValue] = useState('');
  const [run, state] = useMutation();
  const staffReplied = hasStaffReply(ticket);
  const blocked = (s) => (s === 'closed' && level.tier < 3 ? 'Only L3+ can close' : s === 'resolved' && !staffReplied ? 'Reply to the customer first' : null);

  const submit = async () => {
    if (!value) return;
    const res = await run('post', `/platform/tickets/${ticket.ticket_id}/status`, { status: value }, { label: `${ticket.display_id} marked ${STATUS_LABEL[value]}` });
    if (res.ok) {
      setValue('');
      onDone(res.data);
    }
  };

  return (
    <div className="sup-action">
      <h3>Status</h3>
      <div className="sup-inline">
        <select className="sp-select" aria-label="New status" value={value} onChange={(e) => { setValue(e.target.value); state.reset(); }}>
          <option value="">Choose status</option>
          {options.map((s) => (
            <option key={s} value={s} disabled={!!blocked(s)}>
              {STATUS_LABEL[s]}{blocked(s) ? ` (${blocked(s)})` : ''}
            </option>
          ))}
        </select>
        <button type="button" className="sp-btn is-small" disabled={!value || state.loading} onClick={submit}>
          {state.loading ? 'Saving...' : 'Update'}
        </button>
      </div>
      {level.tier < 3 && <p className="sp-hint" style={{ margin: 0 }}>Resolve tickets when done; managers close them.</p>}
      <ActionError state={state} />
    </div>
  );
}

function PriorityAction({ ticket, level, onDone }) {
  const [value, setValue] = useState(ticket.priority);
  const [run, state] = useMutation();
  useEffect(() => setValue(ticket.priority), [ticket.priority]);
  const canChange = level.tier >= 3;

  const submit = async () => {
    const res = await run('post', `/platform/tickets/${ticket.ticket_id}/priority`, { priority: value }, { label: `${ticket.display_id} priority set to ${value}` });
    if (res.ok) onDone(res.data);
  };

  return (
    <div className="sup-action">
      <h3>Priority</h3>
      <div className="sup-inline">
        <select className="sp-select" aria-label="Priority" value={value} disabled={!canChange} onChange={(e) => { setValue(e.target.value); state.reset(); }}>
          {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
        {canChange && (
          <button type="button" className="sp-btn is-small" disabled={value === ticket.priority || state.loading} onClick={submit}>
            {state.loading ? 'Saving...' : 'Change'}
          </button>
        )}
      </div>
      {!canChange && <p className="sp-hint" style={{ margin: 0 }}>Only L3 managers and above change priority.</p>}
      <ActionError state={state} />
    </div>
  );
}

function AssignAction({ ticket, level, user, team, onDone }) {
  const [value, setValue] = useState('');
  const [run, state] = useMutation();
  const done = ['resolved', 'closed'].includes(ticket.status);
  const eligible = (team || []).filter((m) => m.status !== 'inactive' && m.tier >= ticket.tier);
  const mine = ticket.assigned_to_id === user?.user_id;

  const assign = async (assigneeId, name) => {
    const res = await run('post', `/platform/tickets/${ticket.ticket_id}/assign`, { assignee_id: assigneeId }, { label: `${ticket.display_id} assigned to ${name}` });
    if (res.ok) {
      setValue('');
      onDone(res.data);
    }
  };

  let body;
  if (done) {
    body = <p className="sp-hint" style={{ margin: 0 }}>Reopen the ticket before assigning it.</p>;
  } else if (level.tier >= 3) {
    body = (
      <>
        <div className="sup-inline">
          <select className="sp-select" aria-label="Assign to" value={value} onChange={(e) => { setValue(e.target.value); state.reset(); }}>
            <option value="">Choose staff (L{ticket.tier} or above)</option>
            {eligible.map((m) => (
              <option key={m.user_id} value={m.user_id} disabled={m.user_id === ticket.assigned_to_id}>
                {m.name} · {m.level} · {m.active_tickets} active
              </option>
            ))}
          </select>
          <button type="button" className="sp-btn is-small" disabled={!value || state.loading} onClick={() => assign(value, eligible.find((m) => m.user_id === value)?.name || 'staff')}>
            {state.loading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
        {!team && <p className="sp-hint" style={{ margin: 0 }}>Loading staff list...</p>}
      </>
    );
  } else if (mine) {
    body = <p className="sp-hint" style={{ margin: 0 }}>This ticket is assigned to you. Managers can reassign it.</p>;
  } else if (level.tier < ticket.tier) {
    body = <p className="sp-hint" style={{ margin: 0 }}>This ticket is at L{ticket.tier}; only staff at that level or above can take it.</p>;
  } else {
    body = (
      <>
        <button type="button" className="sp-btn is-small is-secondary" disabled={state.loading} onClick={() => assign(user.user_id, 'me')}>
          {state.loading ? 'Assigning...' : 'Assign to me'}
        </button>
        <p className="sp-hint" style={{ margin: 0 }}>Only managers (L3+) assign tickets to someone else.</p>
      </>
    );
  }

  return (
    <div className="sup-action">
      <h3>Assignee</h3>
      <div className="sp-muted" style={{ fontSize: 13 }}>Currently: {ticket.assigned_to_name || 'Unassigned'}</div>
      {body}
      <ActionError state={state} />
    </div>
  );
}

function EscalateAction({ ticket, level, onDone }) {
  const done = ['resolved', 'closed'].includes(ticket.status);
  let targets = [2, 3, 4].filter((t) => t > ticket.tier);
  if (level.tier < 3) targets = targets.filter((t) => t === ticket.tier + 1);
  if (level.isSales) targets = targets.filter((t) => t <= 3);
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [run, state] = useMutation();
  const errors = {};
  if (!to) errors.to = 'Choose a level.';
  if (reason.trim().length < 5) errors.reason = 'Give a reason (at least 5 characters).';

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    const res = await run('post', `/platform/tickets/${ticket.ticket_id}/escalate`, { to_tier: Number(to), reason: reason.trim() }, { label: `${ticket.display_id} escalated to L${to}` });
    if (res.ok) {
      setTo('');
      setReason('');
      setTouched(false);
      onDone(res.data, { escalated: true });
    }
  };

  let body;
  if (done) body = <p className="sp-hint" style={{ margin: 0 }}>Resolved and closed tickets cannot be escalated.</p>;
  else if (ticket.tier >= 4) body = <p className="sp-hint" style={{ margin: 0 }}>Already at the highest level (L4).</p>;
  else if (!targets.length) body = <p className="sp-hint" style={{ margin: 0 }}>{level.isSales ? 'Sales escalates billing questions up to the L3 support manager.' : 'No higher level is available to you.'}</p>;
  else {
    body = (
      <form className="sp-form" onSubmit={submit} noValidate style={{ gap: 8 }}>
        <select className="sp-select" aria-label="Escalate to" value={to} onChange={(e) => { setTo(e.target.value); state.reset(); }} aria-invalid={touched && !!errors.to}>
          <option value="">Escalate to...</option>
          {targets.map((t) => <option key={t} value={t}>{TIER_NAMES[t]}</option>)}
        </select>
        {touched && errors.to && <p className="sp-field-error">{errors.to}</p>}
        <textarea className="sp-textarea" rows={2} aria-label="Reason for escalation" placeholder="Why does this need a higher level?" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={touched && !!errors.reason} />
        {touched && errors.reason && <p className="sp-field-error">{errors.reason}</p>}
        <button type="submit" className="sp-btn is-small is-secondary" disabled={state.loading}>{state.loading ? 'Escalating...' : 'Escalate'}</button>
      </form>
    );
  }

  return (
    <div className="sup-action">
      <h3>Escalate</h3>
      <div className="sp-muted" style={{ fontSize: 13 }}>Now at {ticket.tier_name || `L${ticket.tier}`}. Escalation only moves up{level.tier < 3 ? ', one level at a time' : ''}.</div>
      {body}
      <ActionError state={state} />
    </div>
  );
}

function TicketWorkspace({ id, level, user, team, onChanged, onGone }) {
  const detail = useApiResource(`/platform/tickets/${encodeURIComponent(id)}`);
  const [fresh, setFresh] = useState(null);
  useEffect(() => setFresh(null), [id]);
  const t = fresh && fresh.ticket_id === id ? fresh : detail.data;

  // A 404 means the ticket is not (or no longer) in this person's queue, e.g. an
  // L1 agent after escalating it to L2. Close the pane and say why.
  useEffect(() => {
    if (detail.status === 'failed' && detail.error?.status === 404) {
      onGone('That ticket is no longer in your queue. It may have been escalated or reassigned.', true);
    }
  }, [detail.status, detail.error, onGone]);

  const handleDone = (updated, { escalated } = {}) => {
    onChanged();
    if (escalated && !stillVisible(level, user?.user_id, updated)) {
      onGone(`${updated.display_id} was escalated to L${updated.tier} and has left your queue.`);
      return;
    }
    setFresh(updated);
  };

  if (!t && detail.status === 'loading') return <section className="sp-card"><LoadingState label="Loading ticket..." lines={6} /></section>;
  if (detail.status === 'failed' && !t) return <section className="sp-card"><ErrorState error={detail.error} onRetry={detail.reload} /></section>;
  if (!t) return null;

  return (
    <section className="sp-card" aria-labelledby="q-ticket-title">
      <div className="sup-detail-head">
        <div>
          <div className="sp-card-meta"><span className="sp-code">{t.display_id}</span> · {t.college_name || 'Unknown institution'}{t.college_code ? ` (${t.college_code})` : ''} · {t.category}</div>
          <h2 id="q-ticket-title" className="sup-detail-title">{t.subject}</h2>
          <div className="sup-badges">
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
            <SlaBadge sla={t.sla} />
            <span className="sp-badge is-neutral">{t.tier_name || `L${t.tier}`}</span>
          </div>
        </div>
        <button type="button" className="sp-btn is-secondary is-small" onClick={() => { setFresh(null); detail.reload(); }} disabled={detail.status === 'loading'}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <dl className="sp-details">
        <div><dt>Raised by</dt><dd>{t.raised_by_name || 'Unknown'}</dd></div>
        <div><dt>Assigned to</dt><dd>{t.assigned_to_name || 'Unassigned'}</dd></div>
        <div><dt>Created</dt><dd>{formatDateTime(t.created_at)}</dd></div>
        <div><dt>Response due</dt><dd>{t.first_response_at ? `Responded ${formatDateTime(t.first_response_at)}` : formatDateTime(t.sla?.response_due)}</dd></div>
        <div><dt>Resolution due</dt><dd>{t.resolved_at ? `Resolved ${formatDateTime(t.resolved_at)}` : formatDateTime(t.sla?.resolution_due)}</dd></div>
      </dl>

      <div className="sup-block">
        <h3 className="sup-block-title">Actions</h3>
        <div className="sup-actions">
          <StatusAction key={`s-${t.status}`} ticket={t} level={level} onDone={handleDone} />
          <PriorityAction ticket={t} level={level} onDone={handleDone} />
          <AssignAction ticket={t} level={level} user={user} team={team} onDone={handleDone} />
          <EscalateAction key={`e-${t.tier}`} ticket={t} level={level} onDone={handleDone} />
        </div>
      </div>

      {t.escalations?.length > 0 && (
        <div className="sup-block">
          <h3 className="sup-block-title">Escalation history</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {t.escalations.map((e, i) => (
              <li key={`${e.at}-${i}`}>
                L{e.from_tier} to L{e.to_tier} by {e.by_name || e.by} on {formatDateTime(e.at)}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sup-block">
        <h3 className="sup-block-title">Conversation ({t.messages?.length || 0})</h3>
        {t.messages?.length ? (
          <ul className="sup-thread">
            {t.messages.map((m) => <ThreadMessage key={m.message_id} message={m} viewer="staff" />)}
          </ul>
        ) : (
          <EmptyState title="No messages" message="This ticket has no messages yet." />
        )}
      </div>

      <div className="sup-block">
        <ReplyBox ticket={t} onDone={handleDone} />
      </div>
    </section>
  );
}

export default function SupportQueue() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const level = levelOf(user);
  const team = useSelector(selectSupportResource('team'));
  const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState(null);
  const selected = params.get('t');

  useEffect(() => {
    dispatch(fetchSupportTeam());
  }, [dispatch]);

  const qs = useMemo(() => {
    const q = new URLSearchParams();
    q.set('status', params.get('status') || 'active');
    FILTER_KEYS.filter((k) => k !== 'status').forEach((k) => params.get(k) && q.set(k, params.get(k)));
    return q.toString();
  }, [params]);
  const list = useApiResource(`/platform/tickets?${qs}`);

  const setParam = React.useCallback(
    (key, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );
  const select = (id) => {
    setNotice(null);
    setParam('t', id);
  };
  const onChanged = () => {
    list.reload();
    dispatch(fetchSupportSummary({ force: true }));
    dispatch(fetchSupportTeam({ force: true }));
  };
  const onGone = React.useCallback(
    (message, refresh) => {
      setNotice(message);
      setParam('t', '');
      if (refresh) list.reload();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParam, list.reload]
  );
  const rows = Array.isArray(list.data) ? list.data : [];

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Ticket queue</h1>
          <p className="sp-page-subtitle">
            {level.name}. {level.isSales ? 'You see billing and fees tickets.' : level.tier >= 3 ? 'You see every ticket.' : `You see L${level.tier} tickets and tickets assigned to you.`}
          </p>
        </div>
        <button type="button" className="sp-btn is-secondary" onClick={list.reload} disabled={list.status === 'loading'}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="sup-split">
        <section className="sp-card" aria-labelledby="q-list-title">
          <div className="sp-card-head">
            <h2 id="q-list-title" className="sp-section-title">Tickets{list.status === 'succeeded' ? ` (${rows.length})` : ''}</h2>
          </div>
          <Filters params={params} setParam={setParam} />
          {notice && <div className="sp-alert is-success" role="status" style={{ marginBottom: 10 }}>{notice}</div>}
          {list.status === 'loading' && !list.data && <LoadingState label="Loading tickets..." lines={5} />}
          {list.status === 'failed' && <ErrorState error={list.error} onRetry={list.reload} />}
          {list.status !== 'failed' && list.data && rows.length === 0 && (
            <EmptyState title="No tickets match" message="Try another status or clear the filters." />
          )}
          {list.status !== 'failed' && rows.length > 0 && (
            <ul className="sup-list">
              {rows.map((t) => (
                <li key={t.ticket_id}>
                  <button type="button" className="sup-list-item" aria-current={selected === t.ticket_id} onClick={() => select(t.ticket_id)}>
                    <span className="sup-list-top">
                      <span><span className="sp-code">{t.display_id}</span> · {t.college_code || t.college_name}</span>
                      <span>{timeAgo(t.updated_at)}</span>
                    </span>
                    <span className="sup-list-subject">{t.subject}</span>
                    <span className="sup-badges">
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      <SlaBadge sla={t.sla} compact />
                      <span className="sp-badge is-neutral">L{t.tier}</span>
                    </span>
                    <span className="sp-muted" style={{ fontSize: 12 }}>{t.assigned_to_name ? `Assigned to ${t.assigned_to_name}` : 'Unassigned'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selected ? (
          <TicketWorkspace key={selected} id={selected} level={level} user={user} team={team.data} onChanged={onChanged} onGone={onGone} />
        ) : (
          <section className="sp-card">
            <EmptyState title="Select a ticket" message="Choose a ticket from the list to read the conversation and act on it." />
          </section>
        )}
      </div>
    </>
  );
}
