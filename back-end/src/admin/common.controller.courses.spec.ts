/**
 * common.controller.courses.spec.ts — regression test for a real data-
 * corruption bug: createCourse() used to push the new course into
 * this.db.courses BEFORE validating its section list, so a request that
 * failed section validation (e.g. two sections sharing the same name) still
 * left a section-less course behind in the DB — invisible in the UI only
 * until the next full refetch (a page reload) read it straight back out,
 * making a rejected "create course" request look like it had silently
 * succeeded.
 */
import { CommonController } from './common.controller';
import { InMemoryDbService } from '../database/in-memory-db.service';

function fakeDb() {
  return {
    courses: [] as any[],
    course_sections: [] as any[],
    users: [{ user_id: 'fac1', role: 'faculty', college_id: 'c-default', username: 'facuser' }],
    faculty: [{ user_id: 'fac1', first_name: 'Fac', last_name: 'Ulty', college_id: 'c-default' }],
    persist: jest.fn(),
  } as unknown as InMemoryDbService;
}

describe('CommonController.createCourse — atomicity under section validation failure', () => {
  it('rejects two sections sharing the same name and leaves no course behind', async () => {
    const db = fakeDb();
    const controller = new CommonController(db, {} as any);

    await expect(
      controller.createCourse(
        {
          course_name: 'Test Course',
          course_code: 'TC101',
          sections: [
            { section: 'A', faculty_id: 'fac1' },
            { section: 'A', faculty_id: 'fac1' },
          ],
        },
        'c-default',
      ),
    ).rejects.toThrow();

    expect((db as any).courses).toHaveLength(0);
    expect((db as any).course_sections).toHaveLength(0);
  });

  it('a valid course with distinct sections commits both the course and its sections', async () => {
    const db = fakeDb();
    const controller = new CommonController(db, {} as any);

    const result: any = await controller.createCourse(
      {
        course_name: 'Test Course',
        course_code: 'TC102',
        sections: [
          { section: 'A', faculty_id: 'fac1' },
          { section: 'B', faculty_id: 'fac1' },
        ],
      },
      'c-default',
    );

    expect((db as any).courses).toHaveLength(1);
    expect((db as any).course_sections).toHaveLength(2);
    expect(result.data.sections).toHaveLength(2);
  });
});
