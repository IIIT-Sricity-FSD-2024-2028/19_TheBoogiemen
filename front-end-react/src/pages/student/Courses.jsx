/**
 * Courses — ported from legacy fixes.js renderStudentCourses() +
 * populateEnrollmentDropdown() + submitCourseEnrollment() (student.html's
 * enrollCourseModal).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

function CourseRow({ course }) {
  const active = (course.enrollment_status || 'active') === 'active';
  return (
    <div style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{course.course_code}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{course.course_name}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          {course.credits} Credits · Sem {course.semester} · {course.faculty_name || 'Faculty'}
        </div>
      </div>
      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: active ? '#dcfce7' : '#fef9c3', color: active ? '#166534' : '#713f12' }}>
        {course.enrollment_status || 'active'}
      </span>
    </div>
  );
}

function EnrollCourseModal({ open, onClose, onEnrolled }) {
  const { showToast } = useNotifications();
  const [options, setOptions] = useState(null); // null = loading
  const [courseId, setCourseId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOptions(null);
    setCourseId('');
    Promise.all([apiFetch('/courses'), apiFetch('/students/me/courses')])
      .then(([all, enrolled]) => {
        const enrolledIds = enrolled.map((c) => c.course_id);
        setOptions(all.filter((c) => !enrolledIds.includes(c.course_id)));
      })
      .catch(() => setOptions([]));
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!courseId) return showToast('Please select a course', 'warning');
    setSubmitting(true);
    try {
      await apiFetch('/students/enroll', { method: 'POST', body: JSON.stringify({ course_id: courseId }) });
      showToast('Enrolled successfully!', 'success');
      onClose();
      onEnrolled();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Enroll in a New Course">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Select Course</label>
            <select required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">{options === null ? 'Loading courses...' : options.length === 0 ? 'All courses enrolled' : 'Select a course'}</option>
              {options?.map((c) => (
                <option key={c.course_id} value={c.course_id}>{c.course_code} – {c.course_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Enrolling…' : 'Enroll'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Courses() {
  const [courses, setCourses] = useState(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const { showToast } = useNotifications();

  const load = () => apiFetch('/students/me/courses').then(setCourses).catch((e) => showToast('Failed to load courses: ' + e.message, 'error'));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h3>Enrolled Courses</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ padding: '6px 14px', background: '#f0fdf4', color: '#15803d', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid #bbf7d0' }}>
            ✓ Faculty-assigned courses
          </span>
          <button className="page-action-btn" onClick={() => setModalOpen(true)}>+ Enroll in Course</button>
        </div>
      </div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
          {courses === undefined ? null : courses.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No courses enrolled. Click &quot;+ Enroll in Course&quot; to get started.</p>
          ) : (
            courses.map((c) => <CourseRow key={c.course_id} course={c} />)
          )}
        </div>
      </div>
      <EnrollCourseModal open={modalOpen} onClose={() => setModalOpen(false)} onEnrolled={load} />
    </div>
  );
}
