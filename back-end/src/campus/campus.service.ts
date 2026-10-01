import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { CampusScope, findInCollege, inCollege } from '../core/scope';
import { isDirector, isHod } from '../core/roles';
import { fullName, newId, nowIso, today } from '../core/util';

const bad = (msg: string) => new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, msg));
const forbid = (msg: string) => new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, msg));
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable()
export class CampusService {
  constructor(private readonly db: InMemoryDbService) {}

  // ── Events ────────────────────────────────────────────────────────────────

  events(scope: CampusScope) {
    return inCollege(scope, this.db.events)
      .filter((e) => !e.department_id || e.department_id === scope.departmentId || isDirector(scope.role) || scope.role === 'spoc')
      .map((e) => ({ ...e, department_code: e.department_id ? this.db.departments.find((d) => d.department_id === e.department_id)?.department_code : null, created_by_name: fullName(this.db.users.find((u) => u.user_id === e.created_by)), upcoming: e.date >= today() }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  private checkEvent(body: any) {
    if (!String(body.title || '').trim()) throw bad('Title is required.');
    if (!body.date || Number.isNaN(Date.parse(body.date))) throw bad('Choose a valid date.');
    if (body.time && !TIME.test(body.time)) throw bad('Time must be HH:MM.');
    if (!String(body.venue || '').trim()) throw bad('Venue is required.');
  }

  createEvent(scope: CampusScope, body: any) {
    this.checkEvent(body);
    const row = { event_id: newId('ev'), college_id: scope.collegeId, department_id: isHod(scope.role) ? scope.departmentId : body.department_id || null, title: String(body.title).trim().slice(0, 120), date: body.date, time: body.time || null, venue: String(body.venue).trim().slice(0, 120), description: String(body.description || '').trim().slice(0, 1000), created_by: scope.userId, created_at: nowIso() };
    this.db.events.push(row);
    return row;
  }

  private ownEvent(scope: CampusScope, id: string) {
    const e = findInCollege(scope, this.db.events, (x) => x.event_id === id, 'Event');
    if (!isDirector(scope.role) && e.created_by !== scope.userId) throw forbid('You can only change events you created.');
    return e;
  }

  updateEvent(scope: CampusScope, id: string, body: any) {
    const e = this.ownEvent(scope, id);
    this.checkEvent({ ...e, ...body });
    for (const k of ['title', 'date', 'time', 'venue', 'description']) if (body[k] !== undefined) e[k] = body[k];
    this.db.persist();
    return e;
  }

  deleteEvent(scope: CampusScope, id: string) {
    const e = this.ownEvent(scope, id);
    this.db.events.splice(this.db.events.indexOf(e), 1);
    return { success: true };
  }

  // ── Resources and bookings ────────────────────────────────────────────────

  resources(scope: CampusScope) {
    return inCollege(scope, this.db.resources).map((r) => ({ ...r, upcoming_bookings: this.db.resource_bookings.filter((b) => b.resource_id === r.resource_id && b.status === 'approved' && b.date >= today()).length }));
  }

  createResource(scope: CampusScope, body: any) {
    if (!String(body.name || '').trim()) throw bad('Name is required.');
    if (!['hall', 'lab', 'room', 'equipment'].includes(body.type)) throw bad('Type must be hall, lab, room or equipment.');
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) throw bad('Capacity must be a positive whole number.');
    const row = { resource_id: newId('res'), college_id: scope.collegeId, name: String(body.name).trim().slice(0, 80), type: body.type, capacity, location: String(body.location || '').trim() || null, status: 'available' };
    this.db.resources.push(row);
    return row;
  }

  updateResource(scope: CampusScope, id: string, body: any) {
    const r = findInCollege(scope, this.db.resources, (x) => x.resource_id === id, 'Resource');
    if (body.status !== undefined) {
      if (!['available', 'maintenance'].includes(body.status)) throw bad('Status must be available or maintenance.');
      r.status = body.status;
    }
    if (body.name !== undefined && String(body.name).trim()) r.name = String(body.name).trim();
    if (body.location !== undefined) r.location = String(body.location).trim() || null;
    this.db.persist();
    return r;
  }

  bookings(scope: CampusScope, q: { status?: string }) {
    let rows = inCollege(scope, this.db.resource_bookings);
    if (scope.role === 'faculty') rows = rows.filter((b) => b.requested_by === scope.userId);
    else if (isHod(scope.role)) rows = rows.filter((b) => b.department_id === scope.departmentId || b.requested_by === scope.userId);
    if (q.status) rows = rows.filter((b) => b.status === q.status);
    return rows.map((b) => ({ ...b, decided_by_name: b.decided_by ? fullName(this.db.users.find((u) => u.user_id === b.decided_by)) : null })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  requestBooking(scope: CampusScope, body: any) {
    const r = findInCollege(scope, this.db.resources, (x) => x.resource_id === body.resource_id, 'Resource');
    if (r.status !== 'available') throw bad('This resource is under maintenance.');
    if (!body.date || body.date < today()) throw bad('Choose today or a future date.');
    if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(String(body.time_slot || ''))) throw bad('Time slot must look like 14:00-16:00.');
    const [from, to] = body.time_slot.split('-');
    if (to <= from) throw bad('The slot must end after it starts.');
    if (!String(body.purpose || '').trim()) throw bad('Purpose is required.');
    const clash = this.db.resource_bookings.find((b) => b.resource_id === r.resource_id && b.date === body.date && b.status === 'approved' && !(b.time_slot.split('-')[1] <= from || b.time_slot.split('-')[0] >= to));
    if (clash) throw bad(`Already booked ${clash.time_slot} on that date.`);
    const row = { booking_id: newId('bk'), college_id: scope.collegeId, resource_id: r.resource_id, resource_name: r.name, requested_by: scope.userId, requester_name: fullName(scope.user), department_id: scope.departmentId, date: body.date, time_slot: body.time_slot, purpose: String(body.purpose).trim().slice(0, 200), status: 'pending', decided_by: null, created_at: nowIso() };
    this.db.resource_bookings.push(row);
    return row;
  }

  decideBooking(scope: CampusScope, id: string, body: { decision: string; note?: string }) {
    const b = findInCollege(scope, this.db.resource_bookings, (x) => x.booking_id === id, 'Booking');
    const can = isDirector(scope.role) || (isHod(scope.role) && b.department_id === scope.departmentId && b.requested_by !== scope.userId);
    if (!can) throw forbid('Bookings are approved by the department HOD or the director.');
    if (b.status !== 'pending') throw bad('This booking has already been decided.');
    if (!['approve', 'reject'].includes(body?.decision)) throw bad('Decision must be approve or reject.');
    if (body.decision === 'approve') {
      const [from, to] = b.time_slot.split('-');
      const clash = this.db.resource_bookings.find((x) => x !== b && x.resource_id === b.resource_id && x.date === b.date && x.status === 'approved' && !(x.time_slot.split('-')[1] <= from || x.time_slot.split('-')[0] >= to));
      if (clash) throw bad(`Clashes with an approved booking (${clash.time_slot}).`);
    }
    b.status = body.decision === 'approve' ? 'approved' : 'rejected';
    b.decided_by = scope.userId;
    b.decided_at = nowIso();
    b.decision_note = String(body.note || '').trim() || null;
    this.db.persist();
    return b;
  }

  // ── Discussions ───────────────────────────────────────────────────────────

  private visibleCourseIds(scope: CampusScope): Set<string> | null {
    if (scope.role === 'student') return new Set(this.db.enrollment.filter((e) => e.student_id === scope.userId && e.status === 'active').map((e) => e.course_id));
    if (scope.role === 'faculty') return new Set(this.db.course_sections.filter((s) => s.faculty_id === scope.userId).map((s) => s.course_id));
    if (isHod(scope.role)) return new Set(inCollege(scope, this.db.courses).filter((c) => c.department_id === scope.departmentId).map((c) => c.course_id));
    return null;
  }

  discussions(scope: CampusScope) {
    const courses = this.visibleCourseIds(scope);
    return inCollege(scope, this.db.discussion_posts)
      .filter((p) => !p.course_id || !courses || courses.has(p.course_id))
      .map((p) => ({ ...p, course_code: p.course_id ? this.db.courses.find((c) => c.course_id === p.course_id)?.course_code : null, reply_count: this.db.discussion_replies.filter((r) => r.post_id === p.post_id).length }))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  discussion(scope: CampusScope, id: string) {
    const p = findInCollege(scope, this.db.discussion_posts, (x) => x.post_id === id, 'Discussion');
    const courses = this.visibleCourseIds(scope);
    if (p.course_id && courses && !courses.has(p.course_id)) throw forbid('This discussion belongs to a course you are not part of.');
    return { ...p, replies: this.db.discussion_replies.filter((r) => r.post_id === p.post_id).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))) };
  }

  createPost(scope: CampusScope, body: any) {
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    if (!title || !content) throw bad('Title and message are required.');
    const courses = this.visibleCourseIds(scope);
    if (body.course_id && courses && !courses.has(body.course_id)) throw bad('Choose one of your courses.');
    const tag = ['general', 'help', 'announcement'].includes(body.tag) ? body.tag : 'general';
    if (tag === 'announcement' && scope.role === 'student') throw forbid('Only staff can post announcements.');
    const row = { post_id: newId('post'), college_id: scope.collegeId, course_id: body.course_id || null, department_id: scope.departmentId, author_id: scope.userId, author_name: fullName(scope.user), author_role: scope.role, title: title.slice(0, 150), content: content.slice(0, 4000), tag, created_at: nowIso(), reply_count: 0 };
    this.db.discussion_posts.push(row);
    return row;
  }

  reply(scope: CampusScope, id: string, body: any) {
    const post = this.discussion(scope, id);
    const content = String(body.content || '').trim();
    if (!content) throw bad('Write a reply.');
    const row = { reply_id: newId('rep'), post_id: post.post_id, college_id: scope.collegeId, author_id: scope.userId, author_name: fullName(scope.user), author_role: scope.role, content: content.slice(0, 4000), created_at: nowIso() };
    this.db.discussion_replies.push(row);
    return row;
  }

  // ── Research ──────────────────────────────────────────────────────────────

  research(scope: CampusScope) {
    let rows = inCollege(scope, this.db.research_projects);
    if (scope.role === 'student') rows = rows.filter((p) => p.students.some((s: any) => s.user_id === scope.userId));
    else if (scope.role === 'faculty') rows = rows.filter((p) => p.supervisor_id === scope.userId);
    else if (isHod(scope.role)) rows = rows.filter((p) => p.department_id === scope.departmentId || p.supervisor_id === scope.userId);
    return rows.map((p) => ({ ...p, supervisor_name: fullName(this.db.users.find((u) => u.user_id === p.supervisor_id)), students: p.students.map((s: any) => { const st = this.db.students.find((x) => x.user_id === s.user_id); return { user_id: s.user_id, first_name: st?.first_name, last_name: st?.last_name, roll_no: st?.roll_no }; }) }));
  }

  createProject(scope: CampusScope, body: any) {
    const title = String(body.title || '').trim();
    if (!title) throw bad('Title is required.');
    if (!Array.isArray(body.student_ids) || !body.student_ids.length || body.student_ids.length > 4) throw bad('Choose 1 to 4 students.');
    for (const sid of body.student_ids) {
      const st = this.db.students.find((s) => s.user_id === sid && s.college_id === scope.collegeId);
      if (!st) throw bad('A chosen student was not found.');
    }
    const row = { project_id: newId('rp'), college_id: scope.collegeId, department_id: scope.departmentId, title: title.slice(0, 150), abstract: String(body.abstract || '').trim().slice(0, 2000), supervisor_id: scope.userId, supervisor_name: fullName(scope.user), students: body.student_ids.map((user_id: string) => ({ user_id })), status: 'active', progress: 0, milestones: [], submission_notes: null, faculty_feedback: null, uploads: [], created_at: nowIso() };
    this.db.research_projects.push(row);
    return row;
  }

  private project(scope: CampusScope, id: string) {
    return findInCollege(scope, this.db.research_projects, (x) => x.project_id === id, 'Project');
  }

  /** Students send updates; the supervisor sets progress, feedback and status. */
  updateProject(scope: CampusScope, id: string, body: any) {
    const p = this.project(scope, id);
    if (scope.role === 'student') {
      if (!p.students.some((s: any) => s.user_id === scope.userId)) throw forbid('You are not a member of this project.');
      const notes = String(body.submission_notes || '').trim();
      if (!notes) throw bad('Describe your progress update.');
      p.submission_notes = notes.slice(0, 2000);
      p.submitted_at = nowIso();
      if (body.file_id) {
        const up = this.db.uploads.find((u) => u.file_id === body.file_id && u.uploaded_by === scope.userId);
        if (!up) throw bad('Attach a file you uploaded.');
        p.uploads = [...(p.uploads || []), { file_id: up.file_id, original_name: up.original_name, uploaded_at: nowIso() }];
      }
    } else {
      if (p.supervisor_id !== scope.userId) throw forbid('Only the supervisor can update this project.');
      if (body.progress !== undefined) {
        const n = Number(body.progress);
        if (!Number.isFinite(n) || n < 0 || n > 100) throw bad('Progress must be 0 to 100.');
        p.progress = Math.round(n);
      }
      if (body.faculty_feedback !== undefined) p.faculty_feedback = String(body.faculty_feedback).trim().slice(0, 2000) || null;
      if (body.status !== undefined) {
        if (!['active', 'completed', 'on_hold'].includes(body.status)) throw bad('Status must be active, completed or on_hold.');
        p.status = body.status;
      }
      if (Array.isArray(body.milestones)) {
        p.milestones = body.milestones.map((m: any) => {
          if (!String(m.title || '').trim()) throw bad('Every milestone needs a title.');
          if (!['pending', 'in-progress', 'completed'].includes(m.status)) throw bad('Milestone status must be pending, in-progress or completed.');
          return { milestone_id: m.milestone_id || newId('ms'), title: String(m.title).trim(), due_date: m.due_date || null, status: m.status };
        });
      }
    }
    p.updated_at = nowIso();
    this.db.persist();
    return this.research(scope).find((x) => x.project_id === p.project_id) ?? p;
  }

  // ── Meetings ──────────────────────────────────────────────────────────────

  meetings(scope: CampusScope) {
    const rows = inCollege(scope, this.db.meetings).filter((m) => m.student_id === scope.userId || m.faculty_id === scope.userId);
    return rows.map((m) => ({ ...m, faculty_name: fullName(this.db.users.find((u) => u.user_id === m.faculty_id)), student_name: fullName(this.db.users.find((u) => u.user_id === m.student_id)), upcoming: m.date >= today() })).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  createMeeting(scope: CampusScope, body: any) {
    const teaches = new Set(this.db.course_sections.filter((s) => s.faculty_id === scope.userId).map((s) => s.course_section_id));
    const inMySection = this.db.enrollment.some((e) => e.student_id === body.student_id && e.status === 'active' && teaches.has(e.course_section_id));
    const supervises = this.db.research_projects.some((p) => p.supervisor_id === scope.userId && p.students.some((s: any) => s.user_id === body.student_id));
    if (!inMySection && !supervises) throw bad('You can only schedule meetings with your own students.');
    if (!body.date || body.date < today()) throw bad('Choose today or a future date.');
    if (!TIME.test(String(body.time || ''))) throw bad('Time must be HH:MM.');
    if (!String(body.agenda || '').trim()) throw bad('Agenda is required.');
    const row = { meeting_id: newId('mt'), college_id: scope.collegeId, faculty_id: scope.userId, student_id: body.student_id, date: body.date, time: body.time, agenda: String(body.agenda).trim().slice(0, 200), mode: ['In person', 'Online'].includes(body.mode) ? body.mode : 'In person', created_at: nowIso() };
    this.db.meetings.push(row);
    return row;
  }
}
