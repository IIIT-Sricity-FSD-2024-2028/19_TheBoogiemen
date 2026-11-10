/**
 * academic-calendar.ts — projects day-of-week timetable slots onto real
 * calendar dates, and treats holidays as a fact the whole attendance system
 * respects (not just the merged leave/attendance-request flow).
 *
 * Nothing before this expanded a date range against the timetable's
 * day-of-week slots: applyLeaveToAttendance() used to excuse every calendar
 * day in a leave window for every enrolled course, including weekends and
 * days that course never meets. The helpers below are the one place that
 * now answers "did a class actually happen on this date."
 */

import { InMemoryDbService } from '../database/in-memory-db.service';
import { ATTENDANCE_STATUS, normalizeAttendanceStatus } from './academic-rules';

export interface Holiday {
  holiday_id: string;
  date: string;
  label: string;
  college_id?: string | null;
}

/** This college's holiday dates, for O(1) lookup. A college_id of null on the
 * holiday itself means "every college" — not currently used by the admin UI,
 * but keeps the door open without another migration. */
export function holidayDateSet(
  db: InMemoryDbService,
  collegeId: string | null,
): Set<string> {
  return new Set(
    (db.holidays as Holiday[])
      .filter((h) => h.college_id == null || h.college_id === collegeId)
      .map((h) => h.date),
  );
}

export function isHoliday(
  db: InMemoryDbService,
  date: string,
  collegeId: string | null,
): boolean {
  return holidayDateSet(db, collegeId).has(date);
}

/** Drop any attendance_log row landing on a holiday before it's summarised —
 * a stray row from before a holiday was declared must never count against a
 * student. */
export function excludeHolidays<T extends { date: string }>(
  db: InMemoryDbService,
  records: T[],
  collegeId: string | null,
): T[] {
  const holidays = holidayDateSet(db, collegeId);
  return records.filter((r) => !holidays.has(r.date));
}

const WEEKDAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function weekdayOf(date: string): string {
  return WEEKDAY_CODES[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

/** Does this (course, section) actually have a class on this date's weekday? */
function hasClassOn(
  db: InMemoryDbService,
  courseId: string,
  section: string,
  date: string,
): boolean {
  const dow = weekdayOf(date);
  return db.timetable.some(
    (t: any) => t.course_id === courseId && t.section === section && t.day === dow,
  );
}

/**
 * Every (course_id, date) pair across `dates` that actually has a class for
 * one of `courseSections` — skipping holidays and days that course doesn't
 * meet. This is what a merged leave/attendance-request submission expands
 * into: one grantable row per real session, never one per raw calendar day.
 */
export function expandClassDates(
  db: InMemoryDbService,
  dates: string[],
  courseSections: { course_id: string; section: string }[],
  collegeId: string | null,
): { course_id: string; date: string }[] {
  const holidays = holidayDateSet(db, collegeId);
  const pairs: { course_id: string; date: string }[] = [];
  for (const date of dates) {
    if (holidays.has(date)) continue;
    for (const cs of courseSections) {
      if (hasClassOn(db, cs.course_id, cs.section, date)) {
        pairs.push({ course_id: cs.course_id, date });
      }
    }
  }
  return pairs;
}

export interface CalendarDayCourse {
  course_id: string;
  course_code: string;
  status: string;
}

export interface CalendarDay {
  date: string;
  dayStatus: 'present' | 'absent' | 'excused' | 'no-class' | 'holiday';
  label?: string;
  courses: CalendarDayCourse[];
}

/**
 * One cell per calendar day in `month` (YYYY-MM), for the student attendance
 * heatmap. "Worst status wins": any absence that day paints it red, no
 * absence but at least one excused session paints it amber, otherwise green
 * — a day with no scheduled class (or a holiday) is neutral.
 */
export function buildAttendanceCalendar(
  db: InMemoryDbService,
  studentId: string,
  month: string,
  collegeId: string | null,
): CalendarDay[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const today = new Date().toISOString().split('T')[0];

  const holidays = db.holidays as Holiday[];
  const holidayByDate = new Map(
    holidays
      .filter((h) => h.college_id == null || h.college_id === collegeId)
      .map((h) => [h.date, h.label]),
  );

  const mySections = db.enrollment.filter(
    (e: any) => e.student_id === studentId && e.status === 'active',
  );
  const recordsByDate = new Map<string, any[]>();
  db.attendance_log
    .filter((a: any) => a.student_id === studentId)
    .forEach((r: any) => {
      const list = recordsByDate.get(r.date) || [];
      list.push(r);
      recordsByDate.set(r.date, list);
    });

  const days: CalendarDay[] = [];
  for (const d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().split('T')[0];

    if (holidayByDate.has(date)) {
      days.push({ date, dayStatus: 'holiday', label: holidayByDate.get(date), courses: [] });
      continue;
    }

    const dow = WEEKDAY_CODES[d.getUTCDay()];
    const scheduled = mySections.filter((e: any) =>
      db.timetable.some(
        (t: any) => t.course_id === e.course_id && t.section === e.section && t.day === dow,
      ),
    );
    const dayRecords = recordsByDate.get(date) || [];
    // A future day with nothing recorded yet is genuinely undecided — but a
    // future day already carrying a record (an advance-approved excusal,
    // e.g. leave requested for next week) has actually been resolved, and
    // must show that, not a misleading neutral "no-class".
    if (!scheduled.length || (date > today && !dayRecords.length)) {
      days.push({ date, dayStatus: 'no-class', courses: [] });
      continue;
    }

    const courses: CalendarDayCourse[] = scheduled.map((e: any) => {
      const log = dayRecords.find((r) => r.course_id === e.course_id);
      const course = db.courses.find((c: any) => c.course_id === e.course_id);
      // Matches faculty.service.ts's own "not yet marked" default — present
      // until recorded otherwise, same convention used for today's roster.
      const status = log ? normalizeAttendanceStatus(log.status) : ATTENDANCE_STATUS.PRESENT;
      return { course_id: e.course_id, course_code: course?.course_code || e.course_id, status };
    });

    const hasAbsent = courses.some((c) => c.status === ATTENDANCE_STATUS.ABSENT);
    const hasExcused = courses.some((c) => c.status === ATTENDANCE_STATUS.EXCUSED);
    const dayStatus = hasAbsent ? 'absent' : hasExcused ? 'excused' : 'present';
    days.push({ date, dayStatus, courses });
  }
  return days;
}
