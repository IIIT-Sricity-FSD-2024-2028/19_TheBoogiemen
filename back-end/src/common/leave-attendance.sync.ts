/**
 * leave-attendance.sync.ts — keeps attendance in step with approved leave (audit M-02).
 *
 * Approving a leave request previously had no effect on attendance, so a student
 * on authorised leave still accumulated absences and tripped the at-risk alert
 * the leave was meant to excuse. Approval now writes EXCUSED sessions across the
 * leave window, and un-approving reverses exactly what it wrote.
 *
 * Records created here carry a `source` marker (`leave:<leave_id>`) plus the
 * status they replaced, so the operation is fully reversible and never destroys
 * attendance a lecturer recorded by hand.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ATTENDANCE_STATUS,
  eachDateInRange,
  normalizeAttendanceStatus,
} from './academic-rules';

export interface LeaveSyncResult {
  created: number;
  converted: number;
  restored: number;
  removed: number;
  skipped: number;
}

const emptyResult = (): LeaveSyncResult => ({
  created: 0,
  converted: 0,
  restored: 0,
  removed: 0,
  skipped: 0,
});

const sourceTag = (leaveId: string) => `leave:${leaveId}`;

/**
 * Mark every session in the leave window as EXCUSED for the student's active courses.
 * An existing PRESENT record is never overwritten — being in class beats being on leave.
 */
export function applyLeaveToAttendance(db: any, leave: any): LeaveSyncResult {
  const result = emptyResult();
  if (!leave?.student_id || !leave?.start_date || !leave?.end_date)
    return result;

  const dates = eachDateInRange(leave.start_date, leave.end_date);
  if (!dates.length) return result;

  const courseIds = db.enrollment
    .filter(
      (e: any) => e.student_id === leave.student_id && e.status === 'active',
    )
    .map((e: any) => e.course_id);
  if (!courseIds.length) return result;

  const tag = sourceTag(leave.leave_id);

  for (const date of dates) {
    for (const course_id of courseIds) {
      const existing = db.attendance_log.find(
        (a: any) =>
          a.student_id === leave.student_id &&
          a.course_id === course_id &&
          a.date === date,
      );

      if (!existing) {
        db.attendance_log.push({
          log_id: uuidv4(),
          student_id: leave.student_id,
          course_id,
          date,
          status: ATTENDANCE_STATUS.EXCUSED,
          source: tag,
        } as any);
        result.created++;
        continue;
      }

      const status = normalizeAttendanceStatus(existing.status);
      if (status === ATTENDANCE_STATUS.ABSENT) {
        existing.previous_status = existing.status;
        existing.status = ATTENDANCE_STATUS.EXCUSED;
        existing.source = tag;
        result.converted++;
      } else {
        // PRESENT, or already EXCUSED by another leave — leave untouched.
        result.skipped++;
      }
    }
  }

  if (result.created || result.converted) db.persist();
  return result;
}

/** Undo everything applyLeaveToAttendance wrote for this leave. */
export function revokeLeaveAttendance(db: any, leave: any): LeaveSyncResult {
  const result = emptyResult();
  if (!leave?.leave_id) return result;

  const tag = sourceTag(leave.leave_id);

  // Iterate backwards so splicing does not skip entries.
  for (let i = db.attendance_log.length - 1; i >= 0; i--) {
    const log = db.attendance_log[i];
    if (log?.source !== tag) continue;

    if (log.previous_status !== undefined) {
      log.status = log.previous_status;
      delete log.previous_status;
      delete log.source;
      result.restored++;
    } else {
      db.attendance_log.splice(i, 1);
      result.removed++;
    }
  }

  if (result.restored || result.removed) db.persist();
  return result;
}

/**
 * Drive the sync from a leave's new status. Approved leave excuses attendance;
 * any other status (pending / rejected) reverses it.
 */
export function syncLeaveAttendance(
  db: any,
  leave: any,
  newStatus: string,
): LeaveSyncResult {
  const status = String(newStatus ?? '')
    .trim()
    .toLowerCase();
  return status === 'approved'
    ? applyLeaveToAttendance(db, leave)
    : revokeLeaveAttendance(db, leave);
}
