import { Injectable, Optional } from '@nestjs/common';
import { InMemoryDbService } from '../../database/in-memory-db.service';
import { PostgresService } from '../../database/postgres/postgres.service';
import { getDataStore } from '../../config/database.config';
import { MeetingEntity } from './entities/meeting.entity';
import { MeetingStatus } from './enums/meeting-status.enum';
import { scopeToCollege, isSameCollege } from '../../common/tenancy/scope-to-college';

@Injectable()
export class MeetingRepository {
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
          meeting_id, student_id, faculty_id, college_id, purpose, description,
          requested_date, requested_start_time, requested_end_time,
          scheduled_date, scheduled_start_time, scheduled_end_time,
          status, reschedule_requested_by, proposed_date, proposed_start_time, proposed_end_time,
          reschedule_reason, meeting_type, meeting_platform, meeting_link, location,
          discussion_notes, outcome, action_items, faculty_remarks, completion_timestamp, denial_reason,
          meeting_history, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22,
          $23, $24, $25, $26, $27, $28,
          $29, $30, $31
        ) RETURNING *;
      `;
      const params = [
        data.meeting_id,
        data.student_id,
        data.faculty_id,
        data.college_id,
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
        data.completion_timestamp || null,
        data.denial_reason || null,
        JSON.stringify(data.meeting_history || []),
        data.created_at,
        data.updated_at,
      ];
      const rows = await this.postgres!.query<MeetingEntity>(sql, params);
      return this.enrich(rows[0]);
    }

    // In-memory mode with persistent storage
    const copy: MeetingEntity = {
      ...data,
      meeting_history: data.meeting_history ? [...data.meeting_history] : [],
    };
    this.memoryDb.meetings.push(copy as any);
    this.memoryDb.persist();
    return this.enrich(copy);
  }

  async findById(id: string, collegeId: string | null = null): Promise<MeetingEntity | null> {
    if (this.isPostgres()) {
      let sql = 'SELECT * FROM meetings WHERE meeting_id = $1';
      const params: any[] = [id];
      if (collegeId !== null) {
        sql += ' AND college_id = $2';
        params.push(collegeId);
      }
      const rows = await this.postgres!.query<MeetingEntity>(sql, params);
      return rows.length > 0 ? this.enrich(rows[0]) : null;
    }

    const meeting = (this.memoryDb.meetings as any[]).find(
      (m) => m.meeting_id === id && isSameCollege(m, collegeId),
    );
    return meeting ? this.enrich({ ...meeting }) : null;
  }

  async findByStudentId(studentId: string, collegeId: string | null = null): Promise<MeetingEntity[]> {
    if (this.isPostgres()) {
      let sql = 'SELECT * FROM meetings WHERE student_id = $1';
      const params: any[] = [studentId];
      if (collegeId !== null) {
        sql += ' AND college_id = $2';
        params.push(collegeId);
      }
      sql += ' ORDER BY created_at DESC';
      const rows = await this.postgres!.query<MeetingEntity>(sql, params);
      return rows.map((r) => this.enrich(r));
    }

    const scoped = scopeToCollege(this.memoryDb.meetings as any[], collegeId);
    return scoped
      .filter((m) => m.student_id === studentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((m) => this.enrich({ ...m }));
  }

  async findByFacultyId(facultyId: string, collegeId: string | null = null): Promise<MeetingEntity[]> {
    if (this.isPostgres()) {
      let sql = 'SELECT * FROM meetings WHERE faculty_id = $1';
      const params: any[] = [facultyId];
      if (collegeId !== null) {
        sql += ' AND college_id = $2';
        params.push(collegeId);
      }
      sql += ' ORDER BY created_at DESC';
      const rows = await this.postgres!.query<MeetingEntity>(sql, params);
      return rows.map((r) => this.enrich(r));
    }

    const scoped = scopeToCollege(this.memoryDb.meetings as any[], collegeId);
    return scoped
      .filter((m) => m.faculty_id === facultyId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((m) => this.enrich({ ...m }));
  }

  async findFacultyRequests(facultyId: string, collegeId: string | null = null): Promise<MeetingEntity[]> {
    if (this.isPostgres()) {
      let sql = "SELECT * FROM meetings WHERE faculty_id = $1 AND status = 'PENDING'";
      const params: any[] = [facultyId];
      if (collegeId !== null) {
        sql += ' AND college_id = $2';
        params.push(collegeId);
      }
      sql += ' ORDER BY requested_date ASC, requested_start_time ASC';
      const rows = await this.postgres!.query<MeetingEntity>(sql, params);
      return rows.map((r) => this.enrich(r));
    }

    const scoped = scopeToCollege(this.memoryDb.meetings as any[], collegeId);
    return scoped
      .filter((m) => m.faculty_id === facultyId && m.status === MeetingStatus.PENDING)
      .sort((a, b) => {
        const d = (a.requested_date || '').localeCompare(b.requested_date || '');
        return d !== 0 ? d : (a.requested_start_time || '').localeCompare(b.requested_start_time || '');
      })
      .map((m) => this.enrich({ ...m }));
  }

  async findOverlappingScheduled(
    facultyId: string,
    date: string,
    startTime: string,
    endTime: string,
    collegeId: string | null = null,
    excludeMeetingId?: string,
  ): Promise<MeetingEntity[]> {
    if (this.isPostgres()) {
      let sql = `
        SELECT * FROM meetings
        WHERE faculty_id = $1
          AND status = 'SCHEDULED'
          AND scheduled_date = $2
          AND scheduled_start_time < $4
          AND scheduled_end_time > $3
      `;
      const params: any[] = [facultyId, date, startTime, endTime];
      if (excludeMeetingId) {
        sql += ` AND meeting_id <> $${params.length + 1}`;
        params.push(excludeMeetingId);
      }
      if (collegeId !== null) {
        sql += ` AND college_id = $${params.length + 1}`;
        params.push(collegeId);
      }
      const rows = await this.postgres!.query<MeetingEntity>(sql, params);
      return rows.map((r) => this.enrich(r));
    }

    const scoped = scopeToCollege(this.memoryDb.meetings as any[], collegeId);
    return scoped
      .filter((m) => {
        if (m.faculty_id !== facultyId) return false;
        if (m.status !== MeetingStatus.SCHEDULED) return false;
        if (m.scheduled_date !== date) return false;
        if (excludeMeetingId && m.meeting_id === excludeMeetingId) return false;

        const existingStart = m.scheduled_start_time;
        const existingEnd = m.scheduled_end_time;
        if (!existingStart || !existingEnd) return false;

        // Interval overlap: startTime < existingEnd && endTime > existingStart
        return startTime < existingEnd && endTime > existingStart;
      })
      .map((m) => this.enrich({ ...m }));
  }

  async update(id: string, updates: Partial<MeetingEntity>, collegeId: string | null = null): Promise<MeetingEntity> {
    const now = new Date().toISOString();

    if (this.isPostgres()) {
      const keys = Object.keys(updates).filter((k) => k !== 'meeting_id');
      const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = keys.map((k) => {
        const v = (updates as any)[k];
        if (k === 'meeting_history' && v) {
          return JSON.stringify(v);
        }
        return v;
      });

      let sql = `UPDATE meetings SET ${setClauses}, updated_at = '${now}' WHERE meeting_id = $1`;
      const params = [id, ...values];
      if (collegeId !== null) {
        sql += ` AND college_id = $${params.length + 1}`;
        params.push(collegeId);
      }
      sql += ' RETURNING *;';
      const rows = await this.postgres!.query<MeetingEntity>(sql, params);
      return this.enrich(rows[0]);
    }

    const list = this.memoryDb.meetings as any[];
    const idx = list.findIndex((m) => m.meeting_id === id && isSameCollege(m, collegeId));
    if (idx === -1) {
      throw new Error(`Meeting with id "${id}" not found`);
    }

    const existing = list[idx];
    const updated = {
      ...existing,
      ...updates,
      updated_at: now,
    };
    list[idx] = updated;
    this.memoryDb.persist();
    return this.enrich({ ...updated });
  }

  async getAll(collegeId: string | null = null): Promise<MeetingEntity[]> {
    if (this.isPostgres()) {
      let sql = 'SELECT * FROM meetings';
      const params: any[] = [];
      if (collegeId !== null) {
        sql += ' WHERE college_id = $1';
        params.push(collegeId);
      }
      sql += ' ORDER BY created_at DESC';
      const rows = await this.postgres!.query<MeetingEntity>(sql, params);
      return rows.map((r) => this.enrich(r));
    }

    const scoped = scopeToCollege(this.memoryDb.meetings as any[], collegeId);
    return scoped
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((m) => this.enrich({ ...m }));
  }

  async getFacultyList(collegeId: string | null = null): Promise<Array<{ user_id: string; name: string; department?: string; email?: string }>> {
    const scopedFaculty = scopeToCollege(this.memoryDb.faculty as any[], collegeId);
    const scopedUsers = scopeToCollege(this.memoryDb.users as any[], collegeId);

    const facultyMap = new Map<string, { user_id: string; name: string; department?: string; email?: string }>();

    for (const f of scopedFaculty) {
      const u = scopedUsers.find((user) => user.user_id === f.user_id);
      const name = `${f.first_name || ''} ${f.last_name || ''}`.trim() || u?.username || 'Faculty Member';
      facultyMap.set(f.user_id, {
        user_id: f.user_id,
        name,
        department: f.department_id || f.department || '',
        email: u?.email || f.email || '',
      });
    }

    for (const u of scopedUsers) {
      if (u.role === 'faculty' && !facultyMap.has(u.user_id)) {
        facultyMap.set(u.user_id, {
          user_id: u.user_id,
          name: `${u.first_name || u.username || 'Faculty'} ${u.last_name || ''}`.trim(),
          email: u.email || '',
        });
      }
    }

    return Array.from(facultyMap.values());
  }

  async getStudentList(collegeId: string | null = null): Promise<Array<{ user_id: string; name: string; roll_number?: string; email?: string; department?: string }>> {
    const scopedStudents = scopeToCollege(this.memoryDb.students as any[], collegeId);
    const scopedUsers = scopeToCollege(this.memoryDb.users as any[], collegeId);

    const studentMap = new Map<string, { user_id: string; name: string; roll_number?: string; email?: string; department?: string }>();

    for (const s of scopedStudents) {
      const u = scopedUsers.find((user) => user.user_id === s.user_id);
      const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || u?.username || 'Student';
      studentMap.set(s.user_id, {
        user_id: s.user_id,
        name,
        roll_number: s.roll_number || s.student_id || '',
        email: u?.email || s.email || '',
        department: s.department_id || s.department || '',
      });
    }

    for (const u of scopedUsers) {
      if (u.role === 'student' && !studentMap.has(u.user_id)) {
        studentMap.set(u.user_id, {
          user_id: u.user_id,
          name: `${u.first_name || u.username || 'Student'} ${u.last_name || ''}`.trim(),
          email: u.email || '',
        });
      }
    }

    return Array.from(studentMap.values());
  }
}
