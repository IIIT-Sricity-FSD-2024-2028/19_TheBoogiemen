/**
 * academic-rules.ts — single source of truth for academic business rules.
 *
 * Attendance statuses, at-risk thresholds and leave-type vocabulary were
 * previously re-implemented inline at each call site, which let them drift
 * apart (audit findings M-02, M-04, M-09). Every consumer must now go through
 * the helpers below rather than comparing raw strings.
 */

// ── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export const ATTENDANCE_STATUS = {
  PRESENT: 'present' as const,
  ABSENT: 'absent' as const,
  EXCUSED: 'excused' as const,
};

/** Coerce any stored/incoming value to a known status. Unknown values are treated as absent. */
export function normalizeAttendanceStatus(raw: any): AttendanceStatus {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (v === 'present' || v === 'p') return ATTENDANCE_STATUS.PRESENT;
  if (v === 'excused' || v === 'leave' || v === 'on_leave')
    return ATTENDANCE_STATUS.EXCUSED;
  return ATTENDANCE_STATUS.ABSENT;
}

/**
 * M-02: a student on approved leave must not be counted against their attendance.
 * An EXCUSED session counts as attended, matching the rule the domain expert stated
 * ("students who are 'On Leave' must be distinguished from those 'Absent'").
 */
export function isCountedAsAttended(raw: any): boolean {
  const s = normalizeAttendanceStatus(raw);
  return s === ATTENDANCE_STATUS.PRESENT || s === ATTENDANCE_STATUS.EXCUSED;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  excused: number;
  total: number;
  attended: number;
  percentage: number;
}

/** Summarise a set of attendance rows. Returns percentage 0 when there is no data. */
export function summariseAttendance(records: any[]): AttendanceSummary {
  const summary: AttendanceSummary = {
    present: 0,
    absent: 0,
    excused: 0,
    total: 0,
    attended: 0,
    percentage: 0,
  };
  for (const r of records || []) {
    const status = normalizeAttendanceStatus(r?.status);
    summary.total++;
    if (status === ATTENDANCE_STATUS.PRESENT) summary.present++;
    else if (status === ATTENDANCE_STATUS.EXCUSED) summary.excused++;
    else summary.absent++;
  }
  summary.attended = summary.present + summary.excused;
  summary.percentage =
    summary.total > 0
      ? Math.round((summary.attended / summary.total) * 100)
      : 0;
  return summary;
}

// ── At-risk detection (M-04) ─────────────────────────────────────────────────

/**
 * One definition of "at risk", used by every endpoint that reports it.
 * Previously three different rules coexisted (cgpa < 6, cgpa < 6.5, and a
 * combined attendance/cgpa rule), so the same student was at-risk on one
 * screen and not on another.
 */
export const RISK_THRESHOLDS = {
  MIN_ATTENDANCE_PCT: 75,
  MIN_CGPA: 6.0,
};

export interface RiskInput {
  cgpa?: number | null;
  attendancePct?: number | null;
}

export function isAtRisk({ cgpa, attendancePct }: RiskInput): boolean {
  const lowCgpa =
    typeof cgpa === 'number' &&
    !Number.isNaN(cgpa) &&
    cgpa < RISK_THRESHOLDS.MIN_CGPA;
  const lowAttendance =
    typeof attendancePct === 'number' &&
    !Number.isNaN(attendancePct) &&
    attendancePct < RISK_THRESHOLDS.MIN_ATTENDANCE_PCT;
  return lowCgpa || lowAttendance;
}

/** Human-readable reasons, so the UI can explain why a student was flagged. */
export function riskReasons({ cgpa, attendancePct }: RiskInput): string[] {
  const reasons: string[] = [];
  if (
    typeof cgpa === 'number' &&
    !Number.isNaN(cgpa) &&
    cgpa < RISK_THRESHOLDS.MIN_CGPA
  ) {
    reasons.push(`CGPA ${cgpa} below ${RISK_THRESHOLDS.MIN_CGPA}`);
  }
  if (
    typeof attendancePct === 'number' &&
    !Number.isNaN(attendancePct) &&
    attendancePct < RISK_THRESHOLDS.MIN_ATTENDANCE_PCT
  ) {
    reasons.push(
      `Attendance ${attendancePct}% below ${RISK_THRESHOLDS.MIN_ATTENDANCE_PCT}%`,
    );
  }
  return reasons;
}

// ── Leave types (M-09) ───────────────────────────────────────────────────────

export const LEAVE_TYPES = [
  'Medical',
  'Personal',
  'Event',
  'Family Event',
  'Other',
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

const LEAVE_TYPE_ALIASES: Record<string, LeaveType> = {
  medical: 'Medical',
  'medical leave': 'Medical',
  sick: 'Medical',
  personal: 'Personal',
  'personal leave': 'Personal',
  event: 'Event',
  'event participation': 'Event',
  'family event': 'Family Event',
  family: 'Family Event',
  other: 'Other',
};

/**
 * Canonicalise a leave type on write so the stored vocabulary cannot drift.
 * The student form submitted lowercase ("medical") while seed data was
 * capitalised ("Medical"), so exact-match filters silently matched nothing.
 */
export function normalizeLeaveType(raw: any): LeaveType {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return LEAVE_TYPE_ALIASES[v] || 'Other';
}

/** Case-insensitive comparison, for reading data written before normalisation existed. */
export function isLeaveType(raw: any, type: LeaveType): boolean {
  return normalizeLeaveType(raw) === type;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Maximum span a single leave request may cover, to bound generated records. */
export const MAX_LEAVE_DAYS = 60;

/**
 * Inclusive list of ISO (YYYY-MM-DD) dates between start and end.
 * Returns [] for invalid input and truncates at MAX_LEAVE_DAYS.
 */
export function eachDateInRange(
  start: string,
  end: string,
  maxDays = MAX_LEAVE_DAYS,
): string[] {
  const from = new Date(`${String(start).slice(0, 10)}T00:00:00Z`);
  const to = new Date(`${String(end).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from)
    return [];

  const dates: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to && dates.length < maxDays) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
