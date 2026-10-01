import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { capitalize, formatDateTime } from '../../shared/format';

const TAGS = ['general', 'help', 'announcement'];
const TAG_TONE = { help: 'is-warning', announcement: 'is-info', general: 'is-neutral' };

function useSubmit() {
  const [mutate, { loading, error }] = useMutation();
  const run = async (path, body, label) => {
    const res = await mutate('post', path, body, { label });
    return res.ok ? res.data : null;
  };
  return [{ submitting: loading, error: error?.message || null }, run];
}

function NewThreadForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ title: '', content: '', tag: 'general' });
  const [showErrors, setShowErrors] = useState(false);
  const [{ submitting, error }, submit] = useSubmit();

  const errors = {
    title: form.title.trim() ? null : 'Title is required.',
    content: form.content.trim() ? null : 'Write your question or message.',
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setShowErrors(true);
    if (errors.title || errors.content) return;
    const created = await submit('/discussions', { title: form.title.trim(), content: form.content.trim(), tag: form.tag }, 'Started a discussion');
    if (created) onCreated(created);
  };

  return (
    <form className="sp-card sp-form" onSubmit={handleSubmit} noValidate style={{ marginBottom: 16 }}>
      <h2 className="sp-section-title" style={{ margin: 0 }}>New discussion</h2>
      {error && <div className="sp-alert is-error" role="alert">{error}</div>}
      <div className="sp-form-row">
        <div className="sp-field">
          <label htmlFor="thread-title">Title</label>
          <input id="thread-title" className="sp-input" value={form.title} maxLength={150}
            onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={showErrors && !!errors.title} />
          {showErrors && errors.title && <p className="sp-field-error">{errors.title}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="thread-tag">Tag</label>
          <select id="thread-tag" className="sp-select" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
            {TAGS.filter((t) => t !== 'announcement').map((t) => (
              <option key={t} value={t}>{capitalize(t)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="sp-field">
        <label htmlFor="thread-content">Message</label>
        <textarea id="thread-content" className="sp-textarea" value={form.content} maxLength={2000}
          onChange={(e) => setForm({ ...form, content: e.target.value })} aria-invalid={showErrors && !!errors.content} />
        {showErrors && errors.content && <p className="sp-field-error">{errors.content}</p>}
      </div>
      <div className="sp-btn-row">
        <button type="submit" className="sp-btn" disabled={submitting}>{submitting ? 'Posting...' : 'Post discussion'}</button>
        <button type="button" className="sp-btn is-secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
      </div>
    </form>
  );
}

/** Replies are fetched only when a thread is opened: GET /api/discussions/:postId. */
function ThreadReplies({ postId, onReplied }) {
  const detail = useApiResource(`/discussions/${encodeURIComponent(postId)}`);
  const [reply, setReply] = useState('');
  const [{ submitting, error }, submit] = useSubmit();

  const handleReply = async (event) => {
    event.preventDefault();
    if (!reply.trim()) return;
    const created = await submit(`/discussions/${encodeURIComponent(postId)}/replies`, { content: reply.trim() }, 'Replied to a discussion');
    if (created) {
      setReply('');
      detail.reload();
      onReplied();
    }
  };

  const replies = Array.isArray(detail.data?.replies) ? detail.data.replies : [];

  return (
    <div className="sp-replies">
      {detail.status === 'loading' && !detail.data && <LoadingState label="Loading replies..." />}
      {detail.status === 'failed' && <ErrorState error={detail.error} onRetry={detail.reload} />}
      {detail.data && replies.length === 0 && <p className="sp-muted" style={{ margin: 0 }}>No replies yet. Be the first to reply.</p>}
      {replies.map((r) => (
        <div key={r.reply_id} className="sp-reply">
          <div className="sp-card-meta">
            <strong style={{ color: 'var(--sp-text)' }}>{r.author_name}</strong> · {capitalize(r.author_role)} · {formatDateTime(r.created_at)}
          </div>
          <div>{r.content}</div>
        </div>
      ))}

      <form onSubmit={handleReply} className="sp-form" noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error}</div>}
        <div className="sp-field">
          <label htmlFor={`reply-${postId}`}>Your reply</label>
          <textarea id={`reply-${postId}`} className="sp-textarea" style={{ minHeight: 60 }} value={reply} maxLength={2000}
            onChange={(e) => setReply(e.target.value)} />
        </div>
        <div className="sp-btn-row">
          <button type="submit" className="sp-btn is-small" disabled={submitting || !reply.trim()}>
            {submitting ? 'Sending...' : 'Reply'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DiscussionsSection() {
  const role = useSelector((state) => state.auth.user?.role);
  const discussions = useApiResource('/discussions');
  const [openPostId, setOpenPostId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [tagFilter, setTagFilter] = useState('all');
  const [search, setSearch] = useState('');

  const posts = useMemo(() => {
    const all = Array.isArray(discussions.data) ? discussions.data : [];
    const query = search.trim().toLowerCase();
    return all
      .filter((p) => tagFilter === 'all' || p.tag === tagFilter)
      .filter((p) => !query || `${p.title} ${p.content}`.toLowerCase().includes(query))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [discussions.data, tagFilter, search]);

  const hasAny = Array.isArray(discussions.data) && discussions.data.length > 0;

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Discussions</h1>
          <p className="sp-page-subtitle">{role === 'student' ? 'Ask questions and follow announcements from your faculty.' : 'Answer student questions and post updates for your department.'}</p>
        </div>
        {!composing && (
          <button type="button" className="sp-btn" onClick={() => setComposing(true)}>New discussion</button>
        )}
      </div>

      {composing && (
        <NewThreadForm
          onCancel={() => setComposing(false)}
          onCreated={(post) => {
            setComposing(false);
            setOpenPostId(post.post_id);
            discussions.reload();
          }}
        />
      )}

      {hasAny && (
        <div className="sp-form-row" style={{ marginBottom: 16 }}>
          <div className="sp-field">
            <label htmlFor="disc-search">Search</label>
            <input id="disc-search" type="search" className="sp-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles and messages" />
          </div>
          <div className="sp-field">
            <label htmlFor="disc-tag">Tag</label>
            <select id="disc-tag" className="sp-select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="all">All tags</option>
              {TAGS.map((t) => (
                <option key={t} value={t}>{capitalize(t)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {discussions.status === 'loading' && !discussions.data && <LoadingState label="Loading discussions..." />}
      {discussions.status === 'failed' && <ErrorState error={discussions.error} onRetry={discussions.reload} />}
      {discussions.data && !hasAny && (
        <div className="sp-card">
          <EmptyState title="No discussions yet" message="Start the first discussion for your class." />
        </div>
      )}
      {hasAny && posts.length === 0 && (
        <div className="sp-card"><EmptyState title="No matching discussions" message="Try a different search or tag." /></div>
      )}

      <div className="sp-thread-list">
        {posts.map((post) => {
          const open = openPostId === post.post_id;
          return (
            <article key={post.post_id} className="sp-card">
              <button
                type="button"
                className="sp-thread"
                style={{ background: 'none', border: 0, padding: 0 }}
                aria-expanded={open}
                onClick={() => setOpenPostId(open ? null : post.post_id)}
              >
                <div className="sp-card-head">
                  <h2 className="sp-card-title">{post.title || 'Untitled discussion'}</h2>
                  <span className={`sp-badge ${TAG_TONE[post.tag] || 'is-neutral'}`}>{capitalize(post.tag || 'general')}</span>
                </div>
                <p style={{ margin: '6px 0' }}>{post.content}</p>
                <div className="sp-card-meta">
                  {post.author_name} · {capitalize(post.author_role)} · {formatDateTime(post.created_at)} · {post.reply_count ?? 0}{' '}
                  {post.reply_count === 1 ? 'reply' : 'replies'}
                </div>
              </button>
              {open && <ThreadReplies postId={post.post_id} onReplied={discussions.reload} />}
            </article>
          );
        })}
      </div>
    </>
  );
}
