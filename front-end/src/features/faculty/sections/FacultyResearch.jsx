import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Plus, Trash2, Users } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState, ProgressBar } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { downloadFile } from '../../../services/apiClient';
import { apiRequestFailed } from '../../../app/apiActions';
import { capitalize, formatDate, formatDateTime, fullName } from '../../../shared/format';
import { STATUS_TONE, useAllRosters, useFacultySections } from './common';

// Values accepted by updateProject in back-end/src/campus/campus.service.ts.
const PROJECT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
];
const MILESTONE_STATUSES = ['pending', 'in-progress', 'completed'];

const statusLabel = (s) => PROJECT_STATUSES.find((p) => p.value === s)?.label || capitalize(s);

function ProjectEditor({ project, onSaved }) {
  const initial = useMemo(
    () => ({
      progress: project.progress ?? 0,
      status: project.status,
      faculty_feedback: project.faculty_feedback || '',
      milestones: (project.milestones || []).map((m) => ({ ...m, due_date: m.due_date || '' })),
    }),
    [project]
  );
  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [save, { loading, error }] = useMutation();
  useEffect(() => setForm(initial), [initial]);

  const msErrors = form.milestones.map((m) => (!m.title.trim() ? 'Every milestone needs a title.' : null));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const setMs = (i, field, value) => {
    setSaved(false);
    setForm((p) => ({ ...p, milestones: p.milestones.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (msErrors.some(Boolean)) return;
    const res = await save(
      'patch',
      `/research/${encodeURIComponent(project.project_id)}`,
      {
        progress: Number(form.progress),
        status: form.status,
        faculty_feedback: form.faculty_feedback,
        milestones: form.milestones.map((m) => ({ ...(m.milestone_id ? { milestone_id: m.milestone_id } : {}), title: m.title.trim(), due_date: m.due_date || null, status: m.status })),
      },
      { label: `Updated research project "${project.title}"` }
    );
    if (res.ok) {
      setSaved(true);
      setSubmitted(false);
      onSaved();
    }
  };

  return (
    <form className="sp-form" onSubmit={submit} noValidate style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--sp-border)' }}>
      <div className="sp-form-row">
        <div className="sp-field">
          <label htmlFor={`rp-progress-${project.project_id}`}>Progress: {form.progress}%</label>
          <input
            id={`rp-progress-${project.project_id}`}
            type="range"
            className="sp-range"
            min={0}
            max={100}
            step={5}
            value={form.progress}
            style={{ '--fill': `${form.progress}%` }}
            onChange={(e) => { setSaved(false); setForm((p) => ({ ...p, progress: Number(e.target.value) })); }}
          />
        </div>
        <div className="sp-field">
          <label htmlFor={`rp-status-${project.project_id}`}>Status</label>
          <select id={`rp-status-${project.project_id}`} className="sp-select" value={form.status} onChange={(e) => { setSaved(false); setForm((p) => ({ ...p, status: e.target.value })); }}>
            {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="sp-field">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-text-2)' }}>Milestones</span>
        {form.milestones.length === 0 && <p className="sp-hint">No milestones yet. Add checkpoints so students know what is due.</p>}
        {form.milestones.map((m, i) => (
          <div key={m.milestone_id || `new-${i}`}>
            <div className="fac-milestone">
              <input className="sp-input" aria-label={`Milestone ${i + 1} title`} placeholder="Milestone title" value={m.title} onChange={(e) => setMs(i, 'title', e.target.value)} aria-invalid={submitted && msErrors[i] ? 'true' : undefined} />
              <input type="date" className="sp-input" aria-label={`Milestone ${i + 1} due date`} value={m.due_date} onChange={(e) => setMs(i, 'due_date', e.target.value)} />
              <select className="sp-select" aria-label={`Milestone ${i + 1} status`} value={m.status} onChange={(e) => setMs(i, 'status', e.target.value)}>
                {MILESTONE_STATUSES.map((s) => <option key={s} value={s}>{capitalize(s.replace('-', ' '))}</option>)}
              </select>
              <button type="button" className="sp-icon-btn" aria-label={`Remove milestone ${i + 1}`} onClick={() => { setSaved(false); setForm((p) => ({ ...p, milestones: p.milestones.filter((_, idx) => idx !== i) })); }}>
                <Trash2 size={15} />
              </button>
            </div>
            {submitted && msErrors[i] && <p className="sp-field-error">{msErrors[i]}</p>}
          </div>
        ))}
        <div>
          <button type="button" className="sp-btn is-secondary is-small" onClick={() => { setSaved(false); setForm((p) => ({ ...p, milestones: [...p.milestones, { title: '', due_date: '', status: 'pending' }] })); }}>
            <Plus size={13} /> Add milestone
          </button>
        </div>
      </div>

      <div className="sp-field">
        <label htmlFor={`rp-fb-${project.project_id}`}>Feedback to students</label>
        <textarea id={`rp-fb-${project.project_id}`} className="sp-textarea" maxLength={2000} value={form.faculty_feedback} onChange={(e) => { setSaved(false); setForm((p) => ({ ...p, faculty_feedback: e.target.value })); }} />
      </div>
      {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      {saved && !dirty && <div className="sp-alert is-success" role="status">Project updated.</div>}
      <div className="sp-btn-row">
        <button type="submit" className="sp-btn" disabled={loading || !dirty}>{loading ? 'Saving...' : 'Save changes'}</button>
        {dirty && <button type="button" className="sp-btn is-secondary" onClick={() => setForm(initial)}>Discard</button>}
      </div>
    </form>
  );
}

function ProjectCard({ project, onSaved }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const done = (project.milestones || []).filter((m) => m.status === 'completed').length;
  return (
    <article className="sp-card is-hover">
      <div className="sp-card-head">
        <div>
          <h2 className="sp-card-title">{project.title}</h2>
          <div className="sp-card-meta">
            <Users size={13} style={{ verticalAlign: -2 }} /> {project.students.map((s) => `${fullName(s)}${s.roll_no ? ` (${s.roll_no})` : ''}`).join(', ') || 'No students'}
          </div>
        </div>
        <span className={`sp-badge ${STATUS_TONE[project.status] || 'is-neutral'}`}>{statusLabel(project.status)}</span>
      </div>
      {project.abstract && <p style={{ margin: '10px 0 0' }} className="sp-muted">{project.abstract}</p>}
      <div className="sp-progress-row">
        <span>Progress</span>
        <strong>{project.progress ?? 0}%</strong>
      </div>
      <ProgressBar value={project.progress ?? 0} label={`${project.title} progress`} />
      <div className="sp-stat-note" style={{ marginTop: 6 }}>
        {(project.milestones || []).length ? `${done} of ${project.milestones.length} milestones completed` : 'No milestones set'}
      </div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--sp-card-alt)' }}>
        <div className="sp-stat-label">Latest student update{project.submitted_at ? ` · ${formatDateTime(project.submitted_at)}` : ''}</div>
        <p style={{ margin: '4px 0 0' }}>{project.submission_notes || <span className="sp-muted">No update submitted yet.</span>}</p>
        {project.uploads?.length > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
            {project.uploads.map((u) => (
              <li key={u.file_id}>
                <button type="button" className="sp-link-btn" onClick={() => downloadFile(`/uploads/${u.file_id}`, u.original_name).catch((err) => dispatch(apiRequestFailed({ status: err.status ?? 0, message: err.message, path: `/uploads/${u.file_id}`, method: 'GET' })))}>{u.original_name}</button>{' '}
                <span className="sp-muted">· {formatDate(u.uploaded_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sp-btn-row" style={{ marginTop: 12 }}>
        <button type="button" className="sp-btn is-secondary is-small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Close editor' : 'Update progress and feedback'}
        </button>
      </div>
      {open && <ProjectEditor project={project} onSaved={onSaved} />}
    </article>
  );
}

function NewProjectForm({ students, studentsState, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', abstract: '', student_ids: [] });
  const [submitted, setSubmitted] = useState(false);
  const [save, { loading, error }] = useMutation();
  const errors = {};
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (form.student_ids.length < 1 || form.student_ids.length > 4) errors.student_ids = 'Choose 1 to 4 students.';
  const toggle = (id) => setForm((p) => ({ ...p, student_ids: p.student_ids.includes(id) ? p.student_ids.filter((x) => x !== id) : [...p.student_ids, id] }));

  const submit = async (e) => {
    e?.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const res = await save('post', '/research', { title: form.title.trim(), abstract: form.abstract.trim(), student_ids: form.student_ids }, { label: `Created research project "${form.title.trim()}"` });
    if (res.ok) onSaved();
  };

  return (
    <Modal
      title="New research project"
      onClose={onClose}
      width={600}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="sp-btn" onClick={submit} disabled={loading}>{loading ? 'Creating...' : 'Create project'}</button>
        </>
      }
    >
      <form className="sp-form" onSubmit={submit} noValidate>
        <div className="sp-field">
          <label htmlFor="rp-title">Title</label>
          <input id="rp-title" className="sp-input" maxLength={150} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} aria-invalid={submitted && errors.title ? 'true' : undefined} />
          {submitted && errors.title && <p className="sp-field-error">{errors.title}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="rp-abstract">Abstract (optional)</label>
          <textarea id="rp-abstract" className="sp-textarea" maxLength={2000} value={form.abstract} onChange={(e) => setForm((p) => ({ ...p, abstract: e.target.value }))} />
        </div>
        <fieldset className="sp-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-text-2)', marginBottom: 6 }}>Students ({form.student_ids.length}/4) · from your sections</legend>
          {studentsState.status === 'failed' ? (
            <ErrorState error={studentsState.error} onRetry={studentsState.reload} />
          ) : studentsState.status !== 'succeeded' ? (
            <LoadingState lines={2} />
          ) : students.length === 0 ? (
            <p className="sp-hint">No students in your sections yet.</p>
          ) : (
            <div className="fac-chip-row" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {students.map((s) => {
                const on = form.student_ids.includes(s.student_id);
                return (
                  <label key={s.student_id} className={`sp-toggle-chip${on ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(s.student_id)} disabled={!on && form.student_ids.length >= 4} />
                    {s.name} <span style={{ opacity: 0.7 }}>{s.roll_no}</span>
                  </label>
                );
              })}
            </div>
          )}
          {submitted && errors.student_ids && <p className="sp-field-error">{errors.student_ids}</p>}
        </fieldset>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      </form>
    </Modal>
  );
}

export default function FacultyResearch() {
  const list = useApiResource('/research');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('all');
  const { resource: secRes, list: sections } = useFacultySections();
  const rosters = useAllRosters(sections, creating && secRes.status === 'succeeded');
  const students = useMemo(() => {
    const m = new Map();
    (rosters.data || []).forEach((r) => m.set(r.student_id, r));
    return [...m.values()].sort((a, b) => String(a.roll_no).localeCompare(String(b.roll_no)));
  }, [rosters.data]);

  const all = Array.isArray(list.data) ? list.data : [];
  const rows = filter === 'all' ? all : all.filter((p) => p.status === filter);

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Research Supervision</h1>
          <p className="sp-page-subtitle">Projects you supervise. Review student updates, set milestones, and give feedback.</p>
        </div>
        <button type="button" className="sp-btn" onClick={() => setCreating(true)}>
          <Plus size={15} /> New project
        </button>
      </div>

      <div className="sp-card" style={{ marginBottom: 16 }}>
        <div className="sp-segmented" role="group" aria-label="Filter projects">
          {[{ value: 'all', label: 'All' }, ...PROJECT_STATUSES].map((f) => (
            <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}{list.status === 'succeeded' ? ` (${f.value === 'all' ? all.length : all.filter((p) => p.status === f.value).length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {list.status === 'loading' && !list.data && <div className="sp-card"><LoadingState lines={5} /></div>}
      {list.status === 'failed' && <div className="sp-card"><ErrorState error={list.error} onRetry={list.reload} /></div>}
      {list.status !== 'failed' && list.data &&
        (rows.length === 0 ? (
          <div className="sp-card">
            <EmptyState title={all.length ? 'No projects match' : 'No projects yet'} message={all.length ? 'Try another filter.' : 'Create a project to start supervising students.'} />
          </div>
        ) : (
          <div className="sp-grid sp-grid-2">
            {rows.map((p) => <ProjectCard key={p.project_id} project={p} onSaved={list.reload} />)}
          </div>
        ))}

      {creating && (
        <NewProjectForm
          students={students}
          studentsState={secRes.status === 'failed' ? { status: 'failed', error: secRes.error, reload: () => {} } : secRes.status === 'succeeded' && sections.length === 0 ? { status: 'succeeded' } : rosters}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            list.reload();
          }}
        />
      )}
    </>
  );
}
