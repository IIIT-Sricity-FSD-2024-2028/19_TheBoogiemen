import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRepository } from './leave.leave.repository';
import { NotificationService } from '../../common/services/notification.service';
import { ApplyLeaveInputDto } from './dto/apply-leave.input.dto';
import { LeaveOutputDto } from './dto/leave.output.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LeaveService {
  constructor(
    private readonly leaveRepo: LeaveRepository,
    private readonly notificationService: NotificationService
  ) {}

  async applyLeave(dto: ApplyLeaveInputDto): Promise<LeaveOutputDto> {
    const leave = await this.leaveRepo.createLeave({
      leave_id: uuidv4(),
      student_id: dto.student_id,
      start_date: dto.start_date,
      end_date: dto.end_date,
      reason: dto.reason,
      doc_ref: dto.doc_ref,
      status: 'PENDING'
    });
    return leave;
  }

  async approveLeave(leaveId: string, adminId: string): Promise<LeaveOutputDto> {
    const leave = await this.leaveRepo.getLeave(leaveId);
    if (!leave) throw new NotFoundException('Leave request not found');

    const enrollments = this.leaveRepo.enrollments.filter(e => e.student_id === leave.student_id);
    const enrolIds = enrollments.map(e => e.enrollment_id);

    const logs = this.leaveRepo.attendance_logs.filter(l => 
      enrolIds.includes(l.enrollment_id) && 
      new Date(l.date) >= new Date(leave.start_date) && 
      new Date(l.date) <= new Date(leave.end_date)
    );

    for (const log of logs) {
      log.status = 'EXCUSED';
    }

    const sectionIds = enrollments.map(e => e.section_id);
    const sections = this.leaveRepo.sections.filter(s => sectionIds.includes(s.section_id));

    for (const sec of sections) {
      this.notificationService.notify(sec.faculty_id, `Leave approved for student ${leave.student_id}`);
    }

    const updated = await this.leaveRepo.updateLeaveStatus(leaveId, 'APPROVED');
    return updated!;
  }
}
