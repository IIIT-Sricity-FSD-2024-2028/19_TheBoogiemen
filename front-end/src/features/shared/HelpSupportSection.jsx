import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import { ConfirmDialog } from '../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { formatDateTime, timeAgo } from '../../shared/format';
import { PRIORITY_LABEL, PriorityBadge, REOPEN_DAYS, SlaBadge, StatusBadge, ThreadMessage } from '../support/supportUi';
import '../support/support.css';

/**
 * Help and support for college staff (SPOC, director, HOD, finance): raise
 * tickets with the platform team and follow the conversation. Internal staff
 * notes never reach this view (the API filters them).
 */

const DAY = 24 * 3600 * 1000;
const EMPTY = { subject: '', category: '', priority: '', description: '' };
const LIST_FILTERS = [
  ['active', 'Active'],
  ['done', 'Resolved and closed'],
  ['all', 'All'],
];

function validate(f) {
  const e = {};
  const subject = f.subject.trim();
  if (subject.length < 5) e.subject = 'Subject must be at least 5 characters.';
  else if (subject.length > 150) e.subject = 'Keep the subject under 150 characters.';
  if (!f.category) e.category = 'Choose a category.';
  if (!f.priority) e.priority = 'Choose a priority.';
  if (f.description.trim().length < 10) e.description = 'Describe the problem in at least 10 characters.';
  return e;
}

function NewTicketForm({ meta, onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [run, state] = useMutation();
  const errors = validate(form);
  const show = (k) => touched[k] && errors[k];
  const update = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); state.reset(); };
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const sla = form.priority ? meta?.sla_hours?.[form.priority] : null;

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ subject: true, category: true, priority: true, description: true });
    if (Object.keys(errors).length) return;
    const body = { subject: form.subject.trim(), category: form.category, priority: form.priority, description: form.description.trim() };
    const res = await run('post', '/support/tickets', body, { label: `Raised support ticket: ${body.subject}` });
    if (res.ok) onCreated(res.data);
  };

  return (
    <section className="sp-card" aria-labelledby="hs-new-title">
      <form className="sp-form" onSubmit={submit} noValidate>
        <h2 id="hs-new-title" className="sp-section-title" style={{ margin: 0 }}>New support ticket</h2>
        <div className="sp-field">
          <label htmlFor="hs-subject">Subject</label>
          <input id="hs-subject" className="sp-input" maxLength={150} value={form.subject} onChange={update('subject')} onBlur={blur('subject')} aria-invalid={!!show('subject')} />
          {show('subject') ? <p className="sp-field-error">{errors.subject}</p> : <p className="sp-hint">A short summary, for example "Attendance report shows wrong totals".</p>}
        </div>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="hs-category">Category</label>
            <select id="hs-category" className="sp-select" value={form.category} onChange={update('category')} onBlur={blur('category')} aria-invalid={!!show('category')}>
              <option value="">Choose category</option>
              {(meta?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {show('category') && <p className="sp-field-error">{errors.category}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="hs-priority">Priority</label>
            <select id="hs-priority" className="sp-select" value={form.priority} onChange={update('priority')} onBlur={blur('priority')} aria-invalid={!!show('priority')}>
              <option value="">Choose priority</option>
              {(meta?.priorities || []).slice().reverse().map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p] || p}</option>)}
            </select>
            {show('priority') ? (
              <p className="sp-field-error">{errors.priority}</p>
            ) : sla ? (
              <p className="sp-hint">First response within {sla.response} h, resolution target {sla.resolution} h.</p>
            ) : (
              <p className="sp-hint">Critical means the platform is unusable for your institution.</p>
            )}
          </div>
        </div>
        <div className="sp-field">
          <label htmlFor="hs-description">Description</label>
          <textarea id="hs-description" className="sp-textarea" rows={6} maxLength={4000} value={form.description} onChange={update('description')} onBlur={blur('description')} aria-invalid={!!show('description')} />
          {show('description') ? <p className="sp-field-error">{errors.description}</p> : <p className="sp-hint">What happened, what you expected, and the steps to see it. {form.description.length}/4000</p>}
        </div>
        {state.error && <div className="sp-alert is-error" role="alert">{state.error.message}</div>}
        <div className="sp-btn-row">
          <button type="submit" className="sp-btn" disabled={state.loading}>{state.loading ? 'Submitting...' : 'Submit ticket'}</button>
          <button type="button" className="sp-btn is-secondary" onClick={onCancel} disabled={state.loading}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

function ReopenNotice({ ticket, onReopen, busy }) {
  if (ticket.status !== 'resolved' || !ticket.resolved_at) return null;
  const until = Date.parse(ticket.resolved_at) + REOPEN_DAYS * DAY;
  if (Date.now() <= until) {
    return (
      <div className="sp-alert is-success">
        The support team marked this ticket resolved on {formatDateTime(ticket.resolved_at)}. If the problem is not fixed you can reopen it until {formatDateTime(new Date(until).toISOString())}, or reply below.
        <div className="sp-btn-row" style={{ marginTop: 8 }}>
          <button type="button" className="sp-btn is-small is-secondary" onClick={onReopen} disabled={busy}>{busy ? 'Reopening...' : 'Reopen ticket'}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="sp-alert is-info">
      This ticket was resolved on {formatDateTime(ticket.resolved_at)}. The {REOPEN_DAYS}-day reopen window has passed; open a new ticket and mention {ticket.display_id} if you still need help.
    </div>
  );
}

function TicketThread({ id, onChanged }) {
  const detail = useApiResource(`/support/tickets/${encodeURIComponent(id)}`);
  const [fresh, setFresh] = useState(null);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [reply, replyState] = useMutation();
  const [reopen, reopenState] = useMutation();
  const [close, closeState] = useMutation();
  useEffect(() => setFresh(null), [id]);
  const t = fresh && fresh.ticket_id === id ? fresh : detail.data;

  const done = (res) => {
    if (res.ok) {
      setFresh(res.data);
      onChanged();
    }
    return res.ok;
  };
  const replyError = text.trim().length < 2 ? 'Write a message (at least 2 characters).' : null;
  const sendReply = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (replyError) return;
    if (done(await reply('post', `/support/tickets/${t.ticket_id}/reply`, { text: text.trim() }, { label: `Replied on ${t.display_id}` }))) {
      setText('');
      setTouched(false);
    }
  };
  const doReopen = async () => done(await reopen('post', `/support/tickets/${t.ticket_id}/reopen`, undefined, { label: `Reopened ${t.display_id}` }));
  const doClose = async () => {
    done(await close('post', `/support/tickets/${t.ticket_id}/close`, undefined, { label: `Closed ${t.display_id}` }));
    setConfirmClose(false);
  };

  if (!t && detail.status === 'loading') return <section className="sp-card"><LoadingState label="Loading ticket..." lines={6} /></section>;
  if (!t && detail.status === 'failed') return <section className="sp-card"><ErrorState error={detail.error} onRetry={detail.reload} /></section>;
  if (!t) return null;
  const closed = t.status === 'closed';

  return (
    <section className="sp-card" aria-labelledby="hs-thread-title">
      <div className="sup-detail-head">
        <div>
          <div className="sp-card-meta"><span className="sp-code">{t.display_id}</span> · {t.category} · raised by {t.raised_by_name} {timeAgo(t.created_at)}</div>
          <h2 id="hs-thread-title" className="sup-detail-title">{t.subject}</h2>
          <div className="sup-badges">
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
            {!closed && <SlaBadge sla={t.sla} />}
          </div>
        </div>
        <div className="sp-btn-row">
          <button type="button" className="sp-btn is-secondary is-small" onClick={() => { setFresh(null); detail.reload(); }} disabled={detail.status === 'loading'}>
            <RefreshCw size={14} /> Refresh
          </button>
          {!closed && <button type="button" className="sp-btn is-outline is-small" onClick={() => { closeState.reset(); setConfirmClose(true); }}>Close ticket</button>}
        </div>
      </div>

      <dl className="sp-details">
        <div><dt>Handled by</dt><dd>{t.assigned_to_name ? `${t.assigned_to_name} (${t.tier_name})` : `${t.tier_name || 'Support team'}, not yet assigned`}</dd></div>
        <div><dt>First response</dt><dd>{t.first_response_at ? formatDateTime(t.first_response_at) : `Expected by ${formatDateTime(t.sla?.response_due)}`}</dd></div>
        <div><dt>Resolution target</dt><dd>{t.resolved_at ? `Resolved ${formatDateTime(t.resolved_at)}` : formatDateTime(t.sla?.resolution_due)}</dd></div>
      </dl>

      <div className="sup-block">
        <ReopenNotice ticket={t} onReopen={doReopen} busy={reopenState.loading} />
        {reopenState.error && <div className="sp-alert is-error" role="alert">{reopenState.error.message}</div>}
        {closeState.error && <div className="sp-alert is-error" role="alert">{closeState.error.message}</div>}
        {closed && <div className="sp-alert is-info">This ticket was closed{t.closed_at ? ` on ${formatDateTime(t.closed_at)}` : ''}. Open a new ticket if you need more help.</div>}
        {t.status === 'waiting_on_customer' && <div className="sp-alert is-warning">The support team is waiting for your reply.</div>}
      </div>

      <div className="sup-block">
        <h3 className="sup-block-title">Conversation</h3>
        {t.messages?.length ? (
          <ul className="sup-thread">
            {t.messages.map((m) => <ThreadMessage key={m.message_id} message={m} viewer="college" />)}
          </ul>
        ) : (
          <EmptyState title="No messages" />
        )}
      </div>

      {!closed && (
        <form className="sp-form sup-block" onSubmit={sendReply} noValidate>
          <div className="sp-field">
            <label htmlFor="hs-reply">Reply</label>
            <textarea id="hs-reply" className="sp-textarea" rows={4} maxLength={4000} value={text} onChange={(e) => { setText(e.target.value); replyState.reset(); }} onBlur={() => setTouched(true)} aria-invalid={touched && !!replyError} />
            {touched && replyError ? (
              <p className="sp-field-error">{replyError}</p>
            ) : (
              <p className="sp-hint">{t.status === 'resolved' || t.status === 'waiting_on_customer' ? 'Replying moves the ticket back to the support team.' : 'The support team is notified of your reply.'}</p>
            )}
          </div>
          {replyState.error && <div className="sp-alert is-error" role="alert">{replyState.error.message}</div>}
          <div className="sp-btn-row">
            <button type="submit" className="sp-btn" disabled={replyState.loading}>{replyState.loading ? 'Sending...' : 'Send reply'}</button>
          </div>
        </form>
      )}

      {confirmClose && (
        <ConfirmDialog
          title={`Close ${t.display_id}?`}
          message="Close this ticket if you no longer need help. A closed ticket cannot be reopened; you would need to open a new one."
          confirmLabel="Close ticket"
          busy={closeState.loading}
          onConfirm={doClose}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </section>
  );
}

export default function HelpSupportSection() {
  const meta = useApiResource('/support/meta');
  const list = useApiResource('/support/tickets');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('active');
  const [notice, setNotice] = useState(null);

  const all = Array.isArray(list.data) ? list.data : [];
  const rows = all.filter((t) => (filter === 'all' ? true : filter === 'active' ? !['resolved', 'closed'].includes(t.status) : ['resolved', 'closed'].includes(t.status)));

  const open = (id) => { setCreating(false); setNotice(null); setSelected(id); };
  const startNew = () => { setSelected(null); setNotice(null); setCreating(true); };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Help and support</h1>
          <p className="sp-page-subtitle">Raise a ticket with the BarelyPassing support team and follow the conversation.</p>
        </div>
        <button type="button" className="sp-btn" onClick={startNew}><Plus size={15} /> New ticket</button>
      </div>

      <div className="sup-split">
        <div className="sp-grid" style={{ gap: 18 }}>
          <section className="sp-card" aria-labelledby="hs-list-title">
            <div className="sp-card-head">
              <h2 id="hs-list-title" className="sp-section-title">Your institution's tickets</h2>
              <button type="button" className="sp-link-btn" onClick={list.reload} disabled={list.status === 'loading'}>Refresh</button>
            </div>
            <div className="sp-segmented" role="group" aria-label="Filter tickets" style={{ margin: '4px 0 12px', flexWrap: 'wrap' }}>
              {LIST_FILTERS.map(([k, l]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
            </div>
            {notice && <div className="sp-alert is-success" role="status" style={{ marginBottom: 10 }}>{notice}</div>}
            {list.status === 'loading' && !list.data && <LoadingState label="Loading tickets..." lines={4} />}
            {list.status === 'failed' && <ErrorState error={list.error} onRetry={list.reload} />}
            {list.data && list.status !== 'failed' && rows.length === 0 && (
              <EmptyState
                title={all.length === 0 ? 'No tickets yet' : 'Nothing here'}
                message={all.length === 0 ? 'When you need help from the platform team, raise a ticket.' : 'No tickets match this filter.'}
              >
                {all.length === 0 && <button type="button" className="sp-btn is-small" onClick={startNew}>Raise a ticket</button>}
              </EmptyState>
            )}
            {rows.length > 0 && list.status !== 'failed' && (
              <ul className="sup-list">
                {rows.map((t) => (
                  <li key={t.ticket_id}>
                    <button type="button" className="sup-list-item" aria-current={selected === t.ticket_id} onClick={() => open(t.ticket_id)}>
                      <span className="sup-list-top">
                        <span className="sp-code">{t.display_id}</span>
                        <span>Updated {timeAgo(t.updated_at)}</span>
                      </span>
                      <span className="sup-list-subject">{t.subject}</span>
                      <span className="sup-badges">
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                      </span>
                      <span className="sp-muted" style={{ fontSize: 12 }}>{t.category} · by {t.raised_by_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="sp-card" aria-labelledby="hs-sla-title">
            <h2 id="hs-sla-title" className="sp-section-title">Response times</h2>
            {meta.status === 'loading' && <LoadingState lines={2} />}
            {meta.status === 'failed' && <ErrorState error={meta.error} onRetry={meta.reload} />}
            {meta.status === 'succeeded' && (
              <>
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead>
                      <tr><th scope="col">Priority</th><th scope="col" className="sp-num">First response</th><th scope="col" className="sp-num">Resolution</th></tr>
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
                <p className="sp-hint">Resolved tickets can be reopened within {REOPEN_DAYS} days. Complex issues are escalated to technical staff and managers.</p>
              </>
            )}
          </section>
        </div>

        {creating ? (
          meta.status === 'failed' ? (
            <section className="sp-card"><ErrorState error={meta.error} onRetry={meta.reload} /></section>
          ) : meta.status !== 'succeeded' ? (
            <section className="sp-card"><LoadingState label="Loading form..." lines={5} /></section>
          ) : (
            <NewTicketForm
              meta={meta.data}
              onCancel={() => setCreating(false)}
              onCreated={(t) => {
                list.reload();
                setFilter('active');
                open(t.ticket_id);
                const h = meta.data?.sla_hours?.[t.priority]?.response;
                setNotice(`${t.display_id} raised.${h ? ` The support team aims to respond within ${h} h.` : ''}`);
              }}
            />
          )
        ) : selected ? (
          <TicketThread key={selected} id={selected} onChanged={list.reload} />
        ) : (
          <section className="sp-card">
            <EmptyState title="Select a ticket" message="Choose a ticket to read the conversation, or raise a new one.">
              <button type="button" className="sp-btn is-small" onClick={startNew}>New ticket</button>
            </EmptyState>
          </section>
        )}
      </div>
    </>
  );
}
