-- 006_course_sections.sql
--
-- COURSE_OWNERSHIP_MIGRATION_PLAN.md: course creation and enrollment move
-- from faculty to academic head, and a course gains real sections — one
-- faculty per section, not one faculty per course. courses.faculty_id was a
-- scalar because its only writer (a teaching faculty member) was trivially
-- "the" faculty; a non-teaching head creating a course has no such faculty
-- to default to, and "assign faculties [plural] to it [one course]" is a
-- literal ask for a course to have more than one.
--
-- Additive per the append-only convention: 001-005 are never edited.

CREATE TABLE IF NOT EXISTS course_sections (
  course_section_id text PRIMARY KEY,
  course_id         text NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  section           text NOT NULL,
  faculty_id        text NOT NULL REFERENCES users(user_id),
  faculty_name      text,                    -- denormalised display copy, same convention as courses.faculty_name today
  college_id        text REFERENCES colleges(college_id),
  UNIQUE (course_id, section)
);

CREATE INDEX IF NOT EXISTS course_sections_course_id_idx ON course_sections(course_id);
CREATE INDEX IF NOT EXISTS course_sections_faculty_id_idx ON course_sections(faculty_id);

-- Backfill: every existing course's single faculty becomes its Section A
-- row. A course created going forward may start with zero sections
-- (confirmed: staffed later via PUT /courses/:id/sections) so this backfill
-- only runs for rows that already had a faculty_id — nothing to carry
-- forward for one that didn't.
INSERT INTO course_sections (course_section_id, course_id, section, faculty_id, faculty_name, college_id)
SELECT 'cs-' || course_id, course_id, 'A', faculty_id, faculty_name, college_id
FROM courses
WHERE faculty_id IS NOT NULL
ON CONFLICT (course_id, section) DO NOTHING;

ALTER TABLE courses DROP COLUMN IF EXISTS faculty_id;
ALTER TABLE courses DROP COLUMN IF EXISTS faculty_name;
