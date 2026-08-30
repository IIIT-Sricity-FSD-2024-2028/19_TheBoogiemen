import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './../src/app.module';
import { VALIDATION_PIPE_OPTIONS } from '../src/common/errors/validation.factory';
import { InMemoryDbService } from '../src/database/in-memory-db.service';

describe('Meetings Endpoints (e2e)', () => {
  let app: INestApplication;
  let studentToken: string;
  let facultyToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
    app.setGlobalPrefix('api');
    await app.init();

    const inMemoryDb = app.get(InMemoryDbService);
    if (inMemoryDb.users.length === 0) {
      const mockDbPath = path.join(__dirname, '../data/mock-db.json');
      if (fs.existsSync(mockDbPath)) {
        const raw = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
        for (const k in raw) {
          if (inMemoryDb[k] && Array.isArray(raw[k])) {
            inMemoryDb[k].push(...raw[k]);
          }
        }
      }
    }

    // Login as student
    const studentRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'student@example.com', password: 'Student@123' })
      .expect(201);

    studentToken = studentRes.body.token;

    // Login as faculty
    const facultyRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'faculty@example.com', password: 'Faculty@123' })
      .expect(201);

    facultyToken = facultyRes.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/meetings/faculty-list returns list of faculty to student', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/meetings/faculty-list')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.some((f: any) => f.user_id === 'u2')).toBe(true);
  });

  it('2. GET /api/meetings/student-list returns list of students to faculty', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/meetings/student-list')
      .set('Authorization', `Bearer ${facultyToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.some((s: any) => s.user_id === 'u1')).toBe(true);
  });

  let meetingId: string;

  it('3. POST /api/meetings by student creates PENDING meeting request', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/meetings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        facultyId: 'u2',
        purpose: 'Project Thesis Review',
        description: 'Discussing chapter 2 algorithm design',
        requestedDate: '2026-09-10',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: 'ONLINE',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.purpose).toBe('Project Thesis Review');
    expect(res.body.data.student_id).toBe('u1');
    expect(res.body.data.faculty_id).toBe('u2');

    meetingId = res.body.data.meeting_id;
  });

  it('4. GET /api/meetings/faculty/requests returns the pending request to faculty', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/meetings/faculty/requests')
      .set('Authorization', `Bearer ${facultyToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.some((m: any) => m.meeting_id === meetingId)).toBe(true);
  });

  it('5. PATCH /api/meetings/:id/accept by faculty confirms schedule -> SCHEDULED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/meetings/${meetingId}/accept`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        scheduledDate: '2026-09-11',
        scheduledStartTime: '11:00',
        scheduledEndTime: '11:30',
        meetingType: 'ONLINE',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        facultyRemarks: 'Please bring draft slides',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(res.body.data.scheduled_date).toBe('2026-09-11');
    expect(res.body.data.scheduled_start_time).toBe('11:00');
    expect(res.body.data.scheduled_end_time).toBe('11:30');
    expect(res.body.data.meeting_link).toBe('https://meet.google.com/abc-defg-hij');
  });

  it('6. POST /api/meetings/faculty-schedule allows faculty to directly schedule a meeting', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/meetings/faculty-schedule')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        studentId: 'u1',
        purpose: 'Direct Evaluation Meeting',
        description: 'Semester project mid-term evaluation',
        scheduledDate: '2026-09-15',
        scheduledStartTime: '14:00',
        scheduledEndTime: '14:30',
        meetingType: 'ONLINE',
        meetingLink: 'https://meet.google.com/eval-direct-link',
        facultyRemarks: 'Bring code demonstration',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(res.body.data.scheduled_date).toBe('2026-09-15');
    expect(res.body.data.scheduled_start_time).toBe('14:00');
    expect(res.body.data.meeting_link).toBe('https://meet.google.com/eval-direct-link');
  });

  it('7. Overlapping schedule check: rejects conflicting meeting slot with 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post('/api/meetings/faculty-schedule')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        studentId: 'u1',
        purpose: 'Overlapping Meeting',
        scheduledDate: '2026-09-15',
        scheduledStartTime: '14:15',
        scheduledEndTime: '14:45',
        meetingType: 'ONLINE',
        meetingLink: 'https://meet.google.com/overlap',
      })
      .expect(409);
  });

  it('8. Student requests reschedule on scheduled meeting -> RESCHEDULE_REQUESTED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/meetings/${meetingId}/request-reschedule`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        proposedDate: '2026-09-12',
        proposedStartTime: '14:00',
        proposedEndTime: '14:30',
        rescheduleReason: 'Class clash on original date',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESCHEDULE_REQUESTED');
    expect(res.body.data.reschedule_requested_by).toBe('STUDENT');
  });

  it('9. Faculty accepts student reschedule request -> SCHEDULED with new time', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/meetings/${meetingId}/handle-student-reschedule`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        action: 'ACCEPT',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(res.body.data.scheduled_date).toBe('2026-09-12');
    expect(res.body.data.scheduled_start_time).toBe('14:00');
  });

  it('10. Faculty marks meeting as COMPLETED with notes and outcomes', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/meetings/${meetingId}/complete`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        discussionNotes: 'Reviewed thesis algorithm benchmarks.',
        outcome: 'Design approved for final submission.',
        actionItems: 'Implement test cases on GPU cluster.',
        facultyRemarks: 'Excellent analytical work.',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.discussion_notes).toBe('Reviewed thesis algorithm benchmarks.');
    expect(res.body.data.outcome).toBe('Design approved for final submission.');
  });
});
