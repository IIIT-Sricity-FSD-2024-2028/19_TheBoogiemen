/**
 * AssessmentMapping — ported from legacy fixes.js renderAssessmentList() +
 * populateAssessSectionOptions() + submitCreateAssessment() (the
 * assessmentModal) and openMarksModal() + submitMarksEntry() (the
 * marksEntryModal, including the "already-locked marks show read-only"
 * follow-up patch — originally a second `window.openMarksModal` definition
 * monkey-patching the first in fixes.js; folded into one function here).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { downloadDocument } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

function CreateAssessmentModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [marks, setMarks] = useState('');
  const [mode, setMode] = useState('offline');
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [section, setSection] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setType('');
    setDate('');
    setMarks('');
    setMode('offline');
    setCourseId('');
    setSection('');
    apiFetch('/courses')
      .then(setCourses)
      .catch(() => setCourses([]));
  }, [open]);

  // A course can have several sections, each with a different faculty —
  // re-derives which section(s) of the selected course belong to the
  // logged-in faculty every time the course changes, rather than the
  // server guessing (and refusing when there's more than one to guess).
  const mySections = (courses?.find((c) => c.course_id === courseId)?.sections || []).filter((s) => s.faculty_id === user?.user_id);

  useEffect(() => {
    setSection(mySections.length === 1 ? mySections[0].section : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name || name.trim().length < 3) return showToast('Assessment name must be at least 3 characters', 'warning');
    if (!type) return showToast('Please select assessment type', 'warning');
    if (!date) return showToast('Date is required', 'warning');
    if (!courseId) return showToast('Please select a course', 'warning');
    if (!section) return showToast('Please select a section', 'warning');
    if (!marks || Number(marks) < 1) return showToast('Enter valid max marks (min 1)', 'warning');
    if (Number(marks) > 1000) return showToast('Max marks cannot exceed 1000', 'warning');

    setSubmitting(true);
    try {
      await apiFetch('/assessments', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), type, date, max_marks: Number(marks), course_id: courseId, section, exam_mode: mode }),
      });
      showToast('Assessment created!', 'success');
      onClose();
      onCreated();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Assessment">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Assessment Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Mid-term Exam" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Select type</option>
                <option value="theory">Theory Exam</option>
                <option value="practical">Practical / Lab</option>
                <option value="assignment">Assignment</option>
                <option value="project">Project</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Total Marks</label>
              <input type="number" min={1} max={1000} value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="100" />
            </div>
            <div className="form-group">
              <label>Exam Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="offline">Offline (Direct entry)</option>
                <option value="online">Online (Students submit first)</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Course</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">{courses === null ? 'Loading courses…' : 'Select course'}</option>
                {courses?.map((c) => (
                  <option key={c.course_id} value={c.course_id}>{c.course_code} – {c.course_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Section</label>
              <select value={section} onChange={(e) => setSection(e.target.value)}>
                {!courseId ? (
                  <option value="">— Select a course first —</option>
                ) : mySections.length > 1 ? (
                  <>
                    <option value="">— Select Section —</option>
                    {mySections.map((s) => <option key={s.section} value={s.section}>Section {s.section}</option>)}
                  </>
                ) : (
                  mySections.map((s) => <option key={s.section} value={s.section}>Section {s.section}</option>)
                )}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Assessment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MarksEntryModal({ assessment, onClose, onSaved }) {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [students, setStudents] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [existingMarks, setExistingMarks] = useState([]);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isOnline = assessment?.exam_mode === 'online';

  useEffect(() => {
    if (!assessment) return;
    setStudents(null);
    setValues({});
    setErrors({});
    Promise.all([
      apiFetch('/faculty/me/students'),
      isOnline ? apiFetch('/submissions').catch(() => []) : Promise.resolve([]),
      apiFetch(`/marks?assessment_id=${assessment.assessment_id}`).catch(() => []),
    ]).then(([s, subs, marks]) => {
      setStudents(s);
      setSubmissions(subs);
      setExistingMarks(marks || []);
      const init = {};
      (marks || []).forEach((m) => {
        init[m.student_id] = m.marks_obtained;
      });
      setValues(init);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment]);

  const submit = async () => {
    const maxMarks = assessment.max_marks || 100;
    const records = [];
    const nextErrors = {};
    let hasError = false;

    for (const [student_id, raw] of Object.entries(values)) {
      if (existingMarks.some((m) => m.student_id === student_id)) continue; // locked, read-only
      if (raw === '' || raw === undefined || raw === null) continue;
      const val = Number(raw);
      if (isNaN(val) || val < 0 || val > maxMarks) {
        nextErrors[student_id] = true;
        hasError = true;
        continue;
      }
      records.push({ student_id, assessment_id: assessment.assessment_id, marks_obtained: val, max_marks: maxMarks });
    }
    setErrors(nextErrors);
    if (hasError) return showToast(`Marks must be between 0 and ${maxMarks}`, 'warning');
    if (!records.length) return showToast('Enter at least one student mark', 'warning');

    setSubmitting(true);
    let saved = 0;
    let locked = 0;
    const from = user?.first_name || 'Faculty';
    try {
      for (const r of records) {
        try {
          await apiFetch('/marks', { method: 'POST', body: JSON.stringify(r) });
          saved++;
          send(r.student_id, from, `📊 Your marks for "${assessment.name}" have been posted: ${r.marks_obtained}/${maxMarks}. These marks are now locked and final.`, 'marks');
        } catch (err) {
          if (err.message?.includes('locked')) locked++;
          else throw err;
        }
      }
      let msg = `Marks saved for ${saved} student(s)!`;
      if (locked > 0) msg += ` (${locked} already locked — skipped)`;
      showToast(msg + ' Students notified. ✅', 'success');
      onClose();
      onSaved();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!assessment}
      onClose={onClose}
      title={<>Enter Marks — <span style={{ fontSize: 16, color: '#6366f1' }}>{assessment?.name}</span></>}
      maxWidth={580}
    >
      <div className="modal-body">
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
          Enter marks for each student (out of <strong>{assessment?.max_marks || 100}</strong>)
        </p>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {students === null ? (
            <p style={{ color: '#64748b' }}>Loading students...</p>
          ) : (
            <>
              {isOnline && (
                <div style={{ fontSize: 12, color: '#6366f1', background: '#eff6ff', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
                  🌐 Online Assessment — only students who submitted their work can be graded.
                </div>
              )}
              {students.map((s) => {
                const sub = isOnline ? submissions.find((x) => x.student_id === s.user_id && x.assessment_id === assessment.assessment_id) : null;
                const submitted = isOnline ? !!sub : true;
                const locked = existingMarks.find((m) => m.student_id === s.user_id);
                return (
                  <div key={s.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.first_name} {s.last_name || ''}</div>
                      <div style={{ fontSize: isOnline ? 11 : 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                        {isOnline ? (
                          submitted ? (
                            <>
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Submitted</span>
                              <span style={{ color: '#94a3b8' }}>· {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}</span>
                              {sub.file_id && (
                                <button
                                  type="button"
                                  onClick={() => downloadDocument(sub.file_id).catch((e) => showToast('Failed to download: ' + e.message, 'error'))}
                                  title="Download submission"
                                  style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', padding: '2px 7px', borderRadius: 10, fontWeight: 700, marginLeft: 6, border: '1px solid #bbf7d0', cursor: 'pointer' }}
                                >
                                  📎 Download
                                </button>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ Not submitted yet</span>
                          )
                        ) : (
                          s.user_id
                        )}
                        {locked && <span style={{ fontSize: 11, marginLeft: 6, color: '#16a34a', fontWeight: 600 }}>✅ Entered</span>}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={assessment?.max_marks || 100}
                      placeholder={`/ ${assessment?.max_marks || 100}`}
                      value={values[s.user_id] ?? ''}
                      disabled={!!locked || (isOnline && !submitted)}
                      onChange={(e) => setValues((v) => ({ ...v, [s.user_id]: e.target.value }))}
                      style={{
                        width: 90,
                        padding: 8,
                        border: `1px solid ${errors[s.user_id] ? '#ef4444' : submitted ? '#e2e8f0' : '#fecaca'}`,
                        borderRadius: 6,
                        fontSize: 14,
                        textAlign: 'center',
                        background: locked ? '#f0fdf4' : submitted ? '#fff' : '#fef2f2',
                        color: locked ? '#166534' : undefined,
                      }}
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <button className="submit-btn" style={{ flex: 1 }} onClick={submit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Marks'}
        </button>
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function AssessmentCard({ assessment, onEnterMarks }) {
  const a = assessment;
  return (
    <div style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 12, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{a.name}</h4>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{a.type || 'theory'} &nbsp;·&nbsp; {a.date || 'N/A'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', background: a.exam_mode === 'online' ? '#eff6ff' : '#f1f5f9', color: a.exam_mode === 'online' ? '#2563eb' : '#64748b', borderRadius: 4 }}>
            {(a.exam_mode || 'offline').toUpperCase()}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: '#e0e7ff', color: '#4338ca', borderRadius: 6 }}>
            {a.course_code || a.course_id || ''}{a.section ? ' · Sec ' + a.section : ''}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>Max Marks: <strong>{a.max_marks || 100}</strong></div>
        <button onClick={onEnterMarks} style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>
          ✎ Enter Marks
        </button>
      </div>
    </div>
  );
}

export default function AssessmentMapping() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [marksTarget, setMarksTarget] = useState(null);

  const load = () => apiFetch(`/assessments?faculty_id=${user?.user_id}`).then(setAssessments).catch(() => setAssessments([]));
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
        <button className="page-action-btn" onClick={() => setCreateOpen(true)} style={{ background: '#1e293b' }}>+ Create Assessment</button>
      </div>
      <div>
        {assessments === undefined ? null : assessments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No assessments yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Click "+ Create Assessment" to add one</div>
          </div>
        ) : (
          assessments.map((a) => <AssessmentCard key={a.assessment_id} assessment={a} onEnterMarks={() => setMarksTarget(a)} />)
        )}
      </div>
      <CreateAssessmentModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <MarksEntryModal assessment={marksTarget} onClose={() => setMarksTarget(null)} onSaved={load} />
    </>
  );
}
