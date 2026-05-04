import { Injectable } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';

@Injectable()
export class FacultyService {
  constructor(private db: InMemoryDbService) {}

  async getProfile(userId: string) {
    const faculty = this.db.faculty.find(f => f.user_id === userId);
    if (!faculty) return { user_id: userId, first_name: 'Faculty', last_name: '', designation: 'Professor' };
    const dept = this.db.departments.find(d => d.department_id === faculty.department_id);
    return { ...faculty, department_name: dept?.department_name || 'Computer Science' };
  }

  async getMyCourses(userId: string) {
    return this.db.courses.filter(c => c.faculty_id === userId);
  }

  async getFacultyTimetable(userId: string) {
    const facultyCourseIds = this.db.courses.filter(c => c.faculty_id === userId).map(c => c.course_id);
    const slots = this.db.timetable.filter(t => facultyCourseIds.includes(t.course_id));
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      acc[curr.day][curr.time] = curr;
      return acc;
    }, {});
    return {
      grid,
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    };
  }

  async getMyStudents(facultyId: string) {
    const facultyCourseIds = this.db.courses.filter(c => c.faculty_id === facultyId).map(c => c.course_id);
    const studentIds = this.db.enrollment
      .filter(e => facultyCourseIds.includes(e.course_id))
      .map(e => e.student_id);

    const uniqueStudentIds = [...new Set(studentIds)];

    return this.db.students
      .filter(s => uniqueStudentIds.includes(s.user_id))
      .map(s => {
        const records = this.db.attendance_log.filter(a => a.student_id === s.user_id);
        const present = records.filter(r => r.status === 'present').length;
        const attendance_pct = records.length > 0 ? Math.round((present / records.length) * 100) : 85;
        const marks = this.db.marks_entry.filter(m => m.student_id === s.user_id);
        const avgScore = marks.length > 0
          ? Math.round(marks.reduce((sum, m) => sum + (m.marks_obtained / m.max_marks) * 100, 0) / marks.length)
          : 75;
        return {
          ...s,
          attendance_pct,
          avg_score: avgScore,
          is_at_risk: attendance_pct < 75 || s.cgpa < 6,
        };
      });
  }

  async getTodayAttendance(courseId: string) {
    const enrollment = this.db.enrollment.filter(e => e.course_id === courseId);
    const studentIds = enrollment.map(e => e.student_id);
    const today = new Date().toISOString().split('T')[0];
    const students = this.db.students
      .filter(s => studentIds.includes(s.user_id))
      .map(s => {
        const todayLog = this.db.attendance_log.find(
          a => a.student_id === s.user_id && a.course_id === courseId && a.date === today
        );
        return { ...s, today_status: todayLog?.status || 'present' };
      });
    return { students, date: today, course_id: courseId };
  }

  async recordAttendance(data: any) {
    const { course_id, date, records } = data;
    const newLogs = (records || []).map((r: any, idx: number) => {
      const logId = `al${this.db.attendance_log.length + idx + 1}`;
      const log = { log_id: logId, student_id: r.student_id, course_id, date, status: r.status };
      this.db.attendance_log.push(log as any);
      return log;
    });
    return { saved: newLogs.length, records: newLogs };
  }

  async postMarks(data: any) {
    const entryId = `m${Date.now()}`;
    const newEntry = { entry_id: entryId, ...data };
    this.db.marks_entry.push(newEntry as any);
    return newEntry;
  }

  async getAssessments(facultyId: string) {
    return this.db.assessments.filter(a => a.faculty_id === facultyId);
  }

  async getAtRiskStudents() {
    return this.db.students
      .filter(s => s.cgpa < 6)
      .map(s => {
        const records = this.db.attendance_log.filter(a => a.student_id === s.user_id);
        const present = records.filter(r => r.status === 'present').length;
        const attendance_pct = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
        return { ...s, attendance_pct, is_at_risk: true };
      });
  }
}
