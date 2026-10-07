/**
 * Dashboard — ported from legacy fixes.js renderStudentMeetings() +
 * renderPendingSubmissions() + renderSyllabusTracker() (the student
 * dashboard-view widgets; the predicted-grade box is static demo content
 * in the legacy markup too, not computed).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { uploadFile } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

export default function Dashboard() {
  const { user } = useAuth();
  const name = user ? `${user.first_name || ''} ${user.last_name || user.username || ''}`.trim() : '';

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Welcome back, {name || 'Student'}</h2>
        <p style={{ fontSize: 14, color: '#64748b' }}>Here's your academic progress overview</p>
      </div>

      <div className="predicted-grade-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
        <div>
          <div className="box-title">Predicted Final Grade</div>
          <div className="box-subtitle">Based on current performance: <strong>A+</strong></div>
        </div>
      </div>

      <UpcomingMeetings />
      <PendingSubmissions />
      <SyllabusTracker />
    </>
  );
}

function UpcomingMeetings() {
  const [meetings, setMeetings] = useState(null);

  useEffect(() => {
    apiFetch('/meetings')
      .then((all) => {
        const today = new Date().toISOString().split('T')[0];
        setMeetings((all || []).filter((m) => m.date >= today));
      })
      .catch(() => setMeetings([]));
  }, []);

  if (!meetings || meetings.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="stats-card" style={{ borderLeft: '4px solid #6366f1' }}>
        <div className="stats-card-header">
          <h3>📅 Upcoming Meetings</h3>
          <span style={{ padding: '4px 10px', background: '#eff6ff', color: '#1e40af', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {meetings.length} Scheduled
          </span>
        </div>
        <div className="stats-card-body" style={{ padding: 16 }}>
          {meetings.map((m, i) => {
            const online = m.mode === 'online';
            return (
              <div key={i} style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 10, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Meeting with {m.faculty_name || 'Faculty'}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>🗓 {m.date} &nbsp;·&nbsp; ⏰ {m.time || 'TBD'}</div>
                    <div style={{ marginTop: 5, fontSize: 12, padding: '3px 8px', background: online ? '#eff6ff' : '#f0fdf4', color: online ? '#1e40af' : '#065f46', borderRadius: 6, display: 'inline-block', fontWeight: 600 }}>
                      {online ? '🌐 Online (Google Meet)' : '🏢 In-Person (Faculty Cabin)'}
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', background: '#eff6ff', color: '#3730a3', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>UPCOMING</span>
                </div>
                {m.agenda && (
                  <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 6, fontSize: 13, color: '#374151' }}>
                    <strong>Agenda:</strong> {m.agenda}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SubmitWorkModal({ assessment, onClose, onSubmitted }) {
  const { showToast } = useNotifications();
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setNotes('');
    setFile(null);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!notes.trim() || notes.trim().length < 5) return showToast('Please describe your submission (min 5 characters)', 'warning');
    setSubmitting(true);
    try {
      const uploaded = file ? await uploadFile(file, 'assessment_submission') : null;
      await apiFetch('/submissions', {
        method: 'POST',
        body: JSON.stringify({ assessment_id: assessment.assessment_id, notes: notes.trim(), file_id: uploaded?.file_id ?? null }),
      });
      showToast('Work submitted successfully! Faculty can now grade you. ✅', 'success');
      handleClose();
      onSubmitted();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!assessment} onClose={handleClose} title="📤 Submit Work">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>
              Assessment: <strong style={{ color: '#6366f1' }}>{assessment?.name}</strong>
            </label>
          </div>
          <div className="form-group">
            <label>
              Submission Notes / Work Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea rows={4} required value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe your work, approach taken, key findings..." />
          </div>
          <div className="form-group">
            <label>Attach File (PDF, DOCX, ZIP – max 15MB)</label>
            <div style={{ border: '2px dashed #e2e8f0', borderRadius: 8, padding: 20, textAlign: 'center', background: '#f8fafc' }}>
              <input type="file" id="submissionFileInput" accept=".pdf,.doc,.docx,.zip,.ppt,.pptx" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
              <button type="button" onClick={() => document.getElementById('submissionFileInput').click()} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Choose File
              </button>
              <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>{file ? file.name : 'No file chosen (optional)'}</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Submitting…' : '✓ Submit Work'}
          </button>
          <button type="button" className="btn-cancel" onClick={handleClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function PendingSubmissions() {
  const [pending, setPending] = useState(null);
  const [target, setTarget] = useState(null);

  const load = () => {
    Promise.all([apiFetch('/assessments'), apiFetch('/submissions').catch(() => [])])
      .then(([assessments, submissions]) => {
        const online = assessments.filter((a) => a.exam_mode === 'online');
        setPending(online.filter((a) => !submissions.find((s) => s.assessment_id === a.assessment_id)));
      })
      .catch(() => setPending([]));
  };
  useEffect(load, []);

  if (!pending || pending.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="stats-card">
        <div className="stats-card-header">
          <h3>📤 Pending Online Submissions</h3>
          <span style={{ padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {pending.length} Pending
          </span>
        </div>
        <div className="stats-card-body" style={{ padding: 16 }}>
          {pending.map((a) => (
            <div key={a.assessment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{a.course_code || a.course_id} &nbsp;·&nbsp; Due: {a.date} &nbsp;·&nbsp; Max: {a.max_marks} marks</div>
              </div>
              <button
                onClick={() => setTarget(a)}
                style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                📤 Submit Work
              </button>
            </div>
          ))}
        </div>
      </div>
      <SubmitWorkModal assessment={target} onClose={() => setTarget(null)} onSubmitted={load} />
    </div>
  );
}

function SyllabusTracker() {
  const [progress, setProgress] = useState(undefined);
  const [section, setSection] = useState('A');
  const [error, setError] = useState(null);
  const [openCourse, setOpenCourse] = useState(null);

  useEffect(() => {
    apiFetch('/students/me')
      .then((student) => {
        const sec = student?.section || 'A';
        setSection(sec);
        return apiFetch(`/syllabus-progress?section=${sec}`);
      })
      .then(setProgress)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h3>📚 Syllabus Completion Tracker</h3>
      </div>
      <div className="stats-card-body" style={{ padding: 20 }}>
        {error ? (
          <p style={{ color: '#ef4444' }}>Failed: {error}</p>
        ) : progress === undefined ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 16 }}>Loading syllabus data...</div>
        ) : progress.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center' }}>No syllabus data for your section.</p>
        ) : (
          <SyllabusBody progress={progress} section={section} openCourse={openCourse} setOpenCourse={setOpenCourse} />
        )}
      </div>
    </div>
  );
}

function SyllabusBody({ progress, section, openCourse, setOpenCourse }) {
  const overall = Math.round(progress.reduce((s, p) => s + (p.progress || 0), 0) / progress.length);
  const overallColor = overall >= 75 ? '#16a34a' : overall >= 50 ? '#d97706' : '#ef4444';

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Overall Completion</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: overallColor }}>{overall}%</span>
        </div>
        <div style={{ height: 12, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: overallColor, width: `${overall}%`, borderRadius: 6 }} />
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Based on {progress.length} course(s) in Section {section}</div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Click a course to see module breakdown
      </div>
      {progress.map((p, i) => {
        const pct = p.progress || 0;
        const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444';
        const isOpen = openCourse === i;
        return (
          <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
            <div
              onClick={() => setOpenCourse(isOpen ? null : i)}
              style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}
            >
              <div>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{p.course_code || ''}</span>
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 6 }}>{p.course_name || ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, color }}>{pct}%</span>
                <span style={{ fontSize: 14, color: '#94a3b8', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
                  &rsaquo;
                </span>
              </div>
            </div>
            {isOpen && (
              <div style={{ padding: '10px 14px', background: '#fafafa', borderTop: '1px solid #f1f5f9' }}>
                {(p.modules || []).length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8' }}>
                    No module breakdown available. Overall: <strong>{pct}%</strong>
                  </div>
                ) : (
                  p.modules.map((m, mi) => {
                    const mp = m.progress || 0;
                    const mc = mp >= 75 ? '#16a34a' : mp >= 50 ? '#d97706' : '#ef4444';
                    return (
                      <div key={mi} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{m.name || `Module ${mi + 1}`}</span>
                          <span style={{ fontWeight: 700, color: mc }}>{mp}%</span>
                        </div>
                        <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: mc, width: `${mp}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
