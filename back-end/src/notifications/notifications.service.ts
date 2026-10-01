import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { AuthenticatedUser } from '../auth/jwt-payload';
import { summariseAttendance } from '../common/academic-rules';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { isDirector, isFinance, isHod, isPlatform } from '../core/roles';
import { fullName, newId, nowIso, today } from '../core/util';

export interface AppNotification {
  id: string;
  type: 'leave' | 'marks' | 'attendance' | 'discussion' | 'meeting' | 'announcement' | 'approval' | 'ticket' | 'fees' | 'booking';
  title: string;
  message: string;
  created_at: string | null;
  /** Client route the notification opens. */
  link: string | null;
  read: boolean;
}

export type AnnouncementAudience = 'all' | 'student' | 'faculty' | 'staff';
type Item = Omit<AppNotification, 'read'>;

const portalOf = (role: string) =>
  role === 'student' ? '/student' : role === 'faculty' ? '/faculty' : isHod(role) ? '/hod' : isDirector(role) ? '/director' : isFinance(role) ? '/finance' : role === 'spoc' ? '/spoc' : '/support';

/**
 * Notifications are derived from records that already exist, scoped to the
 * user's college, so nothing is invented and nothing drifts. Only "read"
 * state is stored (notification_reads).
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly db: InMemoryDbService) {}

  private userOf(claims: AuthenticatedUser) {
    return this.db.users.find((u) => u.user_id === claims.sub && (!claims.email || u.email === claims.email)) ?? this.db.users.find((u) => u.user_id === claims.sub);
  }

  listFor(claims: AuthenticatedUser): AppNotification[] {
    const user = this.userOf(claims);
    if (!user) return [];
    const role = user.role;
    const items: Item[] = [];
    if (role === 'student') items.push(...this.forStudent(user));
    if (role === 'faculty' || isHod(role)) items.push(...this.forTeacher(user));
    if (role === 'student' || role === 'faculty' || isHod(role)) items.push(...this.ownLeave(user), ...this.repliesToMyPosts(user));
    if (isHod(role)) items.push(...this.forHod(user));
    if (isDirector(role)) items.push(...this.forDirector(user));
    if (isFinance(role)) items.push(...this.forFinance(user));
    if (['spoc', 'FINANCE_ADMIN'].includes(role) || isHod(role) || isDirector(role)) items.push(...this.ticketUpdates(user));
    if (isPlatform(role)) items.push(...this.forSupport(user));
    if (user.college_id) items.push(...this.announcementsFor(user));

    const readIds = this.readIdsFor(user.user_id);
    return items
      .map((n) => ({ ...n, read: readIds.has(n.id) }))
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
      .slice(0, 60);
  }

  markRead(userId: string, ids: string[]) {
    const clean = [...new Set((ids || []).map(String))].slice(0, 200);
    let record: any = this.db.notification_reads.find((r) => r.user_id === userId);
    if (!record) {
      record = { user_id: userId, ids: [] };
      this.db.notification_reads.push(record);
    }
    record.ids = [...new Set([...(record.ids || []), ...clean])].slice(-1000);
    this.db.persist();
    return { success: true, read: clean.length };
  }

  // ── Announcements ─────────────────────────────────────────────────────────

  createAnnouncement(claims: AuthenticatedUser, body: { title: string; message: string; audience: AnnouncementAudience; course_section_id?: string }) {
    const user = this.userOf(claims);
    if (!user?.college_id) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'This account is not linked to an institute.'));
    let departmentId: string | null = null;
    let sectionId: string | null = null;
    let audience = body.audience;
    if (user.role === 'faculty') {
      // Faculty address the students of one of their sections.
      const cs = this.db.course_sections.find((s) => s.course_section_id === body.course_section_id && s.faculty_id === user.user_id);
      if (!cs) throw new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Choose one of your sections.'));
      sectionId = cs.course_section_id;
      audience = 'student';
    } else if (isHod(user.role)) {
      departmentId = user.department_id;
      if (!['all', 'student', 'faculty'].includes(audience)) audience = 'all';
    }
    const announcement = {
      announcement_id: newId('an'),
      college_id: user.college_id,
      audience,
      department_id: departmentId,
      course_section_id: sectionId,
      title: body.title.trim(),
      message: body.message.trim(),
      author_id: user.user_id,
      author_name: fullName(user),
      author_role: user.role,
      created_at: nowIso(),
    };
    this.db.announcements.push(announcement);
    return { success: true, data: announcement };
  }

  listAnnouncements(claims: AuthenticatedUser) {
    const user = this.userOf(claims);
    if (!user?.college_id) return [];
    return this.visibleAnnouncements(user)
      .map((a) => ({ ...a, section_label: a.course_section_id ? this.sectionLabel(a.course_section_id) : null }))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  /** Announcements the user wrote (for the "sent" list). */
  sentAnnouncements(claims: AuthenticatedUser) {
    return this.db.announcements
      .filter((a) => a.author_id === claims.sub)
      .map((a) => ({ ...a, section_label: a.course_section_id ? this.sectionLabel(a.course_section_id) : null }))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  private sectionLabel(id: string) {
    const cs = this.db.course_sections.find((s) => s.course_section_id === id);
    const c = cs ? this.db.courses.find((x) => x.course_id === cs.course_id) : null;
    return c ? `${c.course_code} section ${cs.section}` : null;
  }

  private visibleAnnouncements(user: any) {
    const role = user.role;
    const mySections = new Set(this.db.enrollment.filter((e) => e.student_id === user.user_id && e.status === 'active').map((e) => e.course_section_id));
    return this.db.announcements.filter((a) => {
      if (a.college_id !== user.college_id) return false;
      if (a.author_id === user.user_id) return false;
      if (a.course_section_id) return role === 'student' && mySections.has(a.course_section_id);
      if (a.department_id && a.department_id !== user.department_id && !isDirector(role)) return false;
      if (a.audience === 'all') return true;
      if (a.audience === 'student') return role === 'student';
      if (a.audience === 'faculty') return role === 'faculty' || isHod(role);
      if (a.audience === 'staff') return role !== 'student';
      return false;
    });
  }

  private announcementsFor(user: any): Item[] {
    return this.visibleAnnouncements(user).map((a) => ({
      id: `announcement:${a.announcement_id}`,
      type: 'announcement',
      title: a.title,
      message: `${a.message} — ${a.author_name}`,
      created_at: a.created_at,
      link: `${portalOf(user.role)}/announcements`,
    }));
  }

  // ── Sources ───────────────────────────────────────────────────────────────

  private forStudent(user: any): Item[] {
    const out: Item[] = [];
    const min = this.db.college_settings.find((s) => s.college_id === user.college_id)?.attendance_min_pct ?? 75;

    // Published marks, grouped per assessment.
    for (const m of this.db.marks_entry) {
      if (m.student_id !== user.user_id || !m.published) continue;
      const a = this.db.assessments.find((x) => x.assessment_id === m.assessment_id);
      out.push({ id: `marks:${m.entry_id}`, type: 'marks', title: 'Result published', message: `${a?.name || 'Assessment'} (${m.course_code}): ${m.marks_obtained}/${m.max_marks}, grade ${m.grade}.`, created_at: a?.published_at || m.updated_at || null, link: '/student/results' });
    }

    // Attendance shortage per course.
    for (const e of this.db.enrollment) {
      if (e.student_id !== user.user_id || e.status !== 'active') continue;
      const rows = this.db.attendance_log.filter((r) => r.enrollment_id === e.enrollment_id);
      if (!rows.length) continue;
      const stats = summariseAttendance(rows);
      if (stats.percentage >= min) continue;
      const course = this.db.courses.find((c) => c.course_id === e.course_id);
      out.push({ id: `attendance:${e.enrollment_id}:${stats.total}`, type: 'attendance', title: 'Attendance shortage', message: `${course?.course_code} attendance is ${stats.percentage}%, below the ${min}% requirement.`, created_at: `${rows.map((r) => r.date).sort().pop()}T18:00:00.000Z`, link: '/student/attendance' });
    }

    // Correction decisions.
    for (const r of this.db.attendance_requests) {
      if (r.student_id !== user.user_id || r.status === 'pending') continue;
      out.push({ id: `correction:${r.request_id}:${r.status}`, type: 'attendance', title: `Attendance correction ${r.status}`, message: `${r.course_code} on ${r.date}${r.decision_note ? `: ${r.decision_note}` : ''}.`, created_at: r.decided_at, link: '/student/attendance' });
    }

    // Meetings.
    for (const m of this.db.meetings) {
      if (m.student_id !== user.user_id || m.date < today()) continue;
      const f = this.db.users.find((u) => u.user_id === m.faculty_id);
      out.push({ id: `meeting:${m.meeting_id}`, type: 'meeting', title: 'Meeting scheduled', message: `${m.agenda} with ${fullName(f)} on ${m.date} at ${m.time}.`, created_at: m.created_at, link: '/student' });
    }

    // Fees due and receipts.
    for (const f of this.db.fees) {
      if (f.student_id !== user.user_id) continue;
      if (f.status !== 'paid') {
        const overdue = f.due_date < today();
        out.push({ id: `fee:${f.fee_id}:${f.status}:${f.reminders || 0}`, type: 'fees', title: overdue ? 'Fee overdue' : 'Fee due', message: `${f.fee_type}: ₹${(f.amount - (f.paid_amount || 0)).toLocaleString('en-IN')} ${overdue ? 'was' : 'is'} due on ${f.due_date}.`, created_at: f.reminded_at || f.created_at, link: '/student/fees' });
      }
    }
    for (const p of this.db.fee_payments) {
      if (p.student_id !== user.user_id) continue;
      out.push({ id: `receipt:${p.payment_id}`, type: 'fees', title: 'Payment received', message: `₹${p.amount.toLocaleString('en-IN')} received. Receipt ${p.receipt_no}.`, created_at: p.paid_at, link: '/student/fees' });
    }
    return out;
  }

  private forTeacher(user: any): Item[] {
    const out: Item[] = [];
    const base = portalOf(user.role);
    for (const r of this.db.attendance_requests) {
      if (r.faculty_id !== user.user_id || r.status !== 'pending') continue;
      out.push({ id: `correction-req:${r.request_id}`, type: 'approval', title: 'Attendance correction request', message: `${r.student_name} — ${r.course_code} on ${r.date}.`, created_at: r.created_at, link: `${base}/attendance` });
    }
    for (const m of this.db.meetings) {
      if (m.faculty_id !== user.user_id || m.date < today()) continue;
      const s = this.db.users.find((u) => u.user_id === m.student_id);
      out.push({ id: `meeting:${m.meeting_id}`, type: 'meeting', title: 'Upcoming meeting', message: `${m.agenda} with ${fullName(s)} on ${m.date} at ${m.time}.`, created_at: m.created_at, link: `${base}` });
    }
    for (const b of this.db.resource_bookings) {
      if (b.requested_by !== user.user_id || b.status === 'pending') continue;
      out.push({ id: `booking:${b.booking_id}:${b.status}`, type: 'booking', title: `Booking ${b.status}`, message: `${b.resource_name} on ${b.date} (${b.time_slot}).`, created_at: b.decided_at, link: `${base}/resources` });
    }
    return out;
  }

  private ownLeave(user: any): Item[] {
    return this.db.leave_applications
      .filter((l) => l.applicant_id === user.user_id && ['approved', 'rejected'].includes(l.status))
      .map((l) => ({ id: `leave:${l.leave_id}:${l.status}`, type: 'leave' as const, title: `Leave ${l.status}`, message: `Your ${l.leave_type} leave from ${l.start_date} to ${l.end_date} was ${l.status}${l.decision_note ? `: ${l.decision_note}` : ''}.`, created_at: l.decided_at, link: `${portalOf(user.role)}/leave` }));
  }

  private forHod(user: any): Item[] {
    const out: Item[] = [];
    for (const l of this.db.leave_applications) {
      if (l.college_id !== user.college_id || l.department_id !== user.department_id || l.status !== 'pending' || l.applicant_id === user.user_id || l.applicant_role === 'hod') continue;
      out.push({ id: `approve-leave:${l.leave_id}`, type: 'approval', title: 'Leave awaiting your approval', message: `${l.applicant_name} (${l.applicant_role}): ${l.leave_type}, ${l.start_date} to ${l.end_date}.`, created_at: `${l.applied_on}T09:00:00.000Z`, link: '/hod/approvals' });
    }
    for (const b of this.db.resource_bookings) {
      if (b.college_id !== user.college_id || b.department_id !== user.department_id || b.status !== 'pending' || b.requested_by === user.user_id) continue;
      out.push({ id: `approve-booking:${b.booking_id}`, type: 'approval', title: 'Booking awaiting approval', message: `${b.requester_name}: ${b.resource_name} on ${b.date} (${b.time_slot}).`, created_at: b.created_at, link: '/hod/approvals' });
    }
    return out;
  }

  private forDirector(user: any): Item[] {
    const out: Item[] = [];
    for (const l of this.db.leave_applications) {
      if (l.college_id !== user.college_id || l.status !== 'pending' || l.applicant_role !== 'hod') continue;
      out.push({ id: `approve-leave:${l.leave_id}`, type: 'approval', title: 'HOD leave awaiting approval', message: `${l.applicant_name}: ${l.leave_type}, ${l.start_date} to ${l.end_date}.`, created_at: `${l.applied_on}T09:00:00.000Z`, link: '/director/approvals' });
    }
    for (const b of this.db.resource_bookings) {
      if (b.college_id !== user.college_id || b.status !== 'pending') continue;
      out.push({ id: `approve-booking:${b.booking_id}`, type: 'approval', title: 'Booking awaiting approval', message: `${b.requester_name}: ${b.resource_name} on ${b.date}.`, created_at: b.created_at, link: '/director/approvals' });
    }
    return out;
  }

  private forFinance(user: any): Item[] {
    const overdue = this.db.fees.filter((f) => f.college_id === user.college_id && f.status !== 'paid' && f.due_date < today());
    if (!overdue.length) return [];
    const total = overdue.reduce((s, f) => s + f.amount - (f.paid_amount || 0), 0);
    return [{ id: `overdue:${today()}:${overdue.length}`, type: 'fees', title: `${overdue.length} fee(s) overdue`, message: `₹${total.toLocaleString('en-IN')} outstanding past the due date.`, created_at: `${today()}T03:30:00.000Z`, link: '/finance/dues' }];
  }

  private ticketUpdates(user: any): Item[] {
    const out: Item[] = [];
    const base = portalOf(user.role);
    for (const t of this.db.support_tickets) {
      if (t.college_id !== user.college_id || t.raised_by !== user.user_id) continue;
      for (const m of t.messages || []) {
        if (m.kind !== 'public' || m.author_id === user.user_id || !isPlatform(m.author_role)) continue;
        out.push({ id: `ticket-msg:${m.message_id}`, type: 'ticket', title: `Support replied: ${t.display_id}`, message: `${m.author_name}: ${m.text.slice(0, 140)}`, created_at: m.created_at, link: `${base}/support` });
      }
      if (t.status === 'resolved') out.push({ id: `ticket-resolved:${t.ticket_id}:${t.resolved_at}`, type: 'ticket', title: `Ticket resolved: ${t.display_id}`, message: `${t.subject}. You can reopen it within 7 days if the problem continues.`, created_at: t.resolved_at, link: `${base}/support` });
    }
    return out;
  }

  private forSupport(user: any): Item[] {
    const tier = user.tier_level ?? 1;
    return this.db.support_tickets
      .filter((t) => !['resolved', 'closed'].includes(t.status) && (t.assigned_to_id === user.user_id || (!t.assigned_to_id && t.tier === tier)))
      .map((t) => ({ id: `ticket:${t.ticket_id}:${t.assigned_to_id ?? 'none'}:${t.tier}`, type: 'ticket' as const, title: t.assigned_to_id === user.user_id ? 'Ticket assigned to you' : `Unassigned L${t.tier} ticket`, message: `${t.display_id}: ${t.subject}`, created_at: t.updated_at, link: '/support/queue' }));
  }

  private repliesToMyPosts(user: any): Item[] {
    const myPosts = new Map(this.db.discussion_posts.filter((p) => p.author_id === user.user_id).map((p) => [p.post_id, p]));
    return this.db.discussion_replies
      .filter((r) => myPosts.has(r.post_id) && r.author_id !== user.user_id)
      .map((r) => ({ id: `reply:${r.reply_id}`, type: 'discussion' as const, title: 'New reply to your discussion', message: `${r.author_name} replied to "${myPosts.get(r.post_id)?.title}".`, created_at: r.created_at, link: `${portalOf(user.role)}/discussions` }));
  }

  private readIdsFor(userId: string): Set<string> {
    const record: any = this.db.notification_reads.find((r) => r.user_id === userId);
    return new Set(record?.ids || []);
  }
}
