import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { PasswordService } from '../auth/password.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { getActiveSubscription, planStatus } from '../common/billing/subscription';
import { CampusScope, inCollege } from '../core/scope';
import { fullName, newId, nowIso, publicUser, round1 } from '../core/util';

const bad = (msg: string) => new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, msg));
const forbid = (msg: string) => new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, msg));
const notFound = () => new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Ticket not found'));

export const CATEGORIES = ['Login and access', 'People and accounts', 'Configuration', 'Attendance', 'Academics', 'Reports', 'Billing and fees', 'Technical issue', 'Other'];
export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const STATUSES = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'] as const;
const BILLING = 'Billing and fees';

/** Response and resolution targets in hours, by priority. */
export const SLA_HOURS: Record<string, { response: number; resolution: number }> = {
  critical: { response: 1, resolution: 4 },
  high: { response: 4, resolution: 24 },
  medium: { response: 8, resolution: 48 },
  low: { response: 24, resolution: 72 },
};

export const LEVELS: Record<string, { tier: number; name: string }> = {
  PLATFORM_SUPPORT_AGENT: { tier: 1, name: 'L1 Support agent' },
  PLATFORM_SALES_SUPPORT: { tier: 1, name: 'Sales and onboarding' },
  PLATFORM_TECH_SUPPORT: { tier: 2, name: 'L2 Technical support' },
  PLATFORM_SUPPORT_MANAGER: { tier: 3, name: 'L3 Support manager' },
  PLATFORM_SUPER_ADMIN: { tier: 4, name: 'L4 Platform admin' },
};
const TIER_ROLE: Record<number, string> = { 1: 'PLATFORM_SUPPORT_AGENT', 2: 'PLATFORM_TECH_SUPPORT', 3: 'PLATFORM_SUPPORT_MANAGER', 4: 'PLATFORM_SUPER_ADMIN' };
const REOPEN_DAYS = 7;

export interface StaffActor {
  userId: string;
  role: string;
  tier: number;
  user: any;
}

const H = 3600000;

@Injectable()
export class SupportService {
  constructor(private readonly db: InMemoryDbService, private readonly passwords: PasswordService) {}

  // ── Shared ────────────────────────────────────────────────────────────────

  sla(t: any) {
    const target = SLA_HOURS[t.priority] ?? SLA_HOURS.medium;
    const created = Date.parse(t.created_at);
    const responseDue = created + target.response * H;
    const resolutionDue = created + target.resolution * H;
    const now = Date.now();
    const responded = t.first_response_at ? Date.parse(t.first_response_at) : null;
    const resolved = t.resolved_at ? Date.parse(t.resolved_at) : null;
    const done = ['resolved', 'closed'].includes(t.status);
    const responseBreached = responded ? responded > responseDue : now > responseDue;
    const resolutionBreached = resolved ? resolved > resolutionDue : !done && now > resolutionDue;
    const nextDue = !responded ? responseDue : resolutionDue;
    const window = !responded ? target.response * H : target.resolution * H;
    let status: 'met' | 'on_track' | 'at_risk' | 'breached';
    if (responseBreached || resolutionBreached) status = 'breached';
    else if (done) status = 'met';
    else status = nextDue - now < window * 0.25 ? 'at_risk' : 'on_track';
    return { status, response_due: new Date(responseDue).toISOString(), resolution_due: new Date(resolutionDue).toISOString(), next_due: done ? null : new Date(nextDue).toISOString() };
  }

  private view(t: any, internal: boolean) {
    const college = this.db.colleges.find((c) => c.college_id === t.college_id);
    const assignee = t.assigned_to_id ? this.db.users.find((u) => u.user_id === t.assigned_to_id) : null;
    return {
      ...t,
      college_name: college?.name ?? null,
      college_code: college?.code ?? null,
      assigned_to_name: assignee ? fullName(assignee) : null,
      tier_name: LEVELS[TIER_ROLE[t.tier]]?.name ?? `L${t.tier}`,
      sla: this.sla(t),
      messages: (t.messages || []).filter((m: any) => internal || m.kind !== 'internal'),
      escalations: internal ? t.escalations || [] : [],
    };
  }

  private addMessage(t: any, author: any, text: string, kind: 'public' | 'internal') {
    const body = String(text || '').trim();
    if (body.length < 2) throw bad('Write a message.');
    const msg = { message_id: newId('msg'), author_id: author.user_id, author_name: fullName(author), author_role: author.role, kind, text: body.slice(0, 4000), created_at: nowIso() };
    t.messages = [...(t.messages || []), msg];
    t.updated_at = msg.created_at;
    return msg;
  }

  // ── College side ──────────────────────────────────────────────────────────

  collegeList(scope: CampusScope) {
    return inCollege(scope, this.db.support_tickets).map((t) => this.view(t, false)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  private collegeTicket(scope: CampusScope, id: string) {
    const t = this.db.support_tickets.find((x) => x.ticket_id === id && x.college_id === scope.collegeId);
    if (!t) throw notFound();
    return t;
  }

  collegeGet(scope: CampusScope, id: string) {
    return this.view(this.collegeTicket(scope, id), false);
  }

  create(scope: CampusScope, body: any) {
    const subject = String(body.subject || '').trim();
    const description = String(body.description || '').trim();
    if (subject.length < 5) throw bad('Subject must be at least 5 characters.');
    if (description.length < 10) throw bad('Describe the problem in at least 10 characters.');
    if (!CATEGORIES.includes(body.category)) throw bad('Choose a category.');
    if (!PRIORITIES.includes(body.priority)) throw bad('Choose a priority.');
    const seq = this.db.support_tickets.length + 1001;
    const now = nowIso();
    const t = {
      ticket_id: newId('tkt'), display_id: `TKT-${seq}`, college_id: scope.collegeId,
      raised_by: scope.userId, raised_by_name: fullName(scope.user), raised_by_role: scope.role,
      subject: subject.slice(0, 150), category: body.category, description: description.slice(0, 4000), priority: body.priority,
      status: 'open', tier: 1, assigned_to_id: null, created_at: now, updated_at: now, first_response_at: null, resolved_at: null, closed_at: null,
      escalations: [], messages: [{ message_id: newId('msg'), author_id: scope.userId, author_name: fullName(scope.user), author_role: scope.role, kind: 'public', text: description.slice(0, 4000), created_at: now }],
    };
    this.db.support_tickets.push(t);
    return this.view(t, false);
  }

  collegeReply(scope: CampusScope, id: string, text: string) {
    const t = this.collegeTicket(scope, id);
    if (t.status === 'closed') throw bad('This ticket is closed. Open a new ticket instead.');
    this.addMessage(t, scope.user, text, 'public');
    if (['waiting_on_customer', 'resolved'].includes(t.status)) t.status = t.assigned_to_id ? 'in_progress' : 'open';
    if (t.status !== 'open' && t.status !== 'in_progress') t.status = 'open';
    t.resolved_at = null;
    this.db.persist();
    return this.view(t, false);
  }

  reopen(scope: CampusScope, id: string) {
    const t = this.collegeTicket(scope, id);
    if (t.status !== 'resolved') throw bad('Only resolved tickets can be reopened.');
    if (Date.now() - Date.parse(t.resolved_at) > REOPEN_DAYS * 24 * H) throw bad(`Tickets can be reopened within ${REOPEN_DAYS} days of resolution.`);
    t.status = t.assigned_to_id ? 'in_progress' : 'open';
    t.resolved_at = null;
    t.updated_at = nowIso();
    this.db.persist();
    return this.view(t, false);
  }

  close(scope: CampusScope, id: string) {
    const t = this.collegeTicket(scope, id);
    if (t.status === 'closed') throw bad('Already closed.');
    t.status = 'closed';
    t.closed_at = nowIso();
    t.updated_at = t.closed_at;
    this.db.persist();
    return this.view(t, false);
  }

  // ── Platform side ─────────────────────────────────────────────────────────

  actor(claims: { sub: string; role: string }): StaffActor {
    const user = this.db.users.find((u) => u.user_id === claims.sub);
    const level = LEVELS[claims.role];
    if (!user || !level) throw forbid('Platform support staff only.');
    if (user.status === 'inactive') throw forbid('This account has been deactivated.');
    return { userId: user.user_id, role: user.role, tier: level.tier, user };
  }

  private visible(a: StaffActor, t: any) {
    if (a.role === 'PLATFORM_SALES_SUPPORT') return t.category === BILLING;
    if (a.tier >= 3) return true;
    return t.tier === a.tier || t.assigned_to_id === a.userId;
  }

  private ticket(a: StaffActor, id: string) {
    const t = this.db.support_tickets.find((x) => x.ticket_id === id || x.display_id === id);
    if (!t || !this.visible(a, t)) throw notFound();
    return t;
  }

  list(a: StaffActor, q: any) {
    let rows = this.db.support_tickets.filter((t) => this.visible(a, t)).map((t) => this.view(t, true));
    if (q.status && q.status !== 'all') rows = q.status === 'active' ? rows.filter((t) => !['resolved', 'closed'].includes(t.status)) : rows.filter((t) => t.status === q.status);
    if (q.tier) rows = rows.filter((t) => String(t.tier) === String(q.tier));
    if (q.priority) rows = rows.filter((t) => t.priority === q.priority);
    if (q.assignee === 'me') rows = rows.filter((t) => t.assigned_to_id === a.userId);
    else if (q.assignee === 'unassigned') rows = rows.filter((t) => !t.assigned_to_id);
    if (q.sla) rows = rows.filter((t) => t.sla.status === q.sla);
    if (q.college_id) rows = rows.filter((t) => t.college_id === q.college_id);
    if (q.search) {
      const s = String(q.search).toLowerCase();
      rows = rows.filter((t) => `${t.display_id} ${t.subject} ${t.college_name} ${t.category}`.toLowerCase().includes(s));
    }
    const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return rows.sort((x, y) => (x.sla.status === 'breached' ? 0 : 1) - (y.sla.status === 'breached' ? 0 : 1) || rank[y.priority] - rank[x.priority] || String(x.created_at).localeCompare(String(y.created_at)));
  }

  get(a: StaffActor, id: string) {
    return this.view(this.ticket(a, id), true);
  }

  reply(a: StaffActor, id: string, body: { text: string; kind?: string }) {
    const t = this.ticket(a, id);
    if (t.status === 'closed') throw bad('This ticket is closed.');
    const kind = body?.kind === 'internal' ? 'internal' : 'public';
    this.addMessage(t, a.user, body?.text, kind);
    if (kind === 'public') {
      if (!t.first_response_at) t.first_response_at = nowIso();
      if (t.status === 'open') t.status = 'in_progress';
      if (!t.assigned_to_id && a.tier <= t.tier) t.assigned_to_id = a.userId;
    }
    this.db.persist();
    return this.view(t, true);
  }

  assign(a: StaffActor, id: string, assigneeId: string) {
    const t = this.ticket(a, id);
    if (['resolved', 'closed'].includes(t.status)) throw bad('Reopen the ticket before assigning it.');
    const target = this.db.users.find((u) => u.user_id === assigneeId && LEVELS[u.role] && u.status !== 'inactive');
    if (!target) throw bad('Choose an active support staff member.');
    const targetTier = LEVELS[target.role].tier;
    if (a.tier < 3 && target.user_id !== a.userId) throw forbid('Only managers (L3+) can assign tickets to someone else.');
    if (targetTier < t.tier) throw bad(`This ticket is at L${t.tier}; assign it to someone at L${t.tier} or above.`);
    t.assigned_to_id = target.user_id;
    if (t.status === 'open') t.status = 'in_progress';
    this.addMessage(t, a.user, `Assigned to ${fullName(target)} (${LEVELS[target.role].name}).`, 'internal');
    this.db.persist();
    return this.view(t, true);
  }

  escalate(a: StaffActor, id: string, body: { to_tier: number; reason: string }) {
    const t = this.ticket(a, id);
    const to = Number(body?.to_tier);
    if (['resolved', 'closed'].includes(t.status)) throw bad('Resolved tickets cannot be escalated.');
    if (![2, 3, 4].includes(to) || to <= t.tier) throw bad('Escalate only to a higher level.');
    if (a.tier < 3 && to !== t.tier + 1) throw forbid(`You can escalate one level at a time (to L${t.tier + 1}).`);
    if (a.role === 'PLATFORM_SALES_SUPPORT' && to > 3) throw forbid('Sales escalates billing questions to the support manager.');
    const reason = String(body?.reason || '').trim();
    if (reason.length < 5) throw bad('Give a reason for the escalation.');
    t.escalations = [...(t.escalations || []), { from_tier: t.tier, to_tier: to, reason: reason.slice(0, 500), by: a.userId, by_name: fullName(a.user), at: nowIso() }];
    t.tier = to;
    const assignee = t.assigned_to_id ? this.db.users.find((u) => u.user_id === t.assigned_to_id) : null;
    if (!assignee || (LEVELS[assignee.role]?.tier ?? 0) < to) t.assigned_to_id = null;
    t.status = t.assigned_to_id ? 'in_progress' : 'open';
    this.addMessage(t, a.user, `Escalated to L${to}: ${reason}`, 'internal');
    this.db.persist();
    return this.view(t, true);
  }

  setStatus(a: StaffActor, id: string, status: string) {
    const t = this.ticket(a, id);
    if (!['in_progress', 'waiting_on_customer', 'resolved', 'closed'].includes(status)) throw bad('Invalid status.');
    if (status === 'closed' && a.tier < 3) throw forbid('Only managers can close tickets; resolve it instead.');
    if (status === 'resolved' && !t.messages.some((m: any) => m.kind === 'public' && LEVELS[m.author_role])) throw bad('Reply to the customer before resolving.');
    t.status = status;
    if (status === 'resolved') t.resolved_at = nowIso();
    if (status === 'closed') t.closed_at = nowIso();
    t.updated_at = nowIso();
    this.db.persist();
    return this.view(t, true);
  }

  setPriority(a: StaffActor, id: string, priority: string) {
    if (a.tier < 3) throw forbid('Only managers (L3+) can change priority.');
    const t = this.ticket(a, id);
    if (!PRIORITIES.includes(priority as any)) throw bad('Invalid priority.');
    t.priority = priority;
    this.addMessage(t, a.user, `Priority changed to ${priority}.`, 'internal');
    this.db.persist();
    return this.view(t, true);
  }

  summary(a: StaffActor) {
    const mine = this.db.support_tickets.filter((t) => this.visible(a, t));
    const active = mine.filter((t) => !['resolved', 'closed'].includes(t.status));
    const sla = active.map((t) => this.sla(t).status);
    return {
      level: LEVELS[a.role], tier: a.tier,
      active: active.length,
      unassigned: active.filter((t) => !t.assigned_to_id).length,
      assigned_to_me: active.filter((t) => t.assigned_to_id === a.userId).length,
      waiting_on_customer: active.filter((t) => t.status === 'waiting_on_customer').length,
      breached: sla.filter((s) => s === 'breached').length,
      at_risk: sla.filter((s) => s === 'at_risk').length,
      by_tier: [1, 2, 3, 4].map((tier) => ({ tier, count: active.filter((t) => t.tier === tier).length })),
      by_priority: PRIORITIES.map((p) => ({ priority: p, count: active.filter((t) => t.priority === p).length })),
    };
  }

  // ── Team ──────────────────────────────────────────────────────────────────

  team() {
    return this.db.users
      .filter((u) => LEVELS[u.role])
      .map((u) => {
        const assigned = this.db.support_tickets.filter((t) => t.assigned_to_id === u.user_id);
        const active = assigned.filter((t) => !['resolved', 'closed'].includes(t.status));
        return { ...publicUser(u), name: fullName(u), level: LEVELS[u.role].name, tier: LEVELS[u.role].tier, active_tickets: active.length, resolved_tickets: assigned.filter((t) => ['resolved', 'closed'].includes(t.status)).length, breached: active.filter((t) => this.sla(t).status === 'breached').length };
      })
      .sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
  }

  async addStaff(a: StaffActor, body: any) {
    if (a.tier < 4) throw forbid('Only the platform admin manages staff.');
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Enter a valid email.');
    if (this.db.users.some((u) => u.email?.toLowerCase() === email)) throw new ConflictException(errorBody(ErrorCode.DUPLICATE_RESOURCE, 'Email already in use.'));
    const role = body.role === 'sales' ? 'PLATFORM_SALES_SUPPORT' : TIER_ROLE[Number(body.tier)];
    if (!role || role === 'PLATFORM_SUPER_ADMIN') throw bad('Level must be L1, L2, L3 or sales.');
    if (!String(body.first_name || '').trim()) throw bad('First name is required.');
    const temporary = `Sp${randomBytes(4).toString('hex')}#${Math.floor(10 + Math.random() * 89)}`;
    const user = { user_id: newId('u'), college_id: null, email, username: email.split('@')[0], role, first_name: String(body.first_name).trim(), last_name: String(body.last_name || '').trim(), phone: null, address: null, photo_file_id: null, status: 'active', must_change_password: true, department_id: null, display_id: `SUP-${String(this.team().length + 1).padStart(3, '0')}`, designation: LEVELS[role].name, tier_level: LEVELS[role].tier, password_hash: await this.passwords.hash(temporary), created_at: nowIso() };
    this.db.users.push(user);
    return { staff: publicUser(user), temporary_password: temporary };
  }

  updateStaff(a: StaffActor, id: string, body: any) {
    if (a.tier < 4) throw forbid('Only the platform admin manages staff.');
    const u = this.db.users.find((x) => x.user_id === id && LEVELS[x.role]);
    if (!u) throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Staff member not found'));
    if (u.user_id === a.userId) throw bad('You cannot change your own level or status.');
    if (body.tier !== undefined || body.role !== undefined) {
      const role = body.role === 'sales' ? 'PLATFORM_SALES_SUPPORT' : TIER_ROLE[Number(body.tier)];
      if (!role || role === 'PLATFORM_SUPER_ADMIN') throw bad('Level must be L1, L2, L3 or sales.');
      u.role = role;
      u.tier_level = LEVELS[role].tier;
      u.designation = LEVELS[role].name;
    }
    if (body.status !== undefined) {
      if (!['active', 'inactive'].includes(body.status)) throw bad('Status must be active or inactive.');
      u.status = body.status;
      if (body.status === 'inactive') for (const t of this.db.support_tickets) if (t.assigned_to_id === u.user_id && !['resolved', 'closed'].includes(t.status)) { t.assigned_to_id = null; t.status = 'open'; }
    }
    this.db.persist();
    return publicUser(u);
  }

  // ── Institutions and onboarding ───────────────────────────────────────────

  institutions() {
    return this.db.colleges.map((c) => {
      const sub = getActiveSubscription(this.db, c.college_id);
      const users = this.db.users.filter((u) => u.college_id === c.college_id && u.status !== 'inactive');
      const settings = this.db.college_settings.find((s) => s.college_id === c.college_id);
      return {
        ...c,
        subscription: sub ? { ...sub, plan_status: planStatus(sub) } : null,
        seats: { students: users.filter((u) => u.role === 'student').length, faculty: users.filter((u) => ['faculty', 'head', 'DEPARTMENT_ADMIN_HOD'].includes(u.role)).length },
        spoc: fullName(users.find((u) => u.role === 'spoc')) || null,
        spoc_email: users.find((u) => u.role === 'spoc')?.email ?? null,
        open_tickets: this.db.support_tickets.filter((t) => t.college_id === c.college_id && !['resolved', 'closed'].includes(t.status)).length,
        setup_completed: !!settings?.setup?.completed_at,
        config: settings ? { term_type: settings.term_type, attendance_min_pct: settings.attendance_min_pct, grading_scale: settings.grading?.scale, sections: settings.sections, custom_fields: (settings.custom_fields || []).length } : null,
      };
    });
  }

  updateInstitution(a: StaffActor, id: string, body: any) {
    if (a.tier < 4) throw forbid('Only the platform admin changes subscriptions.');
    const c = this.db.colleges.find((x) => x.college_id === id);
    if (!c) throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Institution not found'));
    if (body.status !== undefined) {
      if (!['active', 'suspended'].includes(body.status)) throw bad('Status must be active or suspended.');
      c.status = body.status;
    }
    const sub = getActiveSubscription(this.db, id) as any;
    if (sub) {
      for (const k of ['student_seats', 'faculty_seats']) {
        if (body[k] === undefined) continue;
        const n = Number(body[k]);
        if (!Number.isInteger(n) || n < 1) throw bad('Seats must be a positive whole number.');
        sub[k] = n;
      }
      if (body.extend_months !== undefined) {
        const m = Number(body.extend_months);
        if (!Number.isInteger(m) || m < 1 || m > 36) throw bad('Extend by 1 to 36 months.');
        const d = new Date(`${sub.ends_on}T00:00:00Z`);
        d.setUTCMonth(d.getUTCMonth() + m);
        sub.ends_on = d.toISOString().slice(0, 10);
      }
    }
    this.db.persist();
    return this.institutions().find((x) => x.college_id === id);
  }

  onboarding() {
    return this.db.onboarding_sessions.map((s) => {
      const quote = [...this.db.quotes].reverse().find((q) => q.session_id === s.session_id);
      const payment = quote ? [...this.db.payments].reverse().find((p) => p.quote_id === quote.quote_id) : null;
      const expired = s.status !== 'completed' && s.expires_at && Date.parse(s.expires_at) < Date.now();
      const stage = s.status === 'completed' ? 'paid' : expired ? 'expired' : payment ? (payment.status === 'failed' ? 'payment_failed' : 'accepted') : quote ? 'quoted' : 'started';
      return { session_id: s.session_id, college_name: s.college_name, city: s.city, state: s.state, contact: [s.first_name, s.last_name].filter(Boolean).join(' '), email: s.email, phone: s.phone, stage, amount_paise: quote?.breakdown?.payable_paise ?? null, metrics: quote?.metrics ?? null, created_at: s.created_at };
    }).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  analytics() {
    const tickets = this.db.support_tickets;
    const days: { date: string; opened: number; resolved: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * H).toISOString().slice(0, 10);
      days.push({ date: d, opened: tickets.filter((t) => t.created_at.slice(0, 10) === d).length, resolved: tickets.filter((t) => t.resolved_at?.slice(0, 10) === d).length });
    }
    const responded = tickets.filter((t) => t.first_response_at);
    const resolved = tickets.filter((t) => t.resolved_at);
    const count = (key: string) => {
      const m = new Map<string, number>();
      for (const t of tickets) m.set(t[key], (m.get(t[key]) || 0) + 1);
      return [...m.entries()].map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count);
    };
    return {
      total: tickets.length,
      avg_first_response_hours: responded.length ? round1(responded.reduce((s, t) => s + (Date.parse(t.first_response_at) - Date.parse(t.created_at)), 0) / responded.length / H) : null,
      avg_resolution_hours: resolved.length ? round1(resolved.reduce((s, t) => s + (Date.parse(t.resolved_at) - Date.parse(t.created_at)), 0) / resolved.length / H) : null,
      sla_breached: tickets.filter((t) => this.sla(t).status === 'breached').length,
      daily: days,
      by_category: count('category'),
      by_college: count('college_id').map((x) => ({ ...x, name: this.db.colleges.find((c) => c.college_id === x.key)?.name ?? x.key })),
    };
  }
}
