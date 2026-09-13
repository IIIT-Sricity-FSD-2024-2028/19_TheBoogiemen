-- 004_academic_tenancy.sql
--
-- Closes the gap TENANT_ISOLATION_DIAGNOSIS.md diagnosed: college_id existed
-- on `users` only, so nothing about a student's data — their attendance,
-- marks, discussion posts, leave — carried any tenant boundary at all. This
-- adds college_id to every academic table it was missing from.
--
-- Same status as every migration in this set: schema parity, not the live
-- store. The live path is InMemoryDbService and its own backfill script
-- (scripts/backfill-academic-college-id.ts) — mirrored here exactly so
-- Postgres and the JSON store agree on shape.
--
-- Every column is added the same way regardless of whether a natural owner
-- link already exists (attendance_log.student_id, say) — the diagnosis's own
-- reasoning (§5) was that denormalising college_id directly onto every row,
-- rather than deriving it via a join in some places and not others, is what
-- lets one scoping helper (scopeToCollege()) work uniformly everywhere.

ALTER TABLE departments          ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE students             ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE faculty              ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE courses              ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE enrollment           ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE attendance_log       ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE assessments          ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE marks_entry          ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE leave_applications   ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE research_projects    ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE discussion_posts     ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE discussion_replies   ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE events               ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE resources            ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE fees                 ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE submissions          ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE timetable            ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE syllabus_progress    ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE attendance_requests  ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);
ALTER TABLE resource_bookings    ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);

-- Every pre-existing row across this deployment belongs to the one college
-- it has always served — the same c-default id every prior backfill this
-- session used (002's users backfill, mock-db.json's colleges seed).
UPDATE departments         SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE students            SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE faculty              SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE courses              SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE enrollment           SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE attendance_log       SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE assessments          SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE marks_entry          SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE leave_applications   SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE research_projects    SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE discussion_posts     SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE discussion_replies   SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE events               SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE resources            SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE fees                 SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE submissions          SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE timetable            SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE syllabus_progress    SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE attendance_requests  SET college_id = 'c-default' WHERE college_id IS NULL;
UPDATE resource_bookings    SET college_id = 'c-default' WHERE college_id IS NULL;

CREATE INDEX IF NOT EXISTS students_college_id_idx ON students(college_id);
CREATE INDEX IF NOT EXISTS faculty_college_id_idx ON faculty(college_id);
CREATE INDEX IF NOT EXISTS courses_college_id_idx ON courses(college_id);
CREATE INDEX IF NOT EXISTS attendance_log_college_id_idx ON attendance_log(college_id);
CREATE INDEX IF NOT EXISTS discussion_posts_college_id_idx ON discussion_posts(college_id);
