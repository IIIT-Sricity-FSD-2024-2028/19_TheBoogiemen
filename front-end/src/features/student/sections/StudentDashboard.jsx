import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckSquare, Download, GraduationCap, TrendingUp } from 'lucide-react';
import CountUp from '../../../shared/ui/CountUp';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchStudentAttendance,
  fetchStudentCourses,
  fetchStudentMarks,
  fetchStudentProfile,
  selectAttendanceMin,
  selectOverallAttendance,
  selectStudentResource,
} from '../studentSlice';
import { useApiResource } from '../../../hooks/useApiResource';
import { downloadFile } from '../../../services/apiClient';
import { apiRequestFailed } from '../../../app/apiActions';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { EmptyState, ErrorState, LoadingState, ProgressBar, ResourceView } from '../../../shared/ui/StatusViews';
import { displayValue, formatDate, formatStudentId } from '../../../shared/format';

function StatCard({ label, icon: Icon, resource, value, decimals = 0, suffix = '', note, onRetry, navy }) {
  let body;
  if (resource.status === 'failed') {
    body = (
      <div className="sp-stat-note" style={{ color: navy ? '#fecaca' : 'var(--sp-danger)' }}>
        Failed to load{resource.error?.status ? ` (HTTP ${resource.error.status})` : ''}.{' '}
        <button type="button" className="sp-link-btn" onClick={onRetry}>Retry</button>
      </div>
    );
  } else if (resource.status !== 'succeeded') {
    body = <div className="sp-skeleton" style={{ height: 30, width: '60%', marginTop: 6, opacity: navy ? 0.3 : 1 }} />;
  } else {
    body = (
      <>
        <div className="sp-stat-value"><CountUp value={value} decimals={decimals} suffix={suffix} /></div>
        {note && <div className="sp-stat-note">{note}</div>}
      </>
    );
  }
  return (
    <div className={`sp-card${navy ? ' is-navy' : ''}`}>
      <div className="sp-tile-icon" aria-hidden="true"><Icon size={19} /></div>
      <div className="sp-stat-label">{label}</div>
      {body}
    </div>
  );
}

export default function StudentDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const onNavigate = (section) => navigate(`/student/${section}`);
  const recentActivity = useSelector((state) => state.ui.recentActivity);
  const [pdf, setPdf] = useState({ busy: false, error: null });

  const downloadReport = async () => {
    setPdf({ busy: true, error: null });
    try {
      await downloadFile('/reports/student-pdf', `progress-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      setPdf({ busy: false, error: null });
    } catch (err) {
      setPdf({ busy: false, error: err.message });
      dispatch(apiRequestFailed({ status: err.status ?? 0, message: err.message, path: '/reports/student-pdf', method: 'GET' }));
    }
  };
  const profile = useSelector(selectStudentResource('profile'));
  const courses = useSelector(selectStudentResource('courses'));
  const attendance = useSelector(selectStudentResource('attendance'));
  const marks = useSelector(selectStudentResource('marks'));
  const overall = useSelector(selectOverallAttendance);
  const attendanceMin = useSelector(selectAttendanceMin); // college setting attendance_min_pct
  const meetings = useApiResource('/meetings');

  useEffect(() => {
    dispatch(fetchStudentProfile());
    dispatch(fetchStudentCourses());
    dispatch(fetchStudentAttendance());
    dispatch(fetchStudentMarks());
  }, [dispatch]);

  const courseList = useMemo(() => (Array.isArray(courses.data) ? courses.data : []), [courses.data]);

  const averageSyllabus = useMemo(() => {
    const values = courseList.map((c) => c.syllabus_progress).filter((v) => typeof v === 'number');
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }, [courseList]);

  const shortageCourses = (attendance.data?.summary || []).filter(
    (row) => attendanceMin !== null && row.total > 0 && typeof row.percentage === 'number' && row.percentage < attendanceMin
  );

  const firstName = profile.data?.first_name;

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">{firstName ? `Welcome back, ${firstName}` : 'Dashboard'}</h1>
          <p className="sp-page-subtitle">
            {profile.status === 'succeeded'
              ? [profile.data.roll_no || formatStudentId(profile.data.user_id), profile.data.programme, profile.data.department_code || profile.data.branch, profile.data.batch && `Batch ${profile.data.batch}`, profile.data.section && `Section ${profile.data.section}`].filter(Boolean).join(' · ')
              : 'Your academic overview'}
          </p>
        </div>
        <button type="button" className="sp-btn is-secondary" onClick={downloadReport} disabled={pdf.busy}>
          <Download size={15} /> {pdf.busy ? 'Preparing PDF...' : 'Progress report (PDF)'}
        </button>
      </div>
      <div className="sp-bento">
        <section className="sp-card sp-tile-2x2" aria-labelledby="dash-att-chart">
          <div className="sp-card-head">
            <h2 id="dash-att-chart" className="sp-section-title">Attendance by course</h2>
            <button type="button" className="sp-link-btn" onClick={() => onNavigate('attendance')}>Details</button>
          </div>
          {attendance.status === 'succeeded' && (attendance.data?.summary || []).some((r) => r.total > 0) ? (
            <SimpleBarChart
              title="Attendance by course"
              valueLabel="Attendance"
              valueSuffix="%"
              maxValue={100}
              height={260}
              reference={attendanceMin !== null ? { value: attendanceMin, label: `${attendanceMin}% required` } : undefined}
              data={attendance.data.summary
                .filter((r) => r.total > 0)
                .map((r) => ({
                  label: r.course_code,
                  fullLabel: `${r.course_code} ${r.course_name}`,
                  value: r.percentage,
                  note: `${(r.present || 0) + (r.excused || 0)} of ${r.total} classes`,
                }))}
            />
          ) : attendance.status === 'failed' ? (
            <ErrorState error={attendance.error} onRetry={() => dispatch(fetchStudentAttendance({ force: true }))} />
          ) : attendance.status === 'succeeded' ? (
            <EmptyState title="No classes recorded yet" message="Your attendance chart appears once faculty mark classes." />
          ) : (
            <div className="sp-skeleton" style={{ height: 240, marginTop: 12 }} />
          )}
        </section>
        <StatCard
          navy
          icon={GraduationCap}
          label="CGPA"
          resource={profile}
          value={typeof profile.data?.cgpa === 'number' ? profile.data.cgpa : displayValue(profile.data?.cgpa)}
          decimals={1}
          note="Cumulative grade point average"
          onRetry={() => dispatch(fetchStudentProfile({ force: true }))}
        />
        <StatCard
          icon={CheckSquare}
          label="Overall attendance"
          resource={attendance}
          value={overall ? overall.percentage : 'No records'}
          suffix={overall ? '%' : ''}
          note={overall ? `${overall.attended} of ${overall.total} classes (incl. excused)` : 'No classes recorded yet'}
          onRetry={() => dispatch(fetchStudentAttendance({ force: true }))}
        />
        <StatCard
          icon={BookOpen}
          label="Enrolled courses"
          resource={courses}
          value={courseList.length}
          note={courseList.length ? `${courseList.reduce((s, c) => s + (c.credits || 0), 0)} credits in total` : 'No active enrollments'}
          onRetry={() => dispatch(fetchStudentCourses({ force: true }))}
        />
        <StatCard
          icon={TrendingUp}
          label="Syllabus covered"
          resource={courses}
          value={averageSyllabus === null ? 'Not available' : averageSyllabus}
          suffix={averageSyllabus === null ? '' : '%'}
          note="Average across your courses"
          onRetry={() => dispatch(fetchStudentCourses({ force: true }))}
        />
        <section className="sp-card sp-tile-2" aria-labelledby="dash-courses">
          <div className="sp-card-head">
            <h2 id="dash-courses" className="sp-section-title">Course progress</h2>
            <button type="button" className="sp-link-btn" onClick={() => onNavigate('courses')}>All courses</button>
          </div>
          <ResourceView
            resource={courses}
            onRetry={() => dispatch(fetchStudentCourses({ force: true }))}
            isEmpty={(data) => !data?.length}
            empty={<EmptyState title="No enrolled courses" message="You are not enrolled in any course yet." />}
          >
            {(data) =>
              data.map((course) => (
                <div key={course.enrollment_id || course.course_id} style={{ marginBottom: 12 }}>
                  <div className="sp-progress-row">
                    <span>
                      <span className="sp-code">{course.course_code}</span> {course.course_name}
                    </span>
                    <span className="sp-muted">
                      Attendance {displayValue(course.attendance_pct, '-')}{typeof course.attendance_pct === 'number' ? '%' : ''}
                    </span>
                  </div>
                  <ProgressBar value={course.syllabus_progress} label={`${course.course_name} syllabus progress`} />
                  <div className="sp-stat-note">
                    Syllabus {typeof course.syllabus_progress === 'number' ? `${course.syllabus_progress}% covered` : 'progress not available'}
                  </div>
                </div>
              ))
            }
          </ResourceView>
        </section>

        <section className="sp-card sp-tile-2" aria-labelledby="dash-marks">
          <h2 id="dash-marks" className="sp-section-title">Recent assessment results</h2>
          <ResourceView
            resource={marks}
            onRetry={() => dispatch(fetchStudentMarks({ force: true }))}
            isEmpty={(data) => !data?.length}
            empty={<EmptyState title="No marks published" message="Marks appear here once faculty grade an assessment." />}
          >
            {(data) => (
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th scope="col">Assessment</th>
                      <th scope="col" className="sp-num">Marks</th>
                      <th scope="col">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((m) => (
                      <tr key={m.entry_id}>
                        <td>
                          {displayValue(m.assessment_name)}
                          <div className="sp-card-meta"><span className="sp-code">{m.course_code}</span> {m.course_name}</div>
                        </td>
                        <td className="sp-num">{m.marks_obtained} / {m.max_marks}</td>
                        <td>{displayValue(m.grade, '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ResourceView>
        </section>
        <section className="sp-card sp-tile-2" aria-labelledby="dash-meetings">
        <h2 id="dash-meetings" className="sp-section-title">Upcoming meetings</h2>
        {meetings.status === 'loading' && <LoadingState />}
        {meetings.status === 'failed' && <ErrorState error={meetings.error} onRetry={meetings.reload} />}
        {meetings.status === 'succeeded' &&
          (Array.isArray(meetings.data) && meetings.data.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {meetings.data.map((m) => (
                <li key={m.meeting_id}>
                  {formatDate(m.date)} {m.time ? `at ${m.time}` : ''} — {displayValue(m.agenda, 'Meeting')}
                  {m.mode ? ` (${m.mode})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No meetings scheduled" message="Meetings your faculty schedule with you will be listed here." />
          ))}
        </section>

        <section className="sp-card sp-tile-2" aria-labelledby="dash-activity">
          <h2 id="dash-activity" className="sp-section-title">Your recent activity</h2>
          {recentActivity.length === 0 ? (
            <p className="sp-muted" style={{ margin: 0 }}>Actions you take this session (leave applied, replies posted and so on) appear here.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {recentActivity.slice(0, 5).map((a) => (
                <li key={a.at + a.label}>{a.label} <span className="sp-muted">· {new Date(a.at).toLocaleTimeString()}</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {pdf.error && <div className="sp-alert is-error" role="alert" style={{ marginTop: 16 }}>Could not download the report: {pdf.error}</div>}

      {shortageCourses.length > 0 && (
        <div className="sp-alert is-warning" role="status" style={{ marginTop: 16 }}>
          <span>
            Attendance below {attendanceMin}% in {shortageCourses.map((c) => c.course_code).join(', ')}.
          </span>
          <button type="button" className="sp-link-btn" onClick={() => onNavigate('attendance')}>View attendance</button>
        </div>
      )}

    </>
  );
}
