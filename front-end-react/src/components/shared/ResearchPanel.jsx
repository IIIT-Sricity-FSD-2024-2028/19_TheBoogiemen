/**
 * ResearchPanel — ported from legacy fixes.js renderStudentResearch() +
 * openBTPUploadModal() + submitResearchProgress() (student.html's
 * updateProgressModal — students only upload work, faculty updates
 * progress separately).
 *
 * `role` prop selects between:
 *   - student: upload work against a supervisor's project
 *   - faculty: review submissions, download attached files, update
 *     progress and write feedback (ported from legacy's
 *     renderFacultyResearchEnhanced() + openFacultyBTPModal() +
 *     submitFacultyBTPProgress() — see parity exceptions log)
 */
import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { uploadFile, downloadDocument } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from './Modal';

// ── Student components (unchanged) ──────────────────────────────────────────

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
                        <label>Project: <strong style={{ color: '#6366f1' }}>{project?.title}</strong></label>
                    </div>
                    <div className="form-group">
                        <label>Work Description / Submission Notes <span style={{ color: '#ef4444' }}>*</span></label>
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
                        <label>Upload Work File <span style={{ color: '#ef4444' }}>*</span> <span style={{ fontSize: 11, color: '#64748b' }}>(PDF, DOCX, ZIP – max 10MB)</span></label>
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

// ── Faculty components ──────────────────────────────────────────────────────

/**
 * FacultyProjectCard — the richer BTP management card that was present in the
 * legacy app's renderFacultyResearchEnhanced() but missing from the initial
 * React port. Shows the supervised student, submission notes, a download
 * button for the latest uploaded file, and an awaiting-submission indicator.
 */
function FacultyProjectCard({ project, onOpenProgress }) {
    const { showToast } = useNotifications();
    const studentNames = (project.students || [])
        .map((s) => `${s.first_name || ''} ${s.last_name || ''}`.trim())
        .filter(Boolean)
        .join(', ') || project.student_name || project.student_id || 'N/A';

    const lastUpload = project.uploads?.length
        ? project.uploads[project.uploads.length - 1]
        : null;

    const handleDownload = async () => {
        if (!lastUpload?.file_id) return;
        try {
            await downloadDocument(lastUpload.file_id, lastUpload.original_name);
        } catch (e) {
            showToast('Failed to download: ' + e.message, 'error');
        }
    };

    return (
        <div style={{ padding: 18, border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 14, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{project.title}</h4>
                    <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginTop: 3 }}>
                        👤 Student: {studentNames}
                    </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: project.status === 'active' ? '#dcfce7' : '#f1f5f9', color: project.status === 'active' ? '#166534' : '#475569', marginLeft: 8 }}>
                    {project.status}
                </span>
            </div>

            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>{project.abstract || 'No abstract provided.'}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>Progress: <strong>{project.progress || 0}%</strong></span>
                <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${project.progress || 0}%`, transition: 'width .4s' }} />
                </div>
            </div>

            {project.submission_notes ? (
                <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#15803d', marginBottom: 10 }}>
                    <strong>📤 Student Work Submitted:</strong><br />
                    {project.submission_notes}
                    {lastUpload && (
                        <>
                            <br />
                            <button
                                type="button"
                                onClick={handleDownload}
                                style={{ marginTop: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: '#fff', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer' }}
                            >
                                📎 Download {lastUpload.original_name || 'document'}
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div style={{ padding: '10px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                    ⏳ Awaiting student work submission
                </div>
            )}

            <button
                onClick={onOpenProgress}
                style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
                ✏ Update Progress / Feedback
            </button>
        </div>
    );
}

/**
 * FacultyBTPProgressModal — faculty writes a progress percentage and feedback
 * for the student. Mirrors legacy's openFacultyBTPModal() +
 * submitFacultyBTPProgress(): PATCH /research/:id/progress with
 * { progress, faculty_feedback }, then notify the student.
 */
function FacultyBTPProgressModal({ project, onClose, onSaved }) {
    const { user } = useAuth();
    const { showToast, send } = useNotifications();
    const [progress, setProgress] = useState('');
    const [feedback, setFeedback] = useState('');
    const [feedbackError, setFeedbackError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!project) return;
        setProgress(String(project.progress || 0));
        setFeedback('');
        setFeedbackError('');
    }, [project]);

    const submit = async () => {
        if (!project) return;

        const progressNum = Number(progress);
        if (progress === '' || isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
            showToast('Progress must be between 0 and 100', 'warning');
            return;
        }
        if (!feedback || feedback.trim().length < 5) {
            setFeedbackError('Please enter feedback for the student (at least 5 characters)');
            return;
        }
        setFeedbackError('');

        setSubmitting(true);
        try {
            await apiFetch(`/research/${project.project_id}/progress`, {
                method: 'PATCH',
                body: JSON.stringify({ progress: progressNum, faculty_feedback: feedback.trim() }),
            });
            // Notify the supervised student
            const studentId = project.student_id || project.students?.[0]?.user_id;
            const from = user?.first_name || 'Faculty';
            if (studentId) {
                send(studentId, from, `📊 BTP Progress updated to ${progressNum}%. Feedback: ${feedback.trim()}`, 'info');
            }
            showToast('BTP progress updated! Student notified. ✅', 'success');
            onClose();
            onSaved();
        } catch (e) {
            showToast('Failed: ' + e.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={!!project} onClose={onClose} title="✏ Update BTP Progress">
            <div className="modal-body">
                <div className="form-group">
                    <label>Project: <strong style={{ color: '#6366f1' }}>{project?.title}</strong></label>
                </div>
                <div className="form-group">
                    <label>Progress (%) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={progress}
                        onChange={(e) => setProgress(e.target.value)}
                        placeholder="e.g. 60"
                        style={{ width: '100%', padding: 10, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    />
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Enter a value from 0 to 100</div>
                </div>
                <div className="form-group">
                    <label>Feedback / Comments for Student</label>
                    <textarea
                        rows={3}
                        value={feedback}
                        onChange={(e) => { setFeedback(e.target.value); setFeedbackError(''); }}
                        placeholder="e.g. Good progress! Please focus on the literature review section next."
                        style={{
                            width: '100%',
                            padding: 10,
                            border: `1.5px solid ${feedbackError ? '#ef4444' : '#e2e8f0'}`,
                            borderRadius: 8,
                            fontSize: 14,
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            background: feedbackError ? '#fff1f2' : undefined,
                        }}
                    />
                    {feedbackError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{feedbackError}</div>}
                </div>
                <div style={{ padding: '12px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e40af', marginTop: 4 }}>
                    💡 The student will receive a notification with the updated progress and your feedback.
                </div>
            </div>
            <div className="modal-footer">
                <button onClick={submit} className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
                    {submitting ? 'Saving…' : '📊 Save Progress & Notify Student'}
                </button>
                <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            </div>
        </Modal>
    );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ResearchPanel({ role }) {
    const [projects, setProjects] = useState(undefined);
    const [uploadTarget, setUploadTarget] = useState(null);       // student
    const [progressTarget, setProgressTarget] = useState(null);   // faculty

    const load = () => apiFetch('/research').then(setProjects).catch(() => setProjects([]));

    useEffect(() => {
        load();
    }, []);

    if (role !== 'student' && role !== 'faculty') return null;
    if (projects === undefined) return null;

    // ── Student branch ──────────────────────────────────────────────────
    if (role === 'student') {
        return (
            <>
                {projects.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>No BTP projects assigned yet</div>
                        <div style={{ fontSize: 13, marginTop: 6, color: '#94a3b8' }}>Your faculty will assign a BTP project to you.</div>
                    </div>
                ) : (
                    projects.map((p) => (
                        <ProjectCard key={p.project_id} project={p} onUpload={() => setUploadTarget(p)} />
                    ))
                )}
                <BTPUploadModal project={uploadTarget} onClose={() => setUploadTarget(null)} onSubmitted={load} />
            </>
        );
    }

    // ── Faculty branch ──────────────────────────────────────────────────
    if (!projects.length) {
        return <p style={{ color: '#64748b', textAlign: 'center' }}>No research projects.</p>;
    }

    return (
        <>
            {projects.map((p) => (
                <FacultyProjectCard
                    key={p.project_id}
                    project={p}
                    onOpenProgress={() => setProgressTarget(p)}
                />
            ))}
            <FacultyBTPProgressModal
                project={progressTarget}
                onClose={() => setProgressTarget(null)}
                onSaved={load}
            />
        </>
    );
}