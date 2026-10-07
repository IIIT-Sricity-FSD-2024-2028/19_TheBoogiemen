/**
 * CourseManagement — ported from legacy fixes.js renderCourseManagement() +
 * addCourseSectionRow()/readCourseSectionRows() + openCreateCourseModal()/
 * submitCreateCourse() + openManageSectionsModal()/submitCourseSections() +
 * openEnrollStudentModal()/populateEnrollSectionOptions()/
 * submitEnrollStudent() (super-user.html's courseModal/sectionsModal/
 * enrollStudentModal).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

/** Repeatable (section name, faculty) rows — shared by Add Course and Manage Sections. */
function SectionRows({ rows, setRows, facultyList }) {
  const update = (i, field, value) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const remove = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const add = () => setRows((rs) => [...rs, { section: '', faculty_id: '' }]);

  return (
    <div>
      {rows.map((row, i) => (
        <div className="form-row" key={i} style={{ alignItems: 'flex-end' }}>
          <div className="form-group">
            <label>Section</label>
            <input type="text" placeholder="e.g., A" value={row.section} onChange={(e) => update(i, 'section', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Faculty</label>
            <select value={row.faculty_id} onChange={(e) => update(i, 'faculty_id', e.target.value)}>
              <option value="">{facultyList === null ? 'Loading…' : '— Select Faculty —'}</option>
              {facultyList?.map((f) => (
                <option key={f.user_id} value={f.user_id}>{`${f.first_name || ''} ${f.last_name || ''}`.trim() || f.username || f.email}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => remove(i)} style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', height: 41 }}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn-cancel" style={{ marginTop: 8 }} onClick={add}>+ Add Section</button>
    </div>
  );
}

/** Returns null (after a toast) if any row has only one of its two fields filled — an empty row left alone is silently skipped. */
function readSectionRows(rows, showToast) {
  const sections = [];
  for (const row of rows) {
    if (!row.section && !row.faculty_id) continue;
    if (!row.section || !row.faculty_id) {
      showToast('Each section needs both a name and a faculty', 'warning');
      return null;
    }
    sections.push(row);
  }
  return sections;
}

function CreateCourseModal({ open, onClose, onCreated }) {
  const { showToast } = useNotifications();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('4');
  const [semester, setSemester] = useState('1');
  const [rows, setRows] = useState([]);
  const [facultyList, setFacultyList] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setCode('');
    setCredits('4');
    setSemester('1');
    setRows([]);
    apiFetch('/admin/users')
      .then((users) => setFacultyList(users.filter((u) => u.role === 'faculty')))
      .catch(() => setFacultyList([]));
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Course name is required', 'warning');
    if (!code.trim()) return showToast('Course code is required', 'warning');
    const sections = readSectionRows(rows, showToast);
    if (sections === null) return;

    setSubmitting(true);
    try {
      await apiFetch('/courses', {
        method: 'POST',
        body: JSON.stringify({ course_name: name.trim(), course_code: code.trim().toUpperCase(), credits: Number(credits) || null, semester: Number(semester) || null, sections }),
      });
      showToast('Course created!', 'success');
      onClose();
      onCreated();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Course">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Course Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Cloud Computing" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Course Code <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., CS501" />
            </div>
            <div className="form-group">
              <label>Credits</label>
              <input type="number" min={1} max={6} value={credits} onChange={(e) => setCredits(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Semester</label>
            <input type="number" min={1} max={8} value={semester} onChange={(e) => setSemester(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Sections <span style={{ fontSize: 11, color: '#64748b' }}>(optional — staff them now or assign faculty later)</span></label>
            <SectionRows rows={rows} setRows={setRows} facultyList={facultyList} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Course'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function ManageSectionsModal({ course, onClose, onSaved }) {
  const { showToast } = useNotifications();
  const [rows, setRows] = useState([]);
  const [facultyList, setFacultyList] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!course) return;
    setRows(course.sections || []);
    apiFetch('/admin/users')
      .then((users) => setFacultyList(users.filter((u) => u.role === 'faculty')))
      .catch(() => setFacultyList([]));
  }, [course]);

  const submit = async (e) => {
    e.preventDefault();
    const sections = readSectionRows(rows, showToast);
    if (sections === null) return;
    setSubmitting(true);
    try {
      await apiFetch(`/courses/${course.course_id}/sections`, { method: 'PUT', body: JSON.stringify({ sections }) });
      showToast('Sections updated!', 'success');
      onClose();
      onSaved();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!course} onClose={onClose} title="Manage Sections">
      <form onSubmit={submit}>
        <div className="modal-body">
          <p style={{ fontWeight: 600, margin: '0 0 12px' }}>{course?.course_name}</p>
          <SectionRows rows={rows} setRows={setRows} facultyList={facultyList} />
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Sections'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function EnrollStudentModal({ open, onClose }) {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [students, setStudents] = useState(null);
  const [courses, setCourses] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [section, setSection] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStudentId('');
    setCourseId('');
    setSection('');
    apiFetch('/admin/users')
      .then((users) => setStudents(users.filter((u) => u.role === 'student')))
      .catch(() => setStudents([]));
    apiFetch('/courses')
      .then(setCourses)
      .catch(() => setCourses([]));
  }, [open]);

  const sectionOptions = courses?.find((c) => c.course_id === courseId)?.sections || [];

  const submit = async () => {
    let valid = true;
    if (!studentId) { showToast('Please select a student', 'warning'); valid = false; }
    if (!courseId) { showToast('Please select a course', 'warning'); valid = false; }
    if (!section) { showToast('Please select a section', 'warning'); valid = false; }
    if (!valid) return;

    setSubmitting(true);
    try {
      await apiFetch('/enrollment', { method: 'POST', body: JSON.stringify({ student_id: studentId, course_id: courseId, section }) });
      const from = user?.first_name || 'Academic Head';
      send(studentId, from, `📖 You have been enrolled in a new course by ${from}. Check your "My Courses" section for details.`, 'info');
      showToast('Student enrolled successfully! Student has been notified. ✅', 'success');
      onClose();
    } catch (e) {
      if (e.message?.toLowerCase().includes('already')) showToast('⚠ Student is already enrolled in this course', 'warning');
      else showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="📖 Enroll Student in Course">
      <div className="modal-body">
        <div className="form-group">
          <label>Select Student <span style={{ color: '#ef4444' }}>*</span></label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">{students === null ? 'Loading…' : '— Select Student —'}</option>
            {students?.map((s) => (
              <option key={s.user_id} value={s.user_id}>{`${s.first_name || s.username || ''} ${s.last_name || ''}`.trim()} ({s.user_id})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Select Course <span style={{ color: '#ef4444' }}>*</span></label>
          <select
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setSection('');
            }}
          >
            <option value="">{courses === null ? 'Loading…' : '— Select Course —'}</option>
            {courses?.map((c) => (
              <option key={c.course_id} value={c.course_id}>{c.course_code} – {c.course_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Select Section <span style={{ color: '#ef4444' }}>*</span></label>
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            {!courseId ? (
              <option value="">— Select a course first —</option>
            ) : sectionOptions.length === 0 ? (
              <option value="">No sections have a faculty assigned yet</option>
            ) : (
              <>
                <option value="">— Select Section —</option>
                {sectionOptions.map((s) => <option key={s.section} value={s.section}>Section {s.section} — {s.faculty_name || s.faculty_id}</option>)}
              </>
            )}
          </select>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={submit} className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
          {submitting ? 'Enrolling…' : 'Enroll Student'}
        </button>
        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

export default function CourseManagement() {
  const [courses, setCourses] = useState(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [sectionsTarget, setSectionsTarget] = useState(null);

  const load = () => apiFetch('/courses').then(setCourses).catch(() => setCourses([]));
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Course Management</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setEnrollOpen(true)}
            style={{ padding: '9px 18px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            📖 Enroll Student
          </button>
          <button className="page-action-btn" onClick={() => setCreateOpen(true)}>+ Add Course</button>
        </div>
      </div>
      <div className="stats-card">
        <div className="stats-card-header"><h3>Courses</h3></div>
        <div className="stats-card-body" style={{ padding: 24 }}>
          {courses === undefined ? (
            'Loading…'
          ) : courses.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center' }}>No courses yet.</p>
          ) : (
            courses.map((c) => {
              const sections = c.sections || [];
              return (
                <div key={c.course_id} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: 15 }}>
                        {c.course_name} <span style={{ color: '#64748b', fontWeight: 500 }}>({c.course_code})</span>
                      </h4>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.credits || '—'} credits &bull; Semester {c.semester || '—'}</div>
                      <div style={{ marginTop: 8 }}>
                        {sections.length === 0 ? (
                          <span style={{ color: '#b45309', fontSize: 12 }}>No sections assigned yet</span>
                        ) : (
                          sections.map((s) => (
                            <span key={s.section} style={{ display: 'inline-block', background: '#eff6ff', color: '#1e40af', padding: '3px 10px', borderRadius: 6, fontSize: 12, margin: '2px 6px 2px 0' }}>
                              Sec {s.section} — {s.faculty_name || s.faculty_id}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSectionsTarget(c)}
                      style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}
                    >
                      Manage Sections
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <CreateCourseModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <ManageSectionsModal course={sectionsTarget} onClose={() => setSectionsTarget(null)} onSaved={load} />
      <EnrollStudentModal open={enrollOpen} onClose={() => setEnrollOpen(false)} />
    </>
  );
}
