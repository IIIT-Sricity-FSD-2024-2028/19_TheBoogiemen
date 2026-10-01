import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { attendanceToneFor, fetchStudentAttendance, fetchStudentCourses, selectAttendanceMin, selectStudentResource } from '../studentSlice';
import { ResourceView, EmptyState, ProgressBar } from '../../../shared/ui/StatusViews';
import { capitalize, displayValue } from '../../../shared/format';

/**
 * Enrolled courses from GET /api/students/me/courses. The backend joins
 * Student -> Enrollment -> Course Section -> Course and attaches the
 * attendance summary for that same enrollment, so nothing is matched by
 * course name here.
 */
function CourseCard({ course, expanded, onToggle, attendanceMin }) {
  const summary = course.attendance_summary;
  const tone = attendanceToneFor(summary?.percentage, attendanceMin);
  const hasModules = Array.isArray(course.modules) && course.modules.length > 0;

  return (
    <article className="sp-card">
      <div className="sp-card-head">
        <div>
          <span className="sp-code">{course.course_code}</span>
          <h2 className="sp-card-title">{course.course_name}</h2>
          <div className="sp-card-meta">
            {displayValue(course.faculty_name, 'Faculty not assigned')} · Semester {displayValue(course.semester)} · Section {displayValue(course.section)} · {displayValue(course.credits, '-')} credits
          </div>
        </div>
        <span className={`sp-badge ${course.enrollment_status === 'active' ? 'is-success' : 'is-neutral'}`}>
          {capitalize(course.enrollment_status) || 'Unknown'}
        </span>
      </div>

      <div className="sp-progress-row">
        <span>Attendance</span>
        <span>
          {summary && summary.total > 0
            ? `${summary.percentage}% (${summary.present + summary.excused} of ${summary.total})`
            : 'No classes recorded'}
        </span>
      </div>
      <ProgressBar value={summary?.percentage} tone={tone} label={`${course.course_name} attendance`} />

      <div className="sp-progress-row">
        <span>Syllabus covered</span>
        <span>{typeof course.syllabus_progress === 'number' ? `${course.syllabus_progress}%` : 'Not available'}</span>
      </div>
      <ProgressBar value={course.syllabus_progress} label={`${course.course_name} syllabus progress`} />

      {hasModules && (
        <>
          <button type="button" className="sp-link-btn" style={{ marginTop: 12 }} aria-expanded={expanded} onClick={onToggle}>
            {expanded ? 'Hide modules' : `Show ${course.modules.length} modules`}
          </button>
          {expanded && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
              {course.modules.map((m) => (
                <li key={m.name} style={{ marginBottom: 6 }}>
                  <div className="sp-progress-row" style={{ margin: '0 0 2px' }}>
                    <span>{m.name}</span>
                    <span>{m.progress}%</span>
                  </div>
                  <ProgressBar value={m.progress} label={m.name} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}

export default function StudentCourses() {
  const dispatch = useDispatch();
  const courses = useSelector(selectStudentResource('courses'));
  const attendanceMin = useSelector(selectAttendanceMin);
  const [semester, setSemester] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    dispatch(fetchStudentCourses());
    dispatch(fetchStudentAttendance()); // carries the college's attendance_min_pct
  }, [dispatch]);

  const semesters = useMemo(() => {
    const list = Array.isArray(courses.data) ? courses.data : [];
    return [...new Set(list.map((c) => c.semester).filter((s) => s !== undefined && s !== null))].sort((a, b) => a - b);
  }, [courses.data]);

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">My Courses</h1>
          <p className="sp-page-subtitle">Courses your department has enrolled you in, with attendance and syllabus progress.</p>
        </div>
        <div className="sp-btn-row" style={{ alignItems: 'flex-end' }}>
        {semesters.length > 1 && (
          <div className="sp-field" style={{ minWidth: 180 }}>
            <label htmlFor="course-semester">Semester</label>
            <select id="course-semester" className="sp-select" value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="all">All semesters</option>
              {semesters.map((s) => (
                <option key={s} value={String(s)}>Semester {s}</option>
              ))}
            </select>
          </div>
        )}
        </div>
      </div>


      <ResourceView
        resource={courses}
        onRetry={() => dispatch(fetchStudentCourses({ force: true }))}
        isEmpty={(data) => !data?.length}
        empty={
          <div className="sp-card">
            <EmptyState title="No enrolled courses" message="Your department enrolls you in courses. They will appear here once you are enrolled." />
          </div>
        }
      >
        {(data) => {
          const visible = semester === 'all' ? data : data.filter((c) => String(c.semester) === semester);
          return (
            <div className="sp-grid sp-grid-2">
              {visible.map((course) => (
                <CourseCard
                  key={course.enrollment_id}
                  course={course}
                  attendanceMin={attendanceMin}
                  expanded={expandedId === course.enrollment_id}
                  onToggle={() => setExpandedId((id) => (id === course.enrollment_id ? null : course.enrollment_id))}
                />
              ))}
            </div>
          );
        }}
      </ResourceView>
    </>
  );
}
