import { createResourceSlice } from '../../app/createResourceSlice';

/**
 * Student server data shared by several Student Portal views.
 *
 *   profile     GET /api/students/me             Dashboard, Profile
 *   courses     GET /api/students/me/courses     Dashboard, My Courses
 *   attendance  GET /api/students/me/attendance  Dashboard, Attendance
 *   timetable   GET /api/student-timetable       Timetable (active enrollments only)
 *   marks       GET /api/students/me/marks       Dashboard
 *
 * Data used by a single view (leave, discussions, research) stays in that
 * view's local state via useApiResource.
 */
const { reducer, thunks, selectResource } = createResourceSlice('student', {
  profile: '/students/me',
  courses: '/students/me/courses',
  attendance: '/students/me/attendance',
  timetable: '/student-timetable',
  marks: '/students/me/marks',
});

export const fetchStudentProfile = thunks.profile;
export const fetchStudentCourses = thunks.courses;
export const fetchStudentAttendance = thunks.attendance;
export const fetchStudentTimetable = thunks.timetable;
export const fetchStudentMarks = thunks.marks;
export const selectStudentResource = selectResource;

export const selectOverallAttendance = (state) => {
  const summary = state.student.attendance.data?.summary;
  if (!Array.isArray(summary) || summary.length === 0) return null;
  const totals = summary.reduce(
    (acc, row) => ({ attended: acc.attended + (row.present || 0) + (row.excused || 0), total: acc.total + (row.total || 0) }),
    { attended: 0, total: 0 }
  );
  if (totals.total === 0) return null;
  return { ...totals, percentage: Math.round((totals.attended / totals.total) * 100) };
};

export default reducer;

/**
 * The college's minimum attendance (college settings attendance_min_pct), as
 * returned with GET /students/me/attendance. null until it has loaded.
 */
export const selectAttendanceMin = (state) => {
  const value = state.student.attendance.data?.attendance_min_pct;
  return typeof value === 'number' ? value : null;
};

/** Tone for an attendance % against the college threshold (warning band: threshold to threshold + 10). */
export function attendanceToneFor(percentage, min) {
  if (typeof percentage !== 'number' || typeof min !== 'number') return 'neutral';
  if (percentage < min) return 'danger';
  if (percentage < Math.min(100, min + 10)) return 'warning';
  return 'success';
}
