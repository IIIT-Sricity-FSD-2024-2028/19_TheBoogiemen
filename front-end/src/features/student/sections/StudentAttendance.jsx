import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AttendanceRequests from './AttendanceRequests';
import { attendanceToneFor, fetchStudentAttendance, fetchStudentCourses, selectAttendanceMin, selectOverallAttendance, selectStudentResource } from '../studentSlice';
import { ResourceView, EmptyState, ProgressBar } from '../../../shared/ui/StatusViews';
import DataTable from '../../../shared/ui/DataTable';
import { capitalize, formatDate } from '../../../shared/format';

const STATUS_TONE = { present: 'is-success', absent: 'is-danger', excused: 'is-info' };

/**
 * Attendance from GET /api/students/me/attendance. Both the per-course summary
 * and the individual records carry `enrollment_id`, which is what links a
 * record to its course section (the same id My Courses uses).
 */
export default function StudentAttendance() {
  const dispatch = useDispatch();
  const attendance = useSelector(selectStudentResource('attendance'));
  const overall = useSelector(selectOverallAttendance);
  const attendanceMin = useSelector(selectAttendanceMin);
  const courses = useSelector(selectStudentResource('courses'));
  const [enrollmentFilter, setEnrollmentFilter] = useState('all');

  useEffect(() => {
    dispatch(fetchStudentAttendance());
    dispatch(fetchStudentCourses());
  }, [dispatch]);

  const records = useMemo(() => {
    const all = Array.isArray(attendance.data?.records) ? attendance.data.records : [];
    const filtered = enrollmentFilter === 'all' ? all : all.filter((r) => r.enrollment_id === enrollmentFilter);
    return [...filtered].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [attendance.data, enrollmentFilter]);

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Attendance</h1>
          <p className="sp-page-subtitle">
            {attendanceMin !== null ? `Minimum required attendance is ${attendanceMin}%. ` : ''}Approved leave is counted as excused.
          </p>
        </div>
        {overall && (
          <div className="sp-card" style={{ padding: '10px 16px', textAlign: 'right' }}>
            <div className="sp-stat-label">Overall</div>
            <div className="sp-stat-value" style={{ fontSize: 22 }}>{overall.percentage}%</div>
          </div>
        )}
      </div>

      <ResourceView
        resource={attendance}
        onRetry={() => dispatch(fetchStudentAttendance({ force: true }))}
        isEmpty={(data) => !data?.summary?.length}
        empty={
          <div className="sp-card">
            <EmptyState title="No attendance yet" message="Attendance appears once your faculty start marking classes." />
          </div>
        }
      >
        {(data) => (
          <>
            <section className="sp-card" aria-labelledby="att-summary">
              <h2 id="att-summary" className="sp-section-title">Course-wise summary</h2>
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th scope="col">Course</th>
                      <th scope="col">Section</th>
                      <th scope="col" className="sp-num">Present</th>
                      <th scope="col" className="sp-num">Absent</th>
                      <th scope="col" className="sp-num">Excused</th>
                      <th scope="col" className="sp-num">Total</th>
                      <th scope="col" style={{ minWidth: 160 }}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summary.map((row) => {
                      const tone = attendanceToneFor(row.percentage, attendanceMin);
                      return (
                        <tr key={row.enrollment_id}>
                          <td>
                            <span className="sp-code">{row.course_code}</span>
                            <div>{row.course_name}</div>
                          </td>
                          <td>{row.section} · Sem {row.semester}</td>
                          <td className="sp-num">{row.present}</td>
                          <td className="sp-num">{row.absent}</td>
                          <td className="sp-num">{row.excused}</td>
                          <td className="sp-num">{row.total}</td>
                          <td>
                            {row.total > 0 ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                  <strong>{row.percentage}%</strong>
                                  {attendanceMin !== null && row.percentage < attendanceMin && <span className="sp-badge is-danger">Shortage</span>}
                                </div>
                                <ProgressBar value={row.percentage} tone={tone} label={`${row.course_name} attendance`} />
                              </>
                            ) : (
                              <span className="sp-muted">No classes yet</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {courses.status === 'succeeded' && (
              <AttendanceRequests courses={Array.isArray(courses.data) ? courses.data : []} records={Array.isArray(data.records) ? data.records : []} />
            )}

            <section className="sp-card sp-section" aria-labelledby="att-records">
              <h2 id="att-records" className="sp-section-title">Class records</h2>
              <DataTable
                rows={records}
                rowKey={(r) => r.log_id}
                csvName="attendance-records"
                searchPlaceholder="Search date, course or status"
                emptyTitle="No class records"
                emptyMessage="No classes have been marked for this selection."
                toolbar={
                  <select className="sp-select" style={{ width: 'auto', minWidth: 200 }} aria-label="Course" value={enrollmentFilter} onChange={(e) => setEnrollmentFilter(e.target.value)}>
                    <option value="all">All courses</option>
                    {data.summary.map((row) => (
                      <option key={row.enrollment_id} value={row.enrollment_id}>{row.course_code} — {row.course_name}</option>
                    ))}
                  </select>
                }
                columns={[
                  { key: 'date', header: 'Date', value: (r) => r.date, render: (r) => formatDate(r.date) },
                  { key: 'course_code', header: 'Course', value: (r) => `${r.course_code} ${r.course_name}`, render: (r) => (<><span className="sp-code">{r.course_code}</span> {r.course_name}</>) },
                  { key: 'status', header: 'Status', render: (r) => <span className={`sp-badge ${STATUS_TONE[r.status] || 'is-neutral'}`}>{capitalize(r.status)}</span> },
                ]}
              />
            </section>
          </>
        )}
      </ResourceView>
    </>
  );
}
