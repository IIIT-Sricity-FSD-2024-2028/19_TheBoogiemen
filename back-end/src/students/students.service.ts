import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';

@Injectable()
export class StudentsService {
  constructor(private db: InMemoryDbService) {}

  async getProfile(userId: string) {
    const student = this.db.students.find((s) => s.user_id === userId);
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async getAttendance(userId: string) {
    const records = this.db.attendance_log.filter((a) => a.student_id === userId);

    // Group by course to create summary
    const courseStats: Record<string, any> = {};
    records.forEach(r => {
      if (!courseStats[r.course_id]) {
        const c = this.db.courses.find(course => course.course_id === r.course_id);
        courseStats[r.course_id] = {
          course_id: r.course_id,
          course_code: c?.course_code || r.course_id,
          course_name: c?.course_name || 'Unknown',
          present: 0,
          absent: 0,
          total: 0,
        };
      }
      courseStats[r.course_id].total++;
      if (r.status === 'present') courseStats[r.course_id].present++;
      else courseStats[r.course_id].absent++;
    });

    const summary = Object.values(courseStats).map((s: any) => ({
      ...s,
      percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    }));

    const totalPresent = records.filter(r => r.status === 'present').length;
    const totalAbsent = records.filter(r => r.status === 'absent').length;
    const overallPct = records.length > 0 ? Math.round((totalPresent / records.length) * 100) : 0;

    return { summary, records, totalPresent, totalAbsent, overallPct };
  }

  async getCourses(userId: string) {
    const enrollment = this.db.enrollment.filter((e) => e.student_id === userId);
    return enrollment.map(e => {
      const course = this.db.courses.find(c => c.course_id === e.course_id);
      return { ...course, enrollment_status: e.status, section: e.section };
    }).filter(Boolean);
  }

  async getMarks(userId: string) {
    return this.db.marks_entry
      .filter((m) => m.student_id === userId)
      .map(m => {
        const assessment = this.db.assessments.find(a => a.assessment_id === m.assessment_id);
        const course = assessment ? this.db.courses.find(c => c.course_id === assessment.course_id) : null;
        return { ...m, assessment_name: assessment?.name, course_name: course?.course_name, course_code: m.course_code };
      });
  }

  async getFees(userId: string) {
    return this.db.fees.filter(f => f.student_id === userId);
  }

  async getTimetable(userId: string) {
    const student = this.db.students.find(s => s.user_id === userId);
    const section = student?.section || 'A';
    const slots = this.db.timetable.filter(t => t.section === section);
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      acc[curr.day][curr.time] = curr;
      return acc;
    }, {});
    return {
      grid,
      section,
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    };
  }

  async enroll(studentId: string, courseId: string) {
    // Check if already enrolled
    const existing = this.db.enrollment.find(
      e => e.student_id === studentId && e.course_id === courseId
    );
    if (existing) {
      throw new BadRequestException('Already enrolled in this course');
    }

    // Verify course exists
    const course = this.db.courses.find(c => c.course_id === courseId);
    if (!course) throw new NotFoundException('Course not found');

    const id = `e${Date.now()}`;
    const student = this.db.students.find(s => s.user_id === studentId);
    const newEnrollment = {
      enrollment_id: id,
      student_id: studentId,
      course_id: courseId,
      year_id: '2025',
      status: 'active',
      section: student?.section || 'A',
    };
    this.db.enrollment.push(newEnrollment);
    return { success: true, enrollment: newEnrollment, course };
  }
}
