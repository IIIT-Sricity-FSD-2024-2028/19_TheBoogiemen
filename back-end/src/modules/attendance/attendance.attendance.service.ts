import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepository } from './attendance.attendance.repository';
import { NotificationService } from '../../common/services/notification.service';
import { AttendanceOutputDto } from './dto/attendance.output.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly notificationService: NotificationService
  ) {}

  async getSubjectWiseAttendance(studentId: string): Promise<AttendanceOutputDto[]> {
    const enrollments = this.attendanceRepo.enrollments.filter(e => e.student_id === studentId);
    if (!enrollments.length) throw new NotFoundException('No enrollments found for student');

    const result: AttendanceOutputDto[] = [];

    for (const enrol of enrollments) {
      const section = this.attendanceRepo.sections.find(s => s.section_id === enrol.section_id);
      if (!section) continue;

      const logs = this.attendanceRepo.logs.filter(l => l.enrollment_id === enrol.enrollment_id);
      const total_classes = logs.length;
      if (total_classes === 0) continue;

      const attended = logs.filter(l => l.status === 'PRESENT' || l.status === 'EXCUSED').length;
      const percentage = (attended / total_classes) * 100;
      const flagged = percentage < 75;

      if (flagged) {
        this.notificationService.notify(studentId, `Low attendance alert for course ${section.course_id}`);
        this.notificationService.notify(section.faculty_id, `Student ${studentId} has low attendance in ${section.course_id}`);
      }

      result.push({
        course_id: section.course_id,
        course_name: `Course ${section.course_id}`, // Mocked since joined course table isn't required here strictly
        total_classes,
        attended,
        percentage,
        flagged
      });
    }

    return result;
  }

  async getAllLogs() {
    return this.attendanceRepo.findAll();
  }

  async getLogById(id: string) {
    const log = await this.attendanceRepo.findOneById(id);
    if (!log) throw new NotFoundException('Attendance log not found');
    return log;
  }

  async createLog(dto: any) {
    return this.attendanceRepo.create({
      log_id: uuidv4(),
      enrollment_id: dto.enrollment_id,
      date: dto.date,
      timeslot: dto.timeslot || '09:00',
      status: dto.status
    });
  }

  async updateLog(id: string, dto: any) {
    const log = await this.attendanceRepo.findOneById(id);
    if (!log) throw new NotFoundException('Attendance log not found');
    
    return this.attendanceRepo.update(id, {
      enrollment_id: dto.enrollment_id || log.enrollment_id,
      date: dto.date || log.date,
      timeslot: dto.timeslot || log.timeslot,
      status: dto.status || 'PRESENT'
    });
  }

  async patchLog(id: string, dto: any) {
    const log = await this.attendanceRepo.findOneById(id);
    if (!log) throw new NotFoundException('Attendance log not found');
    
    return this.attendanceRepo.update(id, dto);
  }

  async deleteLog(id: string) {
    const log = await this.attendanceRepo.findOneById(id);
    if (!log) throw new NotFoundException('Attendance log not found');
    
    await this.attendanceRepo.delete(id);
  }
}
