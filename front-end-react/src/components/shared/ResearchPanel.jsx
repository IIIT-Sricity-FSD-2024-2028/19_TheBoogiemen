/**
 * ResearchPanel — ported from legacy fixes.js renderStudentResearch() +
 * openBTPUploadModal() + submitResearchProgress() (student.html's
 * updateProgressModal — students only upload work, faculty updates
 * progress separately). `role` is the extension point for Phase 2's
 * faculty branch, same pattern as LeavePanel/Timetable.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { uploadFile } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from './Modal';

function ProjectCard({ project, onUpload }) {
  return (
    <div style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{project.title || 'Untitled'}</h4>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1e40af' }}>{project.status || 'pending'}</span>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
        👨‍🏫 Supervisor: <strong>{project.supervisor_name || 'Faculty'}</strong>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b' }}>{project.abstract || ''}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>Progress: <strong>{project.progress || 0}%</strong></span>
        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#6366f1', width: `${project.progress || 0}%` }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={onUpload}
          style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          📤 Upload Work / Update Progress
        </button>
        {project.submission_notes && (
          <span style={{ padding: '8px 12px', background: '#f0fdf4', color: '#16a34a', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>✓ Work submitted</span>
        )}
      </div>
      {project.submission_notes && (
        <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
          <strong>Last submission:</strong> {project.submission_notes}
        </div>
      )}
    </div>
  );
}

function BTPUploadModal({ project, onClose, onSubmitted }) {
  const { user } = useAuth();
  const { showToast, broadcast } = useNotifications();
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [notesError, setNotesError] = useState('');
  const [fileError, setFileError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setNotes('');
    setFile(null);
    setNotesError('');
    setFileError(false);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    let valid = true;
    if (!notes || notes.trim().length < 10) {
      setNotesError('Please describe your work (at least 10 characters).');
      valid = false;
    } else {
      setNotesError('');
    }
    if (!file) {
      setFileError(true);
      valid = false;
    } else {
      setFileError(false);
    }
    if (!valid) return showToast('Please fill all required fields.', 'warning');

    setSubmitting(true);
    try {
      const uploaded = await uploadFile(file, 'research_milestone');
      await apiFetch(`/research/${project.project_id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ submission_notes: notes.trim(), file_id: uploaded?.file_id ?? null, file_name: uploaded?.original_name ?? null }),
      });
      const studentName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'A student';
      broadcast('faculty', studentName, `📤 ${studentName} has submitted work for BTP project "${project.title}". File: ${file.name}. Please review and give feedback.`, 'info');
      showToast('Work submitted to faculty! Faculty has been notified. ✅', 'success');
      handleClose();
      onSubmitted();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!project} onClose={handleClose} title="📤 Submit Your BTP Work">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>
              Project: <strong style={{ color: '#6366f1' }}>{project?.title}</strong>
            </label>
          </div>
          <div className="form-group">
            <label>
              Work Description / Submission Notes <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you have done, challenges faced, next steps..."
              style={{ width: '100%', padding: 10, border: `1.5px solid ${notesError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
            />
            {notesError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{notesError}</div>}
          </div>
          <div className="form-group">
            <label>
              Upload Work File <span style={{ color: '#ef4444' }}>*</span>{' '}
              <span style={{ fontSize: 11, color: '#64748b' }}>(PDF, DOCX, ZIP – max 10MB)</span>
            </label>
            <div
              onClick={() => document.getElementById('btpFileInput').click()}
              style={{
                border: `2px dashed ${fileError ? '#ef4444' : file ? '#16a34a' : '#6366f1'}`,
                borderRadius: 10,
                padding: 24,
                textAlign: 'center',
                background: file ? '#f0fdf4' : '#fafafa',
                cursor: 'pointer',
              }}
            >
              <input
                type="file"
                id="btpFileInput"
                accept=".pdf,.doc,.docx,.zip,.ppt,.pptx"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? '✅' : '📄'}</div>
              <button type="button" style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Choose File
              </button>
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', fontWeight: 600 }}>{file ? file.name : 'No file chosen'}</div>
              {fileError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠ A file is required to submit work.</div>}
            </div>
          </div>
          <div style={{ padding: '10px 12px', background: '#fef9c3', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
            💡 Your faculty will review and update your BTP progress after reviewing your work.
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Submitting…' : '📤 Submit Work to Faculty'}
          </button>
          <button type="button" className="btn-cancel" onClick={handleClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// Faculty's research list is deliberately read-only here, matching the
// legacy app's actually-reachable behavior: renderFacultyResearch() (wired
// to the live Research Projects nav item) never renders an update button.
// A richer renderFacultyResearchEnhanced()/openFacultyBTPModal() pair does
// exist in fixes.js with a working "Update Progress" flow, but nothing in
// faculty.html or the view-dispatch table ever calls it — it's dead code,
// superseded by the simpler read-only renderer. Not wired up here either,
// unlike Phase 1's enroll-course fix: that was one finished flow missing a
// button; this is a whole second implementation that was abandoned in
// favor of a different one, which reads as a deliberate simplification
// rather than an oversight.
function FacultyProjectCard({ project }) {
  return (
    <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>{project.title}</h4>
        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, background: '#e2e8f0' }}>{project.status}</span>
      </div>
      <p style={{ fontSize: 13, color: '#64748b' }}>{project.abstract || ''}</p>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>Progress: {project.progress || 0}%</div>
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#6366f1', width: `${project.progress || 0}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function ResearchPanel({ role }) {
  const [projects, setProjects] = useState(undefined);
  const [uploadTarget, setUploadTarget] = useState(null);

  const load = () => apiFetch('/research').then(setProjects).catch(() => setProjects([]));
  useEffect(() => {
    load();
  }, []);

  if (role !== 'student' && role !== 'faculty') return null; // admin branch, if any, is a later phase

  if (projects === undefined) return null;

  if (role === 'faculty') {
    if (!projects.length) return <p style={{ color: '#64748b', textAlign: 'center' }}>No research projects.</p>;
    return projects.map((p) => <FacultyProjectCard key={p.project_id} project={p} />);
  }

  if (!projects.length) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>No BTP projects assigned yet</div>
        <div style={{ fontSize: 13, marginTop: 6, color: '#94a3b8' }}>Your faculty will assign a BTP project to you.</div>
      </div>
    );
  }

  return (
    <>
      {projects.map((p) => (
        <ProjectCard key={p.project_id} project={p} onUpload={() => setUploadTarget(p)} />
      ))}
      <BTPUploadModal project={uploadTarget} onClose={() => setUploadTarget(null)} onSubmitted={load} />
    </>
  );
}
