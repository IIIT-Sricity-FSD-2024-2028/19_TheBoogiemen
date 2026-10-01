import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Megaphone, Send } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import Modal from '../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { formatDateTime, timeAgo } from '../../shared/format';
import { roleLabel } from '../../app/roleRoutes';
import { isDirectorRole, isHodRole, listOf } from './roles';
import './shared.css';

const AUDIENCE_LABEL = { all: 'Everyone', student: 'Students', faculty: 'Faculty', staff: 'All staff' };

function ComposeModal({ role, onClose, onSent }) {
  const isFaculty = role === 'faculty';
  const sections = useApiResource(isFaculty ? '/academics/sections' : null);
  const audiences = isHodRole(role) ? ['all', 'student', 'faculty'] : ['all', 'student', 'faculty', 'staff'];
  const [form, setForm] = useState({ title: '', message: '', audience: 'all', course_section_id: '' });
  const [submitted, setSubmitted] = useState(false);
  const [send, { loading, error }] = useMutation();

  const errors = {};
  if (!form.title.trim()) errors.title = 'Give the announcement a title.';
  if (!form.message.trim()) errors.message = 'Write a message.';
  if (isFaculty && !form.course_section_id) errors.course_section_id = 'Choose which section receives it.';
  const show = (k) => submitted && errors[k];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const body = { title: form.title.trim(), message: form.message.trim(), audience: isFaculty ? 'student' : form.audience };
    if (isFaculty) body.course_section_id = form.course_section_id;
    const res = await send('post', '/announcements', body, { label: `Published "${body.title}"` });
    if (res.ok) onSent();
  };

  const sectionRows = listOf(sections.data);
  return (
    <Modal
      title="New announcement"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="announce-form" className="sp-btn" disabled={loading}>
            <Send size={15} aria-hidden="true" /> {loading ? 'Publishing...' : 'Publish'}
          </button>
        </>
      }
    >
      <form id="announce-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        {isFaculty ? (
          <div className="sp-field">
            <label htmlFor="an-section">Section</label>
            {sections.status === 'failed' ? (
              <ErrorState error={sections.error} onRetry={sections.reload} />
            ) : (
              <select id="an-section" className="sp-select" value={form.course_section_id} onChange={set('course_section_id')} aria-invalid={!!show('course_section_id')} disabled={sections.status === 'loading'}>
                <option value="">{sections.status === 'loading' ? 'Loading your sections...' : 'Choose a section'}</option>
                {sectionRows.map((s) => (
                  <option key={s.course_section_id} value={s.course_section_id}>{s.course_code} {s.course_name} · Section {s.section}</option>
                ))}
              </select>
            )}
            {show('course_section_id') && <p className="sp-field-error">{errors.course_section_id}</p>}
            <p className="sp-hint">Students enrolled in the section are notified.</p>
          </div>
        ) : (
          <div className="sp-field">
            <label htmlFor="an-audience">Audience</label>
            <select id="an-audience" className="sp-select" value={form.audience} onChange={set('audience')}>
              {audiences.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
            </select>
            <p className="sp-hint">{isHodRole(role) ? 'Sent within your department.' : 'Sent across the college.'}</p>
          </div>
        )}
        <div className="sp-field">
          <label htmlFor="an-title">Title</label>
          <input id="an-title" className="sp-input" maxLength={120} value={form.title} onChange={set('title')} aria-invalid={!!show('title')} />
          {show('title') && <p className="sp-field-error">{errors.title}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="an-message">Message</label>
          <textarea id="an-message" className="sp-textarea" maxLength={2000} value={form.message} onChange={set('message')} aria-invalid={!!show('message')} />
          {show('message') && <p className="sp-field-error">{errors.message}</p>}
        </div>
      </form>
    </Modal>
  );
}

function AnnouncementList({ resource, sent, emptyTitle, emptyMessage }) {
  if (resource.status === 'loading' && !resource.data) return <LoadingState />;
  if (resource.status === 'failed') return <ErrorState error={resource.error} onRetry={resource.reload} />;
  const rows = listOf(resource.data);
  if (!rows.length) return <EmptyState title={emptyTitle} message={emptyMessage} />;
  return (
    <ul className="sp-announce-list">
      {rows.map((a) => (
        <li key={a.announcement_id} className="sp-announce-item">
          <div className="sp-announce-head">
            <strong>{a.title}</strong>
            <span className="sp-muted" title={formatDateTime(a.created_at)}>{timeAgo(a.created_at)}</span>
          </div>
          <p className="sp-announce-body">{a.message}</p>
          <div className="sp-announce-meta">
            {!sent && <span>{a.author_name} · {roleLabel(a.author_role)}</span>}
            <span className="sp-badge is-neutral">{a.section_label || AUDIENCE_LABEL[a.audience] || a.audience}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Announcements addressed to the user, and (for staff who can publish) the ones they sent. */
export default function AnnouncementsSection() {
  const role = useSelector((state) => state.auth.user?.role);
  const canPublish = role === 'faculty' || isHodRole(role) || isDirectorRole(role);
  const received = useApiResource('/announcements');
  const sent = useApiResource(canPublish ? '/announcements/sent' : null);
  const [tab, setTab] = useState('received');
  const [composing, setComposing] = useState(false);

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Announcements</h1>
          <p className="sp-page-subtitle">Notices from your {role === 'student' ? 'faculty, department and college' : 'department and college'}.</p>
        </div>
        {canPublish && (
          <button type="button" className="sp-btn" onClick={() => setComposing(true)}>
            <Megaphone size={16} aria-hidden="true" /> New announcement
          </button>
        )}
      </div>
      {canPublish && (
        <div className="sp-segmented" role="group" aria-label="Show" style={{ marginBottom: 16 }}>
          <button type="button" aria-pressed={tab === 'received'} onClick={() => setTab('received')}>Received</button>
          <button type="button" aria-pressed={tab === 'sent'} onClick={() => setTab('sent')}>Sent by me</button>
        </div>
      )}
      <section className="sp-card">
        {tab === 'received' ? (
          <AnnouncementList resource={received} emptyTitle="No announcements" emptyMessage="Announcements addressed to you will appear here." />
        ) : (
          <AnnouncementList resource={sent} sent emptyTitle="Nothing sent yet" emptyMessage="Use New announcement to notify students or staff." />
        )}
      </section>
      {composing && (
        <ComposeModal
          role={role}
          onClose={() => setComposing(false)}
          onSent={() => {
            setComposing(false);
            setTab('sent');
            sent.reload();
          }}
        />
      )}
    </>
  );
}
