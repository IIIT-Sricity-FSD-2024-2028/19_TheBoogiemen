import React, { useMemo, useState } from 'react';
import { Plus, UserCog, Users } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import Modal, { ConfirmDialog } from '../../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { displayValue, fullName } from '../../../shared/format';
import { attendanceBadge } from '../components/common';
import { useCollegeRules } from '../components/ReportTables';
import '../hod.css';

const TEACHER_ROLES = ['faculty', 'head'];

/** Active faculty (and HODs) who may teach sections of a department. */
function useTeachers(departmentId) {
  const res = useApiResource('/college/people?status=active');
  const list = Array.isArray(res.data) ? res.data.filter((p) => TEACHER_ROLES.includes(p.role) && (!departmentId || p.department_id === departmentId)) : [];
  return { ...res, list };
}

function CourseModal({ onClose, onDone }) {
  const [form, setForm] = useState({ course_code: '', course_name: '', credits: '3', semester: '1' });
  const [errors, setErrors] = useState({});
  const [save, { loading, error }] = useMutation();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const code = form.course_code.trim().toUpperCase();
    const errs = {};
    if (!/^[A-Z0-9-]{3,12}$/.test(code)) errs.course_code = 'Use 3-12 letters, digits or dashes.';
    if (!form.course_name.trim()) errs.course_name = 'Course name is required.';
    const credits = Number(form.credits);
    if (!Number.isInteger(credits) || credits < 1 || credits > 10) errs.credits = 'Whole number from 1 to 10.';
    const semester = Number(form.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 12) errs.semester = 'Semester must be 1 to 12.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await save('post', '/academics/courses', { course_code: code, course_name: form.course_name.trim(), credits, semester }, { label: `Created course ${code}` });
    if (res.ok) onDone();
  };

  return (
    <Modal
      title="New course"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="hd-course-form" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : 'Create course'}</button>
        </>
      }
    >
      <form id="hd-course-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="hd-cc">Course code</label>
            <input id="hd-cc" className="sp-input" value={form.course_code} onChange={set('course_code')} aria-invalid={!!errors.course_code} placeholder="CS305" />
            {errors.course_code && <p className="sp-field-error">{errors.course_code}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="hd-cr">Credits</label>
            <input id="hd-cr" type="number" min="1" max="10" className="sp-input" value={form.credits} onChange={set('credits')} aria-invalid={!!errors.credits} />
            {errors.credits && <p className="sp-field-error">{errors.credits}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="hd-sem">Semester</label>
            <input id="hd-sem" type="number" min="1" max="12" className="sp-input" value={form.semester} onChange={set('semester')} aria-invalid={!!errors.semester} />
            {errors.semester && <p className="sp-field-error">{errors.semester}</p>}
          </div>
        </div>
        <div className="sp-field">
          <label htmlFor="hd-cn">Course name</label>
          <input id="hd-cn" className="sp-input" value={form.course_name} onChange={set('course_name')} aria-invalid={!!errors.course_name} maxLength={120} />
          {errors.course_name && <p className="sp-field-error">{errors.course_name}</p>}
        </div>
      </form>
    </Modal>
  );
}

function SectionModal({ courses, presetCourseId, onClose, onDone }) {
  const rules = useCollegeRules();
  const [form, setForm] = useState({ course_id: presetCourseId || '', section: '', faculty_id: '' });
  const [errors, setErrors] = useState({});
  const [save, { loading, error }] = useMutation();
  const course = courses.find((c) => c.course_id === form.course_id);
  const teachers = useTeachers(course?.department_id);
  const taken = new Set((course?.sections || []).map((s) => s.section));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.course_id) errs.course_id = 'Choose a course.';
    if (!form.section) errs.section = 'Choose a section.';
    if (!form.faculty_id) errs.faculty_id = 'Choose a teacher.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await save('post', '/academics/sections', form, { label: `Created section ${course?.course_code} ${form.section}` });
    if (res.ok) onDone();
  };

  return (
    <Modal
      title="New course section"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="hd-section-form" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : 'Create section'}</button>
        </>
      }
    >
      <form id="hd-section-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-field">
          <label htmlFor="hd-sc">Course</label>
          <select id="hd-sc" className="sp-select" value={form.course_id} onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value, faculty_id: '' }))} aria-invalid={!!errors.course_id}>
            <option value="">Choose a course</option>
            {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code} {c.course_name}</option>)}
          </select>
          {errors.course_id && <p className="sp-field-error">{errors.course_id}</p>}
        </div>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="hd-ss">Section</label>
            <select id="hd-ss" className="sp-select" value={form.section} onChange={set('section')} aria-invalid={!!errors.section} disabled={rules.status === 'loading'}>
              <option value="">{rules.status === 'loading' ? 'Loading...' : 'Choose'}</option>
              {rules.sections.map((s) => <option key={s} value={s} disabled={taken.has(s)}>{s}{taken.has(s) ? ' (exists)' : ''}</option>)}
            </select>
            {rules.status === 'failed' && <p className="sp-field-error">Could not load the college's sections.</p>}
            {errors.section && <p className="sp-field-error">{errors.section}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="hd-sf">Teacher</label>
            <select id="hd-sf" className="sp-select" value={form.faculty_id} onChange={set('faculty_id')} aria-invalid={!!errors.faculty_id} disabled={!course || teachers.status === 'loading'}>
              <option value="">{!course ? 'Choose a course first' : teachers.status === 'loading' ? 'Loading...' : 'Choose a teacher'}</option>
              {teachers.list.map((t) => <option key={t.user_id} value={t.user_id}>{fullName(t)}{t.designation ? ` (${t.designation})` : ''}</option>)}
            </select>
            {teachers.status === 'failed' && <p className="sp-field-error">Could not load faculty. <button type="button" className="sp-link-btn" onClick={teachers.reload}>Retry</button></p>}
            {errors.faculty_id && <p className="sp-field-error">{errors.faculty_id}</p>}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AssignModal({ section, onClose, onDone }) {
  const teachers = useTeachers(section.department_id);
  const [facultyId, setFacultyId] = useState(section.faculty_id || '');
  const [err, setErr] = useState('');
  const [save, { loading, error }] = useMutation();

  const submit = async (e) => {
    e.preventDefault();
    if (!facultyId) return setErr('Choose a teacher.');
    setErr('');
    const t = teachers.list.find((x) => x.user_id === facultyId);
    const res = await save('patch', `/academics/sections/${section.course_section_id}`, { faculty_id: facultyId }, { label: `Assigned ${fullName(t) || 'teacher'} to ${section.course_code} ${section.section}` });
    if (res.ok) onDone();
    return undefined;
  };

  return (
    <Modal
      title={`Assign teacher: ${section.course_code} section ${section.section}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="hd-assign-form" className="sp-btn" disabled={loading || teachers.status !== 'succeeded'}>{loading ? 'Saving...' : 'Assign'}</button>
        </>
      }
    >
      <form id="hd-assign-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        {teachers.status === 'loading' && <LoadingState label="Loading faculty" lines={2} />}
        {teachers.status === 'failed' && <ErrorState error={teachers.error} onRetry={teachers.reload} />}
        {teachers.status === 'succeeded' && (
          <div className="sp-field">
            <label htmlFor="hd-at">Teacher</label>
            <select id="hd-at" className="sp-select" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} aria-invalid={!!err}>
              <option value="">Choose a teacher</option>
              {teachers.list.map((t) => <option key={t.user_id} value={t.user_id}>{fullName(t)}{t.designation ? ` (${t.designation})` : ''}</option>)}
            </select>
            {err && <p className="sp-field-error">{err}</p>}
            <p className="sp-hint">The timetable slots of this section move to the new teacher too.</p>
          </div>
        )}
      </form>
    </Modal>
  );
}

function RosterModal({ section, onClose, onChanged }) {
  const roster = useApiResource(`/academics/sections/${section.course_section_id}/students`);
  const students = useApiResource('/college/people?role=student&status=active');
  const rules = useCollegeRules();
  const [picked, setPicked] = useState([]);
  const [filter, setFilter] = useState('');
  const [result, setResult] = useState(null);
  const [pickErr, setPickErr] = useState('');
  const [removing, setRemoving] = useState(null);
  const [enroll, enrollState] = useMutation();
  const [unenroll, unenrollState] = useMutation();

  const enrolledIds = useMemo(() => new Set((Array.isArray(roster.data) ? roster.data : []).map((r) => r.student_id)), [roster.data]);
  const candidates = useMemo(() => {
    const list = Array.isArray(students.data) ? students.data : [];
    const f = filter.trim().toLowerCase();
    return list
      .filter((s) => s.department_id === section.department_id && !enrolledIds.has(s.user_id))
      .filter((s) => !f || `${fullName(s)} ${s.display_id || ''} ${s.section || ''}`.toLowerCase().includes(f));
  }, [students.data, enrolledIds, filter, section.department_id]);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const doEnroll = async () => {
    if (!picked.length) return setPickErr('Choose at least one student.');
    setPickErr('');
    const res = await enroll('post', `/academics/sections/${section.course_section_id}/enroll`, { student_ids: picked }, { label: `Enrolled students in ${section.course_code} ${section.section}` });
    if (res.ok) {
      setResult(res.data);
      setPicked([]);
      roster.reload();
      onChanged();
    }
    return undefined;
  };

  const doRemove = async () => {
    const res = await unenroll('delete', `/academics/enrollments/${removing.enrollment_id}`, undefined, { label: `Removed ${removing.name} from ${section.course_code} ${section.section}` });
    if (res.ok) {
      setRemoving(null);
      roster.reload();
      onChanged();
    }
  };

  return (
    <Modal title={`Students: ${section.course_code} section ${section.section}`} onClose={onClose} width={760}>
      <h3 className="sp-section-title">Enrolled</h3>
      {roster.status === 'loading' && <LoadingState label="Loading roster" />}
      {roster.status === 'failed' && <ErrorState error={roster.error} onRetry={roster.reload} />}
      {roster.status === 'succeeded' && (!roster.data.length ? (
        <EmptyState title="No students enrolled" message="Add students from the list below." />
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead><tr><th scope="col">Roll no</th><th scope="col">Name</th><th scope="col" className="sp-num">Attendance</th><th scope="col" className="sp-num">CGPA</th><th scope="col"><span className="sp-visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {roster.data.map((r) => (
                <tr key={r.enrollment_id}>
                  <td><span className="sp-code">{displayValue(r.roll_no, '-')}</span></td>
                  <td>{r.name}<div className="sp-card-meta">{r.email}</div></td>
                  <td className="sp-num">{attendanceBadge(r.attendance?.total ? r.attendance.percentage : null, rules.min ?? 0)}</td>
                  <td className="sp-num">{displayValue(r.cgpa, '-')}</td>
                  <td className="sp-num"><button type="button" className="sp-btn is-secondary is-small" onClick={() => setRemoving(r)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <h3 className="sp-section-title" style={{ marginTop: 20 }}>Add students</h3>
      {enrollState.error && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 10 }}>{enrollState.error.message}</div>}
      {result && (
        <div className="sp-alert is-success" role="status" style={{ marginBottom: 10 }}>
          Added {result.added} student(s).{result.skipped ? ` Skipped ${result.skipped} (already taking this course or inactive).` : ''}
        </div>
      )}
      {students.status === 'loading' && <LoadingState label="Loading students" lines={2} />}
      {students.status === 'failed' && <ErrorState error={students.error} onRetry={students.reload} />}
      {students.status === 'succeeded' && (
        <div className="sp-form">
          <input type="search" className="sp-input" placeholder="Filter by name, ID or section" aria-label="Filter students" value={filter} onChange={(e) => setFilter(e.target.value)} />
          {candidates.length === 0 ? (
            <p className="sp-muted" style={{ margin: 0 }}>No other active students in this department{filter ? ' match the filter' : ''}.</p>
          ) : (
            <div className="hd-pick-list" role="group" aria-label="Students to enroll">
              {candidates.map((s) => (
                <label key={s.user_id}>
                  <input type="checkbox" checked={picked.includes(s.user_id)} onChange={() => toggle(s.user_id)} />
                  {fullName(s)} <span className="sp-muted">· {displayValue(s.display_id, '')} · Section {displayValue(s.section, '-')}</span>
                </label>
              ))}
            </div>
          )}
          {pickErr && <p className="sp-field-error">{pickErr}</p>}
          <div className="sp-btn-row">
            <button type="button" className="sp-btn" onClick={doEnroll} disabled={enrollState.loading}>{enrollState.loading ? 'Enrolling...' : `Enroll ${picked.length || ''} selected`}</button>
            {picked.length > 0 && <button type="button" className="sp-btn is-secondary" onClick={() => setPicked([])}>Clear</button>}
          </div>
        </div>
      )}

      {removing && (
        <ConfirmDialog
          title="Remove from section"
          message={`Remove ${removing.name} from ${section.course_code} section ${section.section}? Attendance and marks already recorded are kept.${unenrollState.error ? ` Error: ${unenrollState.error.message}` : ''}`}
          confirmLabel="Remove"
          danger
          busy={unenrollState.loading}
          onConfirm={doRemove}
          onCancel={() => { setRemoving(null); unenrollState.reset(); }}
        />
      )}
    </Modal>
  );
}

export default function HodCourses() {
  const courses = useApiResource('/academics/courses');
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);
  const done = () => { setModal(null); courses.reload(); };
  const list = Array.isArray(courses.data) ? courses.data : [];

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Courses &amp; sections</h1>
          <p className="sp-page-subtitle">Create courses, open sections, assign teachers and manage enrollment.</p>
        </div>
        <div className="sp-btn-row">
          <button type="button" className="sp-btn is-secondary" onClick={() => setModal({ type: 'section' })} disabled={!list.length}><Plus size={15} /> New section</button>
          <button type="button" className="sp-btn" onClick={() => setModal({ type: 'course' })}><Plus size={15} /> New course</button>
        </div>
      </div>

      {courses.status === 'loading' && <div className="sp-card"><LoadingState label="Loading courses" lines={5} /></div>}
      {courses.status === 'failed' && <div className="sp-card"><ErrorState error={courses.error} onRetry={courses.reload} /></div>}
      {courses.status === 'succeeded' && list.length === 0 && (
        <div className="sp-card"><EmptyState title="No courses yet" message="Create the first course for your department."><button type="button" className="sp-btn" onClick={() => setModal({ type: 'course' })}>New course</button></EmptyState></div>
      )}
      {courses.status === 'succeeded' && list.map((c) => (
        <section key={c.course_id} className="sp-card hd-course" aria-labelledby={`crs-${c.course_id}`}>
          <div className="hd-course-head">
            <div>
              <h2 id={`crs-${c.course_id}`} className="sp-card-title"><span className="sp-code">{c.course_code}</span> {c.course_name}</h2>
              <div className="sp-card-meta">{c.credits} credits · Semester {c.semester} · {c.sections.length} section(s)</div>
            </div>
            <button type="button" className="sp-btn is-secondary is-small" onClick={() => setModal({ type: 'section', courseId: c.course_id })}><Plus size={13} /> Add section</button>
          </div>
          {c.sections.length === 0 ? (
            <p className="sp-muted" style={{ margin: 0 }}>No sections yet.</p>
          ) : c.sections.map((s) => (
            <div key={s.course_section_id} className="hd-section-row">
              <div className="hd-section-meta">
                <span className="sp-badge is-info">Section {s.section}</span>
                <span>Teacher: <strong>{displayValue(s.faculty_name, 'Unassigned')}</strong></span>
                <span>{s.student_count} student(s)</span>
                <span>Syllabus {typeof s.syllabus_progress === 'number' ? `${s.syllabus_progress}%` : 'not tracked'}</span>
                {s.term && <span className="sp-muted">{s.term}</span>}
              </div>
              <div className="sp-btn-row">
                <button type="button" className="sp-btn is-secondary is-small" onClick={() => setModal({ type: 'assign', section: s })}><UserCog size={13} /> Teacher</button>
                <button type="button" className="sp-btn is-secondary is-small" onClick={() => setModal({ type: 'roster', section: s })}><Users size={13} /> Students</button>
              </div>
            </div>
          ))}
        </section>
      ))}

      {modal?.type === 'course' && <CourseModal onClose={close} onDone={done} />}
      {modal?.type === 'section' && <SectionModal courses={list} presetCourseId={modal.courseId} onClose={close} onDone={done} />}
      {modal?.type === 'assign' && <AssignModal section={modal.section} onClose={close} onDone={done} />}
      {modal?.type === 'roster' && <RosterModal section={modal.section} onClose={close} onChanged={courses.reload} />}
    </>
  );
}
