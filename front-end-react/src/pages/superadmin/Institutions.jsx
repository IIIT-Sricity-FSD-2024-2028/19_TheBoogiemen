/**
 * Institutions — superadmin's whole dashboard (super-admin.html's
 * institutions-view): the registered-college table (renderInstitutions)
 * plus the cross-college support inbox and its thread detail/reply modal
 * (renderSupportInbox / openSupportThread / submitSuperadminReply).
 *
 * No "add college" action here on purpose — a college becomes valid by
 * purchasing a subscription, not by a superadmin clicking a button; the
 * legacy comment on this exact table explains why.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

function InstitutionsTable() {
  const [colleges, setColleges] = useState(undefined);

  useEffect(() => {
    apiFetch('/billing/colleges')
      .then((res) => setColleges(res?.data || []))
      .catch(() => setColleges([]));
  }, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3>Registered Institutions</h3>
          <p>Every college with a SPOC account on this platform. Colleges are onboarded once they purchase a subscription — there is no manual "add college" action here by design.</p>
        </div>
      </div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        {colleges === undefined ? null : colleges.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No colleges registered yet.</p>
        ) : (
          <table className="crud-table">
            <thead>
              <tr><th>College</th><th>SPOC</th><th>Admins</th><th>Students</th><th>Faculty</th></tr>
            </thead>
            <tbody>
              {colleges.map((c) => (
                <tr key={c.college_id}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.city && (
                      <>
                        <br />
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{c.city}{c.state ? ', ' + c.state : ''}</span>
                      </>
                    )}
                  </td>
                  <td>{c.spoc_email ? c.spoc_email : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                  <td>{c.admin_count}</td>
                  <td>{c.student_count}</td>
                  <td>{c.faculty_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ThreadModal({ threadId, onClose, onReplied }) {
  const { showToast } = useNotifications();
  const [thread, setThread] = useState(undefined);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!threadId) return;
    setReply('');
    apiFetch(`/billing/support/threads/${threadId}`)
      .then((res) => setThread(res?.data))
      .catch((e) => showToast('Failed to open thread: ' + e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const submit = async () => {
    const content = reply.trim();
    if (!content) {
      showToast('Please write a reply', 'warning');
      return;
    }
    setSending(true);
    try {
      const res = await apiFetch(`/billing/support/threads/${threadId}/reply`, { method: 'POST', body: JSON.stringify({ content }) });
      setThread(res.data);
      setReply('');
      onReplied();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const messages = thread?.messages || [];

  return (
    <Modal open={!!threadId} onClose={onClose} title={`Support — ${thread?.subject || 'Thread'}`}>
      <div className="modal-body">
        <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {messages.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No messages yet.</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_role === 'superadmin';
              const when = m.created_at ? new Date(m.created_at).toLocaleString() : '';
              return (
                <div
                  key={m.message_id}
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                    background: mine ? '#6366f1' : '#f1f5f9', color: mine ? '#fff' : '#0f172a',
                  }}
                >
                  {m.content}
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.75, marginTop: 4 }}>{mine ? 'You' : m.sender_name || 'SPOC'} · {when}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="form-group">
          <label>Reply</label>
          <textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
      </div>
      <div className="modal-footer">
        <button className="submit-btn" style={{ flex: 1 }} onClick={submit} disabled={sending}>
          {sending ? 'Sending…' : 'Send Reply'}
        </button>
        <button className="btn-cancel" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function SupportInbox() {
  const { showToast } = useNotifications();
  const [threads, setThreads] = useState(undefined);
  const [openThreadId, setOpenThreadId] = useState(null);

  const load = () =>
    apiFetch('/billing/support/threads')
      .then((res) => setThreads(res?.data || []))
      .catch((e) => showToast('Failed to load support inbox: ' + e.message, 'error'));
  useEffect(load, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div><h3>Support Inbox</h3><p>Messages from every SPOC, newest activity first.</p></div>
      </div>
      <div className="stats-card-body" style={{ padding: 0 }}>
        {threads === undefined ? null : threads.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No support threads yet.</p>
        ) : (
          threads.map((t) => {
            const when = t.last_message ? new Date(t.last_message.created_at).toLocaleString() : '';
            const preview = t.last_message ? t.last_message.content.slice(0, 90) : 'No messages yet';
            const fromUs = t.last_message && t.last_message.sender_role === 'superadmin';
            return (
              <div
                key={t.thread_id}
                onClick={() => setOpenThreadId(t.thread_id)}
                style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t.college_name}</h4>
                  <small style={{ color: '#94a3b8' }}>{when}</small>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  {fromUs && <em>You: </em>}
                  {preview}{preview.length >= 90 ? '…' : ''}
                </p>
                <small style={{ color: '#94a3b8' }}>{t.message_count} message{t.message_count === 1 ? '' : 's'}</small>
              </div>
            );
          })
        )}
      </div>
      <ThreadModal threadId={openThreadId} onClose={() => setOpenThreadId(null)} onReplied={load} />
    </div>
  );
}

export default function Institutions() {
  return (
    <>
      <InstitutionsTable />
      <SupportInbox />
    </>
  );
}
