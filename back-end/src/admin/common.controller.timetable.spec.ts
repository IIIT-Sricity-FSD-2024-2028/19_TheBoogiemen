/**
 * common.controller.timetable.spec.ts — regression tests for a cluster of
 * real bugs in the timetable-authoring surface (TimetableManagement.jsx /
 * `/timetable/*`), diagnosed together:
 *
 * 1. Section letters repeat every semester ("Section A" exists in every
 *    term), but every timetable endpoint used to identify a cohort by
 *    `section` alone — so two unrelated semesters' "Section A" timetables
 *    were silently the same bucket of data (cross-semester SECTION_OVERLAP
 *    false conflicts, clearExistingDrafts wiping out the wrong semester's
 *    drafts).
 * 2. generateTimetable()'s "is this hour a lab" heuristic checked whether
 *    the course CODE contained the letter "l" anywhere — true for almost
 *    any course code — wrongly typing ordinary lecture-only courses' last
 *    generated hour as a lab session.
 * 3. generateTimetable() picked exactly one lecture room and one lab room
 *    up front and reused only those for the whole run, so multiple courses
 *    needing the same time slot competed for one room instead of using
 *    whichever of the college's real registered rooms was actually free.
 */
import { CommonController } from './common.controller';
import { InMemoryDbService } from '../database/in-memory-db.service';

function fakeDb(overrides: Partial<Record<string, any[]>> = {}) {
  return {
    courses: [],
    course_sections: [],
    faculty: [
      { user_id: 'fac1', first_name: 'Fac', last_name: 'Ulty', college_id: 'c-default' },
      { user_id: 'fac2', first_name: 'Other', last_name: 'Faculty', college_id: 'c-default' },
    ],
    users: [
      { user_id: 'fac1', role: 'faculty', college_id: 'c-default' },
      { user_id: 'fac2', role: 'faculty', college_id: 'c-default' },
    ],
    resources: [],
    timetable: [],
    enrollment: [],
    students: [],
    persist: jest.fn(),
    ...overrides,
  } as unknown as InMemoryDbService;
}

describe('CommonController — timetable semester scoping', () => {
  it('generateTimetable: clearExistingDrafts only clears drafts for the requested semester, not every semester sharing the section letter', async () => {
    // Two DIFFERENT courses, one per semester — a slot's "real" semester is
    // resolved from its course (see resolveSlotSemester's own comment), so
    // this is the only realistic way two slots genuinely differ by semester.
    const db = fakeDb({
      courses: [
        { course_id: 'c1', course_name: 'Data Structures', course_code: 'CS201', credits: 1, semester: 3, college_id: 'c-default' },
        { course_id: 'c2', course_name: 'Computer Networks', course_code: 'CS401', credits: 1, semester: 5, college_id: 'c-default' },
      ],
      course_sections: [
        { course_section_id: 'cs1', course_id: 'c1', section: 'A', faculty_id: 'fac1', college_id: 'c-default' },
        { course_section_id: 'cs2', course_id: 'c2', section: 'A', faculty_id: 'fac1', college_id: 'c-default' },
      ],
      timetable: [
        { slot_id: 'sem3-draft', day: 'MON', time: '09:00', course_id: 'c1', section: 'A', status: 'draft', semester: 3, college_id: 'c-default' },
        { slot_id: 'sem5-draft', day: 'TUE', time: '10:00', course_id: 'c2', section: 'A', status: 'draft', semester: 5, college_id: 'c-default' },
      ],
    });
    const controller = new CommonController(db, {} as any);

    await controller.generateTimetable(
      { section: 'A', semester: 3, clearExistingDrafts: true },
      'c-default',
    );

    const remainingIds = (db as any).timetable.map((t: any) => t.slot_id);
    expect(remainingIds).toContain('sem5-draft');
    expect(remainingIds).not.toContain('sem3-draft');
  });

  it('validateSlotConflicts (via createOrUpdateSlot): the same section letter in a different semester never conflicts', async () => {
    const db = fakeDb({
      courses: [
        { course_id: 'c1', course_name: 'Data Structures', course_code: 'CS201', credits: 3, semester: 3, college_id: 'c-default' },
        { course_id: 'c2', course_name: 'Computer Networks', course_code: 'CS401', credits: 3, semester: 5, college_id: 'c-default' },
      ],
      course_sections: [
        { course_section_id: 'cs1', course_id: 'c1', section: 'A', faculty_id: 'fac1', college_id: 'c-default' },
        { course_section_id: 'cs2', course_id: 'c2', section: 'A', faculty_id: 'fac1', college_id: 'c-default' },
      ],
      timetable: [
        { slot_id: 'existing', day: 'MON', time: '09:00', course_id: 'c1', section: 'A', semester: 3, room: 'TBA', status: 'draft', college_id: 'c-default' },
      ],
    });
    const controller = new CommonController(db, {} as any);

    // Same section ("A"), same day/time, but a DIFFERENT semester's course —
    // must save cleanly, not be rejected as a section overlap.
    const res: any = await controller.createOrUpdateSlot(
      { day: 'MON', time: '09:00', course_id: 'c2', section: 'A', room: 'Other Room', faculty_id: 'fac2' },
      'c-default',
    );
    expect(res.success).toBe(true);
  });

  it('validateSlotConflicts: the SAME semester + section + day/time genuinely conflicts', async () => {
    const db = fakeDb({
      courses: [
        { course_id: 'c1', course_name: 'Data Structures', course_code: 'CS201', credits: 3, semester: 3, college_id: 'c-default' },
        { course_id: 'c2', course_name: 'Database Systems', course_code: 'CS202', credits: 3, semester: 3, college_id: 'c-default' },
      ],
      course_sections: [
        { course_section_id: 'cs1', course_id: 'c1', section: 'A', faculty_id: 'fac1', college_id: 'c-default' },
        { course_section_id: 'cs2', course_id: 'c2', section: 'A', faculty_id: 'fac1', college_id: 'c-default' },
      ],
      timetable: [
        { slot_id: 'existing', day: 'MON', time: '09:00', course_id: 'c1', section: 'A', semester: 3, room: 'TBA', status: 'draft', college_id: 'c-default' },
      ],
    });
    const controller = new CommonController(db, {} as any);

    const res: any = await controller.createOrUpdateSlot(
      { day: 'MON', time: '09:00', course_id: 'c2', section: 'A' },
      'c-default',
    );
    expect(res.success).toBe(false);
    expect(res.hasConflicts).toBe(true);
  });
});

describe('CommonController.generateTimetable — lab heuristic', () => {
  it('does not type an ordinary course as a lab just because its course code contains the letter "l"', async () => {
    const db = fakeDb({
      courses: [{ course_id: 'c1', course_name: 'Compilers', course_code: 'COOL101', credits: 1, semester: 3, college_id: 'c-default' }],
      course_sections: [{ course_section_id: 'cs1', course_id: 'c1', section: 'A', faculty_id: 'fac1', college_id: 'c-default' }],
      resources: [{ resource_id: 'r1', name: 'Room 101', type: 'Room', status: 'available', college_id: 'c-default' }],
    });
    const controller = new CommonController(db, {} as any);

    const res: any = await controller.generateTimetable({ section: 'A', semester: 3 }, 'c-default');

    expect(res.generatedSlots).toBe(1);
    expect(res.slots[0].type).toBe('lecture');
  });

  it('still types a genuinely lab-named course session as a lab', async () => {
    const db = fakeDb({
      courses: [{ course_id: 'c1', course_name: 'Networking Lab', course_code: 'CS410', credits: 1, semester: 3, college_id: 'c-default' }],
      course_sections: [{ course_section_id: 'cs1', course_id: 'c1', section: 'A', faculty_id: 'fac1', college_id: 'c-default' }],
      resources: [{ resource_id: 'r1', name: 'Computing Lab 1', type: 'Lab', status: 'available', college_id: 'c-default' }],
    });
    const controller = new CommonController(db, {} as any);

    const res: any = await controller.generateTimetable({ section: 'A', semester: 3 }, 'c-default');

    expect(res.generatedSlots).toBe(1);
    expect(res.slots[0].type).toBe('lab');
  });
});

describe('CommonController.generateTimetable — room rotation', () => {
  it('uses more than one registered room instead of funnelling every section into a single default room', async () => {
    // Two different SECTIONS (not the same section — a single section can
    // never legitimately double-book itself at one day/time, that's
    // SECTION_OVERLAP correctly refusing it) each with their own course,
    // each needing just one hour, competing for the same room pool.
    const db = fakeDb({
      courses: [
        { course_id: 'c1', course_name: 'Data Structures', course_code: 'CS201', credits: 1, semester: 3, college_id: 'c-default' },
        { course_id: 'c2', course_name: 'Database Systems', course_code: 'CS202', credits: 1, semester: 3, college_id: 'c-default' },
      ],
      course_sections: [
        { course_section_id: 'cs1', course_id: 'c1', section: 'A', faculty_id: 'fac1', college_id: 'c-default' },
        { course_section_id: 'cs2', course_id: 'c2', section: 'B', faculty_id: 'fac2', college_id: 'c-default' },
      ],
      resources: [
        { resource_id: 'r1', name: 'Room 101', type: 'Room', status: 'available', college_id: 'c-default' },
        { resource_id: 'r2', name: 'Room 102', type: 'Room', status: 'available', college_id: 'c-default' },
        { resource_id: 'r3', name: 'Under Repair Hall', type: 'Hall', status: 'maintenance', college_id: 'c-default' },
      ],
    });
    const controller = new CommonController(db, {} as any);

    const resA: any = await controller.generateTimetable({ section: 'A', semester: 3 }, 'c-default');
    const resB: any = await controller.generateTimetable({ section: 'B', semester: 3 }, 'c-default');

    expect(resA.generatedSlots).toBe(1);
    expect(resB.generatedSlots).toBe(1);
    // Section A claims the first room at MON 09:00. With the single-
    // default-room bug, Section B's generation would find that room busy at
    // MON 09:00 and push itself to a LATER time instead of trying Room 102,
    // which is free at that same early slot.
    expect(resA.slots[0].day).toBe('MON');
    expect(resA.slots[0].time).toBe('09:00');
    expect(resB.slots[0].day).toBe('MON');
    expect(resB.slots[0].time).toBe('09:00');
    expect(resB.slots[0].room).not.toBe(resA.slots[0].room);
    // The maintenance-flagged hall must never be handed out.
    expect(resA.slots[0].room).not.toBe('Under Repair Hall');
    expect(resB.slots[0].room).not.toBe('Under Repair Hall');
  });
});
