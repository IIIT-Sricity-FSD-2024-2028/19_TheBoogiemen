import { Injectable, Optional } from '@nestjs/common';
import { InMemoryDbService } from '../../database/in-memory-db.service';
import { PostgresService } from '../../database/postgres/postgres.service';
import { getDataStore } from '../../config/database.config';
import { MeetingEntity } from './entities/meeting.entity';
import { MeetingStatus } from './enums/meeting-status.enum';

@Injectable()
export class MeetingRepository {
  // In-memory array for DATA_STORE=memory
  private memoryMeetings: MeetingEntity[] = [];

  constructor(
    private readonly memoryDb: InMemoryDbService,
    @Optional() private readonly postgres?: PostgresService,
  ) {}

  private isPostgres(): boolean {
    return getDataStore() === 'postgres' && Boolean(this.postgres);
  }

  private enrich(meeting: MeetingEntity): MeetingEntity {
    if (!meeting) return meeting;

    // Resolve student name
    const student = this.memoryDb.students.find((s) => s.user_id === meeting.student_id);
    const studentUser = this.memoryDb.users.find((u) => u.user_id === meeting.student_id);
    const studentName = student
      ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
      : studentUser
      ? `${studentUser.first_name || studentUser.username || ''} ${studentUser.last_name || ''}`.trim()
      : 'Student';

    // Resolve faculty name
    const faculty = this.memoryDb.faculty.find((f) => f.user_id === meeting.faculty_id);
    const facultyUser = this.memoryDb.users.find((u) => u.user_id === meeting.faculty_id);
    const facultyName = faculty
      ? `${faculty.first_name || ''} ${faculty.last_name || ''}`.trim()
      : facultyUser
      ? `${facultyUser.first_name || facultyUser.username || ''} ${facultyUser.last_name || ''}`.trim()
      : 'Faculty';

    return {
      ...meeting,
      student_name: studentName,
      faculty_name: facultyName,
    };
  }

  async create(data: MeetingEntity): Promise<MeetingEntity> {
    if (this.isPostgres()) {
      const sql = `
        INSERT INTO meetings (
          meeting_id, student_id, faculty_id, purpose, description,
          requested_date, requested_start_time, requested_end_time,
          scheduled_date, scheduled_start_time, scheduled_end_time,
          status, reschedule_requested_by, proposed_date, proposed_start_time, proposed_end_time,
          reschedule_reason, meeting_type, meeting_platform, meeting_link, location,
          discussion_notes, outcome, action_items, faculty_remarks, denial_reason,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26,
          $27, $28
        )
        RETURNING *
      `;
      const params = [
        data.meeting_id,
        data.student_id,
        data.faculty_id,
        data.purpose,
        data.description || null,
        data.requested_date,
        data.requested_start_time,
        data.requested_end_time,
        data.scheduled_date || null,
        data.scheduled_start_time || null,
        data.scheduled_end_time || null,
        data.status,
        data.reschedule_requested_by || null,
        data.proposed_date || null,
        data.proposed_start_time || null,
        data.proposed_end_time || null,
        data.reschedule_reason || null,
        data.meeting_type,
        data.meeting_platform || null,
        data.meeting_link || null,
        data.location || null,
        data.discussion_notes || null,
        data.outcome || null,
        data.action_items || null,
        data.faculty_remarks || null,
        data.denial_reason || null,
        data.created_at,
        data.updated_at,
      ];
      const row = await this.postgres!.queryOne<MeetingEntity>(sql, params);
      return this.enrich(row!);
    }

    this.memoryMeetings.unshift(data);
    return this.enrich(data);
  }

  async findById(id: string): Promise<MeetingEntity | null> {
    if (this.isPostgres()) {
      const sql = 'SELECT * FROM meetings WHERE meeting_id = $1';
      const row = await this.postgres!.queryOne<MeetingEntity>(sql, [id]);
      return row ? this.enrich(row) : null;
    }
    const meeting = this.memoryMeetings.find((m) => m.meeting_id === id);
    return meeting ? this.enrich(meeting) : null;
  }

  async findByStudentId(studentId: string): Promise<MeetingEntity[]> {
    if (this.isPostgres()) {
      const sql = 'SELECT * FROM meetings WHERE student_id = $1 ORDER BY created_at DESC';
      const rows = await this.postgres!.query<MeetingEntity>(sql, [studentId]);
      return rows.map((r) => this.enrich(r));
    }
    return this.memoryMeetings
      .filter((m) => m.student_id === studentId)
      .map((m) => this.enrich(m));
  }

  async findByFacultyId(facultyId: string): Promise<MeetingEntity[]> {
    if (this.isPostgres()) {
      const sql = 'SELECT * FROM meetings WHERE faculty_id = $1 ORDER BY created_at DESC';
      const rows = await this.postgres!.query<MeetingEntity>(sql, [facultyId]);
      return rows.map((r) => this.enrich(r));
    }
    return this.memoryMeetings
      .filter((m) => m.faculty_id === facultyId)
      .map((m) => this.enrich(m));
  }

  async findFacultyRequests(facultyId: string): Promise<MeetingEntity[]> {
    if (this.isPostgres()) {
      const sql = `
        SELECT * FROM meetings
        WHERE faculty_id = $1 AND status = 'PENDING'
        ORDER BY created_at ASC
      `;
      const rows = await this.postgres!.query<MeetingEntity>(sql, [facultyId]);
      return rows.map((r) => this.enrich(r));
    }
    return this.memoryMeetings
      .filter((m) => m.faculty_id === facultyId && m.status === MeetingStatus.PENDING)
      .map((m) => this.enrich(m));
  }

  async findFacultyOverlappingMeetings(
    facultyId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeMeetingId?: string,
  ): Promise<MeetingEntity[]> {
    if (this.isPostgres()) {
      const sql = `
        SELECT * FROM meetings
        WHERE faculty_id = $1
          AND status = 'SCHEDULED'
          AND scheduled_date = $2
          AND scheduled_start_time < $4
          AND scheduled_end_time > $3
          AND ($5::text IS NULL OR meeting_id != $5)
      `;
      const rows = await this.postgres!.query<MeetingEntity>(sql, [
        facultyId,
        date,
        startTime,
        endTime,
        excludeMeetingId || null,
      ]);
      return rows;
    }

    return this.memoryMeetings.filter((m) => {
      if (m.faculty_id !== facultyId) return false;
      if (m.status !== MeetingStatus.SCHEDULED) return false;
      if (m.scheduled_date !== date) return false;
      if (excludeMeetingId && m.meeting_id === excludeMeetingId) return false;
      if (!m.scheduled_start_time || !m.scheduled_end_time) return false;

      // Overlap condition: startA < endB && endA > startB
      return m.scheduled_start_time < endTime && m.scheduled_end_time > startTime;
    });
  }

  async update(id: string, updates: Partial<MeetingEntity>): Promise<MeetingEntity | null> {
    const updatedAt = new Date().toISOString();

    if (this.isPostgres()) {
      const setClauses: string[] = ['updated_at = $' + 1];
      const params: any[] = [updatedAt];
      let paramIndex = 2;

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'meeting_id' || key === 'student_name' || key === 'faculty_name') continue;
        setClauses.push(`${key} = $${paramIndex}`);
        params.push(value === undefined ? null : value);
        paramIndex++;
      }

      params.push(id);
      const sql = `
        UPDATE meetings
        SET ${setClauses.join(', ')}
        WHERE meeting_id = $${paramIndex}
        RETURNING *
      `;
      const row = await this.postgres!.queryOne<MeetingEntity>(sql, params);
      return row ? this.enrich(row) : null;
    }

    const idx = this.memoryMeetings.findIndex((m) => m.meeting_id === id);
    if (idx === -1) return null;

    this.memoryMeetings[idx] = {
      ...this.memoryMeetings[idx],
      ...updates,
      updated_at: updatedAt,
    };
    return this.enrich(this.memoryMeetings[idx]);
  }

  async getFacultyList(): Promise<
    Array<{ user_id: string; first_name: string; last_name: string; designation?: string; department_name?: string }>
  > {
    if (this.isPostgres()) {
      const sql = `
        SELECT u.user_id, u.first_name, u.last_name, f.designation, d.department_name
        FROM users u
        LEFT JOIN faculty f ON f.user_id = u.user_id
        LEFT JOIN departments d ON d.department_id = f.department_id
        WHERE u.role = 'faculty'
        ORDER BY u.first_name ASC
      `;
      try {
        const rows = await this.postgres!.query<any>(sql);
        if (rows && rows.length > 0) return rows;
      } catch {
        // Fallback to memoryDb
      }
    }

    return this.memoryDb.faculty.map((f) => {
      const dept = this.memoryDb.departments.find((d) => d.department_id === f.department_id);
      return {
        user_id: f.user_id,
        first_name: f.first_name || '',
        last_name: f.last_name || '',
        designation: f.designation || 'Faculty',
        department_name: dept?.department_name || '',
      };
    });
  }

  async getStudentList(): Promise<
    Array<{ user_id: string; first_name: string; last_name: string; roll_number?: string; email?: string; department_name?: string }>
  > {
    if (this.isPostgres()) {
      const sql = `
        SELECT u.user_id, u.first_name, u.last_name, u.email, s.roll_number, d.department_name
        FROM users u
        LEFT JOIN students s ON s.user_id = u.user_id
        LEFT JOIN departments d ON d.department_id = s.department_id
        WHERE u.role = 'student'
        ORDER BY u.first_name ASC
      `;
      try {
        const rows = await this.postgres!.query<any>(sql);
        if (rows && rows.length > 0) return rows;
      } catch {
        // Fallback to memoryDb
      }
    }

    return this.memoryDb.students.map((s) => {
      const user = this.memoryDb.users.find((u) => u.user_id === s.user_id);
      const dept = this.memoryDb.departments.find((d) => d.department_id === s.department_id);
      return {
        user_id: s.user_id,
        first_name: s.first_name || user?.first_name || '',
        last_name: s.last_name || user?.last_name || '',
        roll_number: s.roll_number || s.user_id,
        email: user?.email || '',
        department_name: dept?.department_name || '',
      };
    });
  }
}
