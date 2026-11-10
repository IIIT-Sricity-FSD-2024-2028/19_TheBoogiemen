/**
 * academic-calendar.spec.ts — the day-of-week-to-calendar-date projection
 * and holiday handling behind the merged attendance-request flow and the
 * student attendance heatmap. Regressing either silently excuses the wrong
 * sessions or miscounts a student's attendance.
 */

import {
  buildAttendanceCalendar,
  excludeHolidays,
  expandClassDates,
  holidayDateSet,
  isHoliday,
} from './academic-calendar';

const dbWith = (over: any = {}) =>
  ({
    holidays: [],
    timetable: [],
    enrollment: [],
    attendance_log: [],
    courses: [],
    ...over,
  }) as any;

describe('holidayDateSet / isHoliday', () => {
  it('includes a college-scoped holiday for that college only', () => {
    const db = dbWith({
      holidays: [
        { holiday_id: 'h1', date: '2026-11-12', label: 'Diwali', college_id: 'c1' },
      ],
    });
    expect(isHoliday(db, '2026-11-12', 'c1')).toBe(true);
    expect(isHoliday(db, '2026-11-12', 'c2')).toBe(false);
  });

  it('treats a holiday with no college_id as applying everywhere', () => {
    const db = dbWith({
      holidays: [{ holiday_id: 'h1', date: '2026-12-25', label: 'Christmas', college_id: null }],
    });
    expect(isHoliday(db, '2026-12-25', 'c1')).toBe(true);
    expect(isHoliday(db, '2026-12-25', 'c2')).toBe(true);
  });
});

describe('excludeHolidays', () => {
  it('drops records landing on a holiday, keeps the rest', () => {
    const db = dbWith({ holidays: [{ holiday_id: 'h1', date: '2026-11-12', label: 'Diwali', college_id: 'c1' }] });
    const records = [
      { date: '2026-11-11', status: 'absent' },
      { date: '2026-11-12', status: 'absent' },
    ];
    expect(excludeHolidays(db, records, 'c1')).toEqual([{ date: '2026-11-11', status: 'absent' }]);
  });
});

describe('expandClassDates', () => {
  const timetable = [
    { course_id: 'c1', section: 'A', day: 'MON' },
    { course_id: 'c1', section: 'A', day: 'WED' },
  ];

  it('only generates a pair for dates the course actually meets', () => {
    // 2026-11-09 is a Monday, 2026-11-10 a Tuesday, 2026-11-11 a Wednesday.
    const db = dbWith({ timetable });
    const dates = ['2026-11-09', '2026-11-10', '2026-11-11'];
    const pairs = expandClassDates(db, dates, [{ course_id: 'c1', section: 'A' }], 'c1');
    expect(pairs).toEqual([
      { course_id: 'c1', date: '2026-11-09' },
      { course_id: 'c1', date: '2026-11-11' },
    ]);
  });

  it('skips a date that is a holiday even if the course meets that day', () => {
    const db = dbWith({
      timetable,
      holidays: [{ holiday_id: 'h1', date: '2026-11-09', label: 'Holiday', college_id: 'c1' }],
    });
    const pairs = expandClassDates(db, ['2026-11-09', '2026-11-11'], [{ course_id: 'c1', section: 'A' }], 'c1');
    expect(pairs).toEqual([{ course_id: 'c1', date: '2026-11-11' }]);
  });

  it('returns nothing for a weekend-only range the course never meets', () => {
    const db = dbWith({ timetable });
    // 2026-11-14 is a Saturday, 2026-11-15 a Sunday.
    const pairs = expandClassDates(db, ['2026-11-14', '2026-11-15'], [{ course_id: 'c1', section: 'A' }], 'c1');
    expect(pairs).toEqual([]);
  });
});

describe('buildAttendanceCalendar', () => {
  it('marks a holiday cell, a no-class cell, and worst-status-wins on a mixed day', () => {
    const db = dbWith({
      holidays: [{ holiday_id: 'h1', date: '2026-11-12', label: 'Diwali', college_id: 'c1' }],
      enrollment: [
        { student_id: 's1', course_id: 'c1', section: 'A', status: 'active' },
        { student_id: 's1', course_id: 'c2', section: 'A', status: 'active' },
      ],
      timetable: [
        // Thursday 2026-11-12 is a holiday; Monday 2026-11-09 has both courses.
        { course_id: 'c1', section: 'A', day: 'MON' },
        { course_id: 'c2', section: 'A', day: 'MON' },
      ],
      attendance_log: [
        { student_id: 's1', course_id: 'c1', date: '2026-11-09', status: 'present' },
        { student_id: 's1', course_id: 'c2', date: '2026-11-09', status: 'absent' },
      ],
      courses: [
        { course_id: 'c1', course_code: 'CS101' },
        { course_id: 'c2', course_code: 'CS102' },
      ],
    });

    const days = buildAttendanceCalendar(db, 's1', '2026-11', 'c1');
    const nov9 = days.find((d) => d.date === '2026-11-09')!;
    const nov12 = days.find((d) => d.date === '2026-11-12')!;
    const nov10 = days.find((d) => d.date === '2026-11-10')!; // Tuesday, no class scheduled

    expect(nov9.dayStatus).toBe('absent'); // one absence that day beats the other course's present
    expect(nov12.dayStatus).toBe('holiday');
    expect(nov12.label).toBe('Diwali');
    expect(nov10.dayStatus).toBe('no-class');
    expect(days).toHaveLength(30); // November has 30 days
  });

  it('shows an already-recorded future day as resolved, not as a misleading no-class', () => {
    const farFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const month = `${farFuture.getUTCFullYear()}-${String(farFuture.getUTCMonth() + 1).padStart(2, '0')}`;
    const date = farFuture.toISOString().split('T')[0];
    const dow = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][farFuture.getUTCDay()];

    const db = dbWith({
      enrollment: [{ student_id: 's1', course_id: 'c1', section: 'A', status: 'active' }],
      timetable: [{ course_id: 'c1', section: 'A', day: dow }],
      attendance_log: [{ student_id: 's1', course_id: 'c1', date, status: 'excused' }],
      courses: [{ course_id: 'c1', course_code: 'CS101' }],
    });

    const days = buildAttendanceCalendar(db, 's1', month, 'c1');
    const cell = days.find((d) => d.date === date)!;
    expect(cell.dayStatus).toBe('excused');

    // A different future day in the same week with NO record at all is
    // still genuinely undecided.
    const undecided = new Date(farFuture);
    undecided.setUTCDate(undecided.getUTCDate() + 7);
    const undecidedMonth = `${undecided.getUTCFullYear()}-${String(undecided.getUTCMonth() + 1).padStart(2, '0')}`;
    if (undecidedMonth === month) {
      const undecidedDate = undecided.toISOString().split('T')[0];
      const cell2 = days.find((d) => d.date === undecidedDate);
      if (cell2) expect(cell2.dayStatus).toBe('no-class');
    }
  });
});
