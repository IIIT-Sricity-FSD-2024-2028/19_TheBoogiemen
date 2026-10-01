import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { eachDateInRange, MAX_LEAVE_DAYS, normalizeLeaveType } from '../common/academic-rules';
import { CampusScope, findInCollege, inCollege } from '../core/scope';
import { HOD_ROLES, isDirector, isHod } from '../core/roles';
import { fullName, newId, nowIso, today } from '../core/util';

const bad = (msg: string) => new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, msg));

/**
 * Leave for students and faculty. The HOD of the applicant's department
 * decides every request; an HOD's own leave goes to the director.
 * Approving a student's leave marks their classes in that window as excused;
 * cancelling or rejecting afterwards restores what was there before.
 */
@Injectable()
export class LeaveService {
  constructor(private readonly db: InMemoryDbService) {}

  list(scope: CampusScope, q: { status?: string; scope?: string }) {
    let rows = inCollege(scope, this.db.leave_applications);
    const mine = rows.filter((l) => l.applicant_id === scope.userId);
    if (scope.role === 'student' || scope.role === 'faculty') rows = mine;
    else if (isHod(scope.role)) rows = q.scope === 'mine' ? mine : rows.filter((l) => (l.department_id === scope.departmentId && l.applicant_id !== scope.userId) || l.applicant_id === scope.userId);
    else if (isDirector(scope.role)) rows = q.scope === 'mine' ? mine : rows;
    else throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Not allowed.'));
    if (q.status) rows = rows.filter((l) => l.status === q.status);
    return rows
      .map((l) => ({ ...l, roll_no: l.applicant_role === 'student' ? this.db.students.find((s) => s.user_id === l.applicant_id)?.roll_no : null, decided_by_name: l.decided_by ? fullName(this.db.users.find((u) => u.user_id === l.decided_by)) : null, days: eachDateInRange(l.start_date, l.end_date).length }))
      .sort((a, b) => String(b.applied_on).localeCompare(String(a.applied_on)));
  }

  apply(scope: CampusScope, body: { leave_type: string; start_date: string; end_date: string; reason: string }) {
    if (!['student', 'faculty', ...HOD_ROLES].includes(scope.role)) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Only students and faculty apply for leave here.'));
    if (!body.leave_type || !body.start_date || !body.end_date || !String(body.reason || '').trim()) throw bad('Leave type, start date, end date and reason are required.');
    if (Number.isNaN(Date.parse(body.start_date)) || Number.isNaN(Date.parse(body.end_date))) throw bad('Choose valid dates.');
    if (body.end_date < body.start_date) throw bad('End date cannot be before start date.');
    const days = Math.round((Date.parse(body.end_date) - Date.parse(body.start_date)) / 86400000) + 1;
    if (days > MAX_LEAVE_DAYS) throw bad(`A single leave request can cover at most ${MAX_LEAVE_DAYS} days.`);
    const overlap = this.db.leave_applications.find((l) => l.applicant_id === scope.userId && ['pending', 'approved'].includes(l.status) && !(l.end_date < body.start_date || l.start_date > body.end_date));
    if (overlap) throw bad(`This overlaps your ${overlap.status} leave from ${overlap.start_date} to ${overlap.end_date}.`);
    const row = {
      leave_id: newId('lv'), college_id: scope.collegeId, department_id: scope.departmentId, applicant_id: scope.userId,
      applicant_role: scope.role === 'student' ? 'student' : isHod(scope.role) ? 'hod' : 'faculty', applicant_name: fullName(scope.user),
      student_id: scope.role === 'student' ? scope.userId : null, leave_type: normalizeLeaveType(body.leave_type),
      start_date: body.start_date, end_date: body.end_date, reason: String(body.reason).trim().slice(0, 500), status: 'pending',
      applied_on: today(), decided_by: null, decided_at: null, decision_note: null,
    };
    this.db.leave_applications.push(row);
    return row;
  }

  cancel(scope: CampusScope, id: string) {
    const l = findInCollege(scope, this.db.leave_applications, (x) => x.leave_id === id, 'Leave application');
    if (l.applicant_id !== scope.userId) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'You can only cancel your own leave.'));
    if (l.status !== 'pending') throw bad('Only pending requests can be cancelled.');
    l.status = 'cancelled';
    l.decided_at = nowIso();
    this.db.persist();
    return l;
  }

  decide(scope: CampusScope, id: string, body: { decision: 'approve' | 'reject'; note?: string }) {
    const l = findInCollege(scope, this.db.leave_applications, (x) => x.leave_id === id, 'Leave application');
    if (l.applicant_id === scope.userId) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'You cannot decide your own leave.'));
    const hodDecides = isHod(scope.role) && l.department_id === scope.departmentId && l.applicant_role !== 'hod';
    const directorDecides = isDirector(scope.role) && (l.applicant_role === 'hod' || !this.departmentHasHod(l.department_id));
    if (!hodDecides && !directorDecides) {
      throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, l.applicant_role === 'hod' ? 'The director decides HOD leave.' : "Leave is decided by the applicant's HOD."));
    }
    if (!['approve', 'reject'].includes(body?.decision)) throw bad('Decision must be approve or reject.');
    if (l.status !== 'pending') throw bad('This request has already been decided.');
    if (body.decision === 'reject' && !String(body.note || '').trim()) throw bad('Give a reason when rejecting.');
    l.status = body.decision === 'approve' ? 'approved' : 'rejected';
    l.decided_by = scope.userId;
    l.decided_at = nowIso();
    l.decision_note = String(body.note || '').trim() || null;
    if (l.status === 'approved' && l.applicant_role === 'student') l.attendance_sync = this.excuse(l);
    this.db.persist();
    return l;
  }

  private departmentHasHod(departmentId: string | null) {
    return this.db.users.some((u) => u.department_id === departmentId && isHod(u.role) && u.status !== 'inactive');
  }

  /** Marks the student's absences (and unmarked classes already held) in the window as excused. */
  private excuse(l: any) {
    const dates = new Set(eachDateInRange(l.start_date, l.end_date));
    let converted = 0;
    for (const a of this.db.attendance_log) {
      if (a.student_id !== l.applicant_id || !dates.has(a.date)) continue;
      if (a.status === 'absent') {
        a.previous_status = 'absent';
        a.status = 'excused';
        a.source = 'leave';
        a.leave_id = l.leave_id;
        converted++;
      }
    }
    return { converted, at: nowIso() };
  }
}
