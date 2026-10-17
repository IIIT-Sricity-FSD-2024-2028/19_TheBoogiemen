/**
 * DiscussionForum — ported from legacy fixes.js renderDiscussions() +
 * openThreadDetail() + submitThreadReply() + submitNewDiscussion(). Fully
 * role-agnostic in the legacy code already (same markup/behavior on
 * student.html and faculty.html, just a different container id) — no
 * `role` prop needed here, unlike Leave/Research/Timetable.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from './Modal';

function ThreadRow({ post, onOpen }) {
  const date = post.created_at ? new Date(post.created_at).toLocaleDateString() : '';
  const preview = (post.content || '').slice(0, 100) + ((post.content || '').length > 100 ? '...' : '');
  return (
    <div onClick={onOpen} style={{ padding: 16, borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{post.title || 'Untitled'}</h4>
        <span style={{ fontSize: 11, padding: '3px 8px', background: '#f1f5f9', borderRadius: 4, color: '#64748b' }}>{post.tag || 'general'}</span>
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b' }}>{preview}</p>
      <small style={{ color: '#94a3b8' }}>
        {post.author_name || 'Anonymous'} • {date} • {post.reply_count || 0} replies
      </small>
    </div>
  );
}

function NewThreadModal({ open, onClose, onPosted }) {
  const { showToast } = useNotifications();
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('general');
  const [courseId, setCourseId] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setTag('general');
    setCourseId('');
    setContent('');
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) return showToast('Title must be at least 3 characters', 'warning');
    if (!content.trim() || content.trim().length < 10) return showToast('Content must be at least 10 characters', 'warning');
    setSubmitting(true);
    try {
      await apiFetch('/discussions', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: content.trim(), tag, course_id: courseId.trim() }),
      });
      showToast('Discussion posted!', 'success');
      handleClose();
      onPosted();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Start New Discussion">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Topic Title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's on your mind?" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select required value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="general">General</option>
                <option value="help">Help Wanted</option>
                <option value="event">Event Info</option>
                <option value="academic">Academic</option>
              </select>
            </div>
            <div className="form-group">
              <label>Course ID (Optional)</label>
              <input type="text" value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="e.g. CS301" />
            </div>
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea rows={4} required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe your topic in detail..." />
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Posting…' : 'Post Thread'}
          </button>
          <button type="button" className="btn-cancel" onClick={handleClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function ThreadDetailModal({ postId, onClose, onReplied }) {
  const { showToast } = useNotifications();
  const [post, setPost] = useState(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    setPost(null);
    setReply('');
    apiFetch(`/discussions/${postId}`)
      .then(setPost)
      .catch((e) => showToast('Failed to load thread: ' + e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const submitReply = async () => {
    if (!reply.trim()) return showToast('Please write a reply', 'warning');
    setSubmitting(true);
    try {
      await apiFetch(`/discussions/${postId}/replies`, { method: 'POST', body: JSON.stringify({ content: reply.trim() }) });
      showToast('Reply posted!', 'success');
      onClose();
      onReplied();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!postId} onClose={onClose} title={post?.title || 'Thread'} maxWidth={600}>
      <div className="modal-body">
        {post && (
          <>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              By {post.author_name} • {new Date(post.created_at).toLocaleString()}
            </p>
            <p style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.7 }}>{post.content}</p>
            <hr style={{ border: 0, borderTop: '1px solid var(--border)', marginBottom: 16 }} />
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Replies</h4>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {(post.replies || []).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 13 }}>No replies yet.</p>
              ) : (
                post.replies.map((r, i) => (
                  <div key={i} style={{ padding: 10, background: '#f8fafc', borderRadius: 6, marginBottom: 8 }}>
                    <strong style={{ fontSize: 12 }}>{r.author_name}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 13 }}>{r.content}</p>
                  </div>
                ))
              )}
            </div>
            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0 12px' }} />
            <div className="form-group">
              <label>Post a Reply</label>
              <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write your reply..." />
            </div>
          </>
        )}
      </div>
      <div className="modal-footer">
        <button className="submit-btn" style={{ flex: 1 }} onClick={submitReply} disabled={submitting || !post}>
          Post Reply
        </button>
        <button className="btn-cancel" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

export default function DiscussionForum() {
  const [posts, setPosts] = useState(undefined);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [openPostId, setOpenPostId] = useState(null);
  const { showToast } = useNotifications();

  const load = () => apiFetch('/discussions').then(setPosts).catch((e) => showToast('Failed to load discussions: ' + e.message, 'error'));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h3>Discussion Forum</h3>
        <button className="page-action-btn" onClick={() => setNewThreadOpen(true)}>+ New Thread</button>
      </div>
      <div className="stats-card-body" style={{ padding: 0 }}>
        {posts === undefined ? null : posts.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No discussions yet. Start one!</div>
        ) : (
          posts.map((p) => <ThreadRow key={p.post_id} post={p} onOpen={() => setOpenPostId(p.post_id)} />)
        )}
      </div>
      <NewThreadModal open={newThreadOpen} onClose={() => setNewThreadOpen(false)} onPosted={load} />
      <ThreadDetailModal postId={openPostId} onClose={() => setOpenPostId(null)} onReplied={load} />
    </div>
  );
}
