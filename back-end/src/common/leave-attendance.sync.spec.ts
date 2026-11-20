/**
 * leave-attendance.sync.spec.ts — a row this module creates must carry a
 * college_id, or it's invisible to every scopeToCollege()-gated read (every
 * admin/head attendance view) even though a student's own unscoped read
 * still counts it — exactly the bug this file's college_id fix closed.
 */

import { applyLeaveToAttendance, revokeLeaveAttendance, syncLeaveAttendance } from './leave-attendance.sync';
import { DEFAULT_COLLEGE_ID } from './constants/college';

const dbWith = (over: any = {}) =>
  ({
    attendance_log: [],
    enrollment: [{ student_id: 's1', course_id: 'c1', status: 'active' }],
    persist: () => {},
    ...over,
  }) as any;

const leave = { leave_id: 'l1', student_id: 's1', start_date: '2026-01-05', end_date: '2026-01-05' };

describe('applyLeaveToAttendance', () => {
  it('stamps the given college_id on every newly created row', () => {
    const db = dbWith();
    applyLeaveToAttendance(db, leave, 'college-a');
    expect(db.attendance_log).toHaveLength(1);
    expect(db.attendance_log[0].college_id).toBe('college-a');
  });

  it('falls back to the default college when none is given, same convention writeCollegeId uses elsewhere', () => {
    const db = dbWith();
    applyLeaveToAttendance(db, leave);
    expect(db.attendance_log[0].college_id).toBe(DEFAULT_COLLEGE_ID);
  });

  it('converting an existing ABSENT row to EXCUSED does not touch its existing college_id', () => {
    const db = dbWith({
      attendance_log: [
        { log_id: 'a1', student_id: 's1', course_id: 'c1', date: '2026-01-05', status: 'absent', college_id: 'college-b' },
      ],
    });
    applyLeaveToAttendance(db, leave, 'college-a');
    expect(db.attendance_log).toHaveLength(1);
    expect(db.attendance_log[0].status).toBe('excused');
    expect(db.attendance_log[0].college_id).toBe('college-b');
  });
});

describe('syncLeaveAttendance', () => {
  it('threads collegeId through to applyLeaveToAttendance on approval', () => {
    const db = dbWith();
    syncLeaveAttendance(db, leave, 'approved', 'college-a');
    expect(db.attendance_log[0].college_id).toBe('college-a');
  });

  it('a non-approved status reverses rather than creates, same as before', () => {
    const db = dbWith();
    syncLeaveAttendance(db, leave, 'approved', 'college-a');
    expect(db.attendance_log).toHaveLength(1);
    syncLeaveAttendance(db, leave, 'rejected', 'college-a');
    expect(db.attendance_log).toHaveLength(0);
  });
});
