import React, { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Download, Paperclip } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { api, downloadFile } from '../../../services/apiClient';
import { apiRequestFailed } from '../../../app/apiActions';
import { EmptyState, ErrorState, LoadingState, ProgressBar } from '../../../shared/ui/StatusViews';
import { capitalize, displayValue, formatDate, formatDateTime } from '../../../shared/format';

const MILESTONE_TONE = { completed: 'is-success', 'in-progress': 'is-warning', pending: 'is-neutral' };
const STATUS_TONE = { active: 'is-success', completed: 'is-info', on_hold: 'is-warning' };
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.zip';
const MAX_BYTES = 5 * 1024 * 1024; // matches the backend UPLOAD_MAX_BYTES default

/**
 * Student update: optional file via POST /api/uploads?context=research_milestone
 * (returns data.file_id), then PATCH /api/research/:id {submission_notes, file_id?}.
 */
function SubmissionUpdateForm({ project, onSaved }) {
  const dispatch = useDispatch();
  const fileInput = useRef(null);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [send, { loading }] = useMutation();
  const [state, setState] = useState({ error: null, fileError: null, success: null });

  const pickFile = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > MAX_BYTES) {
      setFile(null);
      e.target.value = '';
      setState((s) => ({ ...s, fileError: 'The file is larger than 5 MB.' }));
      return;
    }
    setFile(f);
    setState((s) => ({ ...s, fileError: null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!notes.trim()) {
      setState({ error: 'Describe the progress you are submitting.', fileError: null, success: null });
      return;
    }
    setState({ error: null, fileError: null, success: null });

    let fileId;
    if (file) {
      setUploading(true);
      try {
        const up = await api.upload(file, 'research_milestone');
        fileId = up?.data?.file_id || up?.file_id;
      } catch (err) {
        setUploading(false);
        setState({ error: null, fileError: `Upload failed: ${err.message}`, success: null });
        dispatch(apiRequestFailed({ status: err.status ?? 0, message: err.message, path: '/uploads', method: 'POST' }));
        return;
      }
      setUploading(false);
    }

    const body = { submission_notes: notes.trim(), ...(fileId ? { file_id: fileId } : {}) };
    const res = await send('patch', `/research/${encodeURIComponent(project.project_id)}`, body, {
      label: `Sent a progress update for "${project.title}"`,
    });
    if (res.ok) {
      setNotes('');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setState({ error: null, fileError: null, success: 'Progress update sent to your supervisor.' });
      onSaved();
    } else {
      setState({ error: res.error.message, fileError: null, success: null });
    }
  };

  const fieldId = `research-notes-${project.project_id}`;
  const fileId = `research-file-${project.project_id}`;
  const busy = loading || uploading;
  return (
    <form className="sp-form" onSubmit={handleSubmit} noValidate style={{ marginTop: 16 }}>
      {state.error && <div className="sp-alert is-error" role="alert">{state.error}</div>}
      {state.success && <div className="sp-alert is-success" role="status">{state.success}</div>}
      <div className="sp-field">
        <label htmlFor={fieldId}>Submit a progress update</label>
        <textarea id={fieldId} className="sp-textarea" value={notes} maxLength={2000}
          onChange={(e) => setNotes(e.target.value)} placeholder="What have you completed since the last update?" />
      </div>
      <div className="sp-field">
        <label htmlFor={fileId}>Attach a file (optional)</label>
        <input id={fileId} ref={fileInput} type="file" accept={ACCEPT} className="sp-input" onChange={pickFile} aria-invalid={!!state.fileError} />
        <p className="sp-hint">PDF, image, Word, PowerPoint or ZIP, up to 5 MB.</p>
        {state.fileError && <p className="sp-field-error">{state.fileError}</p>}
      </div>
      <div className="sp-btn-row">
        <button type="submit" className="sp-btn is-small" disabled={busy}>
          {uploading ? 'Uploading file...' : loading ? 'Sending...' : 'Send update'}
        </button>
      </div>
    </form>
  );
}

function Attachments({ uploads }) {
  const dispatch = useDispatch();
  const [state, setState] = useState({ busy: null, error: null });
  const download = async (u) => {
    const path = `/uploads/${encodeURIComponent(u.file_id)}`;
    setState({ busy: u.file_id, error: null });
    try {
      await downloadFile(path, u.original_name || 'attachment');
      setState({ busy: null, error: null });
    } catch (err) {
      setState({ busy: null, error: err.message });
      dispatch(apiRequestFailed({ status: err.status ?? 0, message: err.message, path, method: 'GET' }));
    }
  };
  return (
    <>
      <h3 className="sp-section-title" style={{ fontSize: 14, marginTop: 16 }}>Attached files</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        {uploads.map((u) => (
          <li key={u.file_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <span><Paperclip size={14} aria-hidden="true" /> {u.original_name || 'File'} <span className="sp-muted">· {formatDateTime(u.uploaded_at)}</span></span>
            <button type="button" className="sp-btn is-small is-secondary" onClick={() => download(u)} disabled={state.busy === u.file_id}>
              <Download size={14} /> {state.busy === u.file_id ? 'Downloading...' : 'Download'}
            </button>
          </li>
        ))}
      </ul>
      {state.error && <p className="sp-field-error" role="alert">Could not download: {state.error}</p>}
    </>
  );
}

function ProjectCard({ project, onSaved }) {
  const milestones = Array.isArray(project.milestones) ? project.milestones : [];
  const team = Array.isArray(project.students) ? project.students : [];
  const uploads = Array.isArray(project.uploads) ? project.uploads : [];
  return (
    <article className="sp-card">
      <div className="sp-card-head">
        <div>
          <h2 className="sp-card-title">{project.title}</h2>
          <div className="sp-card-meta">
            Supervisor: {displayValue(project.supervisor_name, 'Not assigned')}
            {team.length > 0 && ` · Team: ${team.map((s) => [s.first_name, s.last_name].filter(Boolean).join(' ')).join(', ')}`}
          </div>
        </div>
        <span className={`sp-badge ${STATUS_TONE[project.status] || 'is-neutral'}`}>{capitalize(String(project.status || '').replace(/_/g, ' '))}</span>
      </div>

      {project.abstract && <p style={{ margin: '10px 0' }}>{project.abstract}</p>}

      <div className="sp-progress-row">
        <span>Overall progress</span>
        <span>{typeof project.progress === 'number' ? `${project.progress}%` : 'Not set'}</span>
      </div>
      <ProgressBar value={project.progress} label={`${project.title} progress`} />

      {milestones.length > 0 && (
        <>
          <h3 className="sp-section-title" style={{ fontSize: 14, marginTop: 16 }}>Milestones</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {milestones.map((m) => (
              <li key={m.milestone_id || m.title} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{m.title}{m.due_date && <span className="sp-muted"> · due {formatDate(m.due_date)}</span>}</span>
                <span className={`sp-badge ${MILESTONE_TONE[m.status] || 'is-neutral'}`}>{capitalize(m.status)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <dl className="sp-details" style={{ marginTop: 16 }}>
        <div>
          <dt>Last submission</dt>
          <dd style={{ fontWeight: 400 }}>
            {displayValue(project.submission_notes, 'Nothing submitted yet')}
            {project.submitted_at && <div className="sp-card-meta">{formatDateTime(project.submitted_at)}</div>}
          </dd>
        </div>
        <div><dt>Supervisor feedback</dt><dd style={{ fontWeight: 400 }}>{displayValue(project.faculty_feedback, 'No feedback yet')}</dd></div>
      </dl>

      {uploads.length > 0 && <Attachments uploads={uploads} />}

      <SubmissionUpdateForm project={project} onSaved={onSaved} />
    </article>
  );
}

/** Research projects the student is a member of (GET /api/research, research module). */
export default function StudentResearch() {
  const projects = useApiResource('/research');
  const projectList = Array.isArray(projects.data) ? projects.data : [];

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Research</h1>
          <p className="sp-page-subtitle">Your BTP / research projects: milestones, supervisor feedback and progress updates.</p>
        </div>
      </div>

      <section aria-label="Research projects">
        {projects.status === 'loading' && !projects.data && <LoadingState label="Loading projects..." />}
        {projects.status === 'failed' && <ErrorState error={projects.error} onRetry={projects.reload} />}
        {projects.data && projectList.length === 0 && (
          <div className="sp-card">
            <EmptyState title="No research project assigned" message="Projects are created by your faculty supervisor and will appear here." />
          </div>
        )}
        <div className="sp-grid">
          {projectList.map((p) => (
            <ProjectCard key={p.project_id} project={p} onSaved={projects.reload} />
          ))}
        </div>
      </section>
    </>
  );
}
