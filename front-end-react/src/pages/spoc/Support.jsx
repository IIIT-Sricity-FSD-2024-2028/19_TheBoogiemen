/**
 * Support — ported from spoc.html's support-view + loadSupportThread() +
 * submitSupportMessage() + renderMessages(). Legacy polled every 20s for
 * the lifetime of the whole page; here the poll only runs while this view
 * is actually mounted, which is strictly less wasteful for the same effect
 * (a near-live thread while the SPOC is looking at it).
 */

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';

export default function Support() {
  const { showToast } = useNotifications();
  const [messages, setMessages] = useState(undefined);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const load = () =>
    apiFetch('/billing/support/thread')
      .then((res) => setMessages(res?.data?.messages || []))
      .catch(() => setMessages([]));

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const submit = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setSending(true);
    try {
      const res = await apiFetch('/billing/support/messages', { method: 'POST', body: JSON.stringify({ content }) });
      setInput('');
      setMessages(res.data.messages);
    } catch (e2) {
      showToast('Could not send message: ' + e2.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="stats-card" style={{ display: 'flex', flexDirection: 'column', height: 480 }}>
      <div className="stats-card-header">
        <div>
          <h3>Support</h3>
          <p>Message our team directly — replies land right here</p>
        </div>
        <button onClick={load} title="Refresh" type="button" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 11px', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {messages === undefined ? null : messages.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 12px' }}>
            No messages yet. Say hello — our team will reply here.
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_role === 'spoc';
            const when = m.created_at ? new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            const who = mine ? 'You' : m.sender_name || 'BarelyPassing Team';
            return (
              <div key={m.message_id || i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', margin: '6px 0', flexDirection: mine ? 'row-reverse' : 'row' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: 'white', background: mine ? 'var(--accent-primary)' : '#64748b' }}>
                  {who.charAt(0).toUpperCase()}
                </div>
                <div
                  style={{
                    maxWidth: '72%', padding: '10px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.5,
                    background: mine ? 'var(--accent-primary)' : '#f1f5f9',
                    color: mine ? 'white' : 'var(--text-primary)',
                    borderBottomRightRadius: mine ? 4 : 14,
                    borderBottomLeftRadius: mine ? 14 : 4,
                  }}
                >
                  {m.content}
                  <span style={{ display: 'block', fontSize: 10.5, opacity: 0.7, marginTop: 4 }}>{who} · {when}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: '14px 18px', borderTop: '1px solid var(--border)', background: '#fbfcfe' }}>
        <input
          type="text"
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a message…"
          style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13.5 }}
        />
        <button type="submit" className="submit-btn" style={{ width: 'auto', padding: '9px 18px', fontSize: 13 }} disabled={sending}>
          Send
        </button>
      </form>
    </div>
  );
}
