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
      if (!course) return null;

      // Marks for this course
      const courseAssessments = this.db.assessments.filter(a => a.course_id === e.course_id);
      const studentMarks = this.db.marks_entry.filter(m =>
        m.student_id === userId && courseAssessments.some(a => a.assessment_id === m.assessment_id)
      );
      const totalObtained = studentMarks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0);
      const totalMax = studentMarks.reduce((sum, m) => sum + (m.max_marks || 0), 0);
      const marks_percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;

      // Attendance for this course
      const attLogs = this.db.attendance_log.filter(a => a.student_id === userId && a.course_id === e.course_id);
      const present = attLogs.filter(a => a.status === 'present').length;
      const attendance_pct = attLogs.length > 0 ? Math.round((present / attLogs.length) * 100) : null;

      // Syllabus progress
      const syllabus = this.db.syllabus_progress.find(sp => sp.course_id === e.course_id && sp.section === e.section);

      return {
        ...course,
        enrollment_status: e.status,
        section: e.section,
        marks_percentage,
        attendance_pct,
        syllabus_progress: syllabus?.progress ?? null,
        modules: syllabus?.modules ?? [],
        assessments_count: courseAssessments.length,
        marks_obtained: totalObtained,
        marks_max: totalMax,
      };
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
    return this.db.fee_records.filter(f => f.student_id === userId);
  }

  async getLeaves(userId: string) {
    return this.db.leave_applications.filter(l => l.student_id === userId);
  }

  async applyLeave(userId: string, body: any) {
    const newLeave = {
      leave_id: `l${Date.now()}`,
      tenant_id: 't1',
      student_id: userId,
      student_name: 'Unknown',
      leave_type: body.leave_type || 'General',
      start_date: body.start_date,
      end_date: body.end_date,
      reason: body.reason,
      status: 'pending',
      applied_on: new Date().toISOString().split('T')[0]
    };
    this.db.leave_applications.push(newLeave);
    return newLeave;
  }

  async getProjects(userId: string) {
    return this.db.research_projects.filter(p => p.student_id === userId);
  }

  async getTimetable(userId: string) {
    const student = this.db.students.find(s => s.user_id === userId);
    const section = student?.section || 'A';

    // Filter timetable to student's section and enrolled courses
    const enrolled = this.db.enrollment.filter(e => e.student_id === userId).map(e => e.course_id);
    const slots = this.db.timetable.filter(t =>
      t.section === section && enrolled.includes(t.course_id)
    );

    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      // Support multiple slots per time slot (array)
      if (!acc[curr.day][curr.time]) {
        acc[curr.day][curr.time] = curr;
      } else {
        // If already a slot, convert to array
        if (!Array.isArray(acc[curr.day][curr.time])) {
          acc[curr.day][curr.time] = [acc[curr.day][curr.time]];
        }
        acc[curr.day][curr.time].push(curr);
      }
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
      tenant_id: student?.tenant_id || 't1',
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
