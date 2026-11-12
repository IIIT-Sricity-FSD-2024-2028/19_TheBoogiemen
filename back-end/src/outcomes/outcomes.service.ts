import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import {
  isSameCollege,
  scopeToCollege,
  writeCollegeId,
} from '../common/tenancy/scope-to-college';
import { sectionsTaughtBy } from '../common/course-sections';
import { studentOutcomeReport } from '../common/outcome-mastery';

/** Shared by learning-outcomes and topics: a faculty may only define
 * course content for a course they actually teach at least one section
 * of — the same gate createAssessment() already enforces in
 * common.controller.ts, applied here to a different resource. */
function assertTeachesCourse(db: InMemoryDbService, userId: string, courseId: string) {
  const mine = sectionsTaughtBy(db, userId).some((cs) => cs.course_id === courseId);
  if (!mine)
    throw new ForbiddenException(
      errorBody(
        ErrorCode.PRIVILEGE_CEILING,
        'You are not assigned to any section of this course.',
      ),
    );
}

@Injectable()
export class OutcomesService {
  constructor(private db: InMemoryDbService) {}

  // ── Program Outcomes (college-wide) ─────────────────────────────────────

  async listProgramOutcomes(collegeId: string | null) {
    return scopeToCollege(this.db.program_outcomes, collegeId);
  }

  async createProgramOutcome(data: any, collegeId: string | null) {
    if (!data.code || !data.description)
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'code and description are required'),
      );
    const po = {
      po_id: uuidv4(),
      code: data.code,
      description: data.description,
      college_id: writeCollegeId(collegeId),
    };
    this.db.program_outcomes.push(po);
    return po;
  }

  async removeProgramOutcome(id: string, collegeId: string | null) {
    const po = this.db.program_outcomes.find((p: any) => p.po_id === id);
    if (!isSameCollege(po, collegeId))
      throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Program outcome not found'));
    this.db.program_outcomes.splice(this.db.program_outcomes.indexOf(po), 1);
    return { success: true };
  }

  // ── Learning Outcomes (= Course Outcomes, per course) ───────────────────

  async listLearningOutcomes(courseId: string | undefined, collegeId: string | null) {
    const scoped = scopeToCollege(this.db.learning_outcomes, collegeId);
    return courseId ? scoped.filter((lo: any) => lo.course_id === courseId) : scoped;
  }

  async createLearningOutcome(data: any, userId: string, collegeId: string | null) {
    if (!data.course_id || !data.code || !data.description)
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'course_id, code, and description are required'),
      );
    assertTeachesCourse(this.db, userId, data.course_id);
    const lo = {
      lo_id: uuidv4(),
      course_id: data.course_id,
      code: data.code,
      description: data.description,
      po_mapping: [],
      college_id: writeCollegeId(collegeId),
    };
    this.db.learning_outcomes.push(lo);
    return lo;
  }

  async updateLearningOutcome(id: string, data: any, userId: string, collegeId: string | null) {
    const lo = this.db.learning_outcomes.find((l: any) => l.lo_id === id);
    if (!isSameCollege(lo, collegeId))
      throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Learning outcome not found'));
    assertTeachesCourse(this.db, userId, lo.course_id);
    if (data.code !== undefined) lo.code = data.code;
    if (data.description !== undefined) lo.description = data.description;
    this.db.persist();
    return lo;
  }

  async setPoMapping(id: string, poMapping: any[], userId: string, collegeId: string | null) {
    const lo = this.db.learning_outcomes.find((l: any) => l.lo_id === id);
    if (!isSameCollege(lo, collegeId))
      throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Learning outcome not found'));
    assertTeachesCourse(this.db, userId, lo.course_id);
    const validPoIds = new Set(scopeToCollege(this.db.program_outcomes, collegeId).map((p: any) => p.po_id));
    lo.po_mapping = (poMapping || [])
      .filter((m: any) => validPoIds.has(m.po_id))
      .map((m: any) => ({ po_id: m.po_id, strength: Math.min(3, Math.max(1, Number(m.strength) || 1)) }));
    this.db.persist();
    return lo;
  }

  async removeLearningOutcome(id: string, userId: string, collegeId: string | null) {
    const lo = this.db.learning_outcomes.find((l: any) => l.lo_id === id);
    if (!isSameCollege(lo, collegeId))
      throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Learning outcome not found'));
    assertTeachesCourse(this.db, userId, lo.course_id);
    this.db.learning_outcomes.splice(this.db.learning_outcomes.indexOf(lo), 1);
    // A topic or assessment tagging a now-deleted CO would otherwise mastery
    // -compute against an id that resolves to nothing — strip it everywhere.
    this.db.topics.forEach((t: any) => {
      if (Array.isArray(t.lo_ids)) t.lo_ids = t.lo_ids.filter((x: string) => x !== id);
    });
    this.db.assessments.forEach((a: any) => {
      if (Array.isArray(a.lo_ids)) a.lo_ids = a.lo_ids.filter((x: string) => x !== id);
    });
    this.db.persist();
    return { success: true };
  }

  // ── Topics (per course; completion varies by section) ───────────────────

  async listTopics(courseId: string | undefined, collegeId: string | null) {
    const scoped = scopeToCollege(this.db.topics, collegeId);
    return (courseId ? scoped.filter((t: any) => t.course_id === courseId) : scoped).sort(
      (a: any, b: any) => a.order - b.order,
    );
  }

  async createTopic(data: any, userId: string, collegeId: string | null) {
    if (!data.course_id || !data.title)
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'course_id and title are required'),
      );
    assertTeachesCourse(this.db, userId, data.course_id);
    const existing = this.db.topics.filter((t: any) => t.course_id === data.course_id);
    const topic = {
      topic_id: uuidv4(),
      course_id: data.course_id,
      title: data.title,
      order: existing.length,
      lo_ids: [],
      college_id: writeCollegeId(collegeId),
    };
    this.db.topics.push(topic);
    return topic;
  }

  async updateTopic(id: string, data: any, userId: string, collegeId: string | null) {
    const topic = this.db.topics.find((t: any) => t.topic_id === id);
    if (!isSameCollege(topic, collegeId))
      throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Topic not found'));
    assertTeachesCourse(this.db, userId, topic.course_id);
    if (data.title !== undefined) topic.title = data.title;
    if (data.order !== undefined) topic.order = Number(data.order);
    if (data.lo_ids !== undefined) {
      const validLoIds = new Set(
        this.db.learning_outcomes.filter((l: any) => l.course_id === topic.course_id).map((l: any) => l.lo_id),
      );
      topic.lo_ids = (data.lo_ids as string[]).filter((id2) => validLoIds.has(id2));
    }
    this.db.persist();
    return topic;
  }

  async removeTopic(id: string, userId: string, collegeId: string | null) {
    const topic = this.db.topics.find((t: any) => t.topic_id === id);
    if (!isSameCollege(topic, collegeId))
      throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Topic not found'));
    assertTeachesCourse(this.db, userId, topic.course_id);
    this.db.topics.splice(this.db.topics.indexOf(topic), 1);
    for (let i = this.db.topic_completions.length - 1; i >= 0; i--) {
      if (this.db.topic_completions[i].topic_id === id) this.db.topic_completions.splice(i, 1);
    }
    return { success: true };
  }

  // ── Topic completions (per course+section) ──────────────────────────────

  async getTopicsWithCompletion(courseId: string, section: string, collegeId: string | null) {
    const topics = await this.listTopics(courseId, collegeId);
    const completions = this.db.topic_completions.filter(
      (tc: any) => tc.course_id === courseId && tc.section === section,
    );
    return topics.map((t: any) => {
      const tc = completions.find((c: any) => c.topic_id === t.topic_id);
      return { ...t, progress: tc?.progress ?? 0, updated_at: tc?.updated_at ?? null };
    });
  }

  async setTopicCompletion(data: any, userId: string, collegeId: string | null) {
    const { course_id, section, topic_id, progress } = data;
    if (!course_id || !section || !topic_id || progress === undefined)
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'course_id, section, topic_id, and progress are required'),
      );
    // Same section-ownership gate the old PATCH /syllabus-progress enforced:
    // a faculty may only update completion for a section they actually teach.
    const mine = sectionsTaughtBy(this.db, userId).some(
      (cs) => cs.course_id === course_id && cs.section === section,
    );
    if (!mine)
      throw new ForbiddenException(
        errorBody(ErrorCode.PRIVILEGE_CEILING, `You are not assigned to Section ${section} of this course.`),
      );
    const topic = this.db.topics.find((t: any) => t.topic_id === topic_id && t.course_id === course_id);
    if (!topic)
      throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Topic not found on this course'));

    const clamped = Math.min(100, Math.max(0, Number(progress)));
    const existing = this.db.topic_completions.find(
      (tc: any) => tc.course_id === course_id && tc.section === section && tc.topic_id === topic_id,
    );
    if (existing) {
      existing.progress = clamped;
      existing.updated_by = userId;
      existing.updated_at = new Date().toISOString().split('T')[0];
      this.db.persist();
      return existing;
    }
    const tc = {
      course_id,
      section,
      topic_id,
      progress: clamped,
      updated_by: userId,
      updated_at: new Date().toISOString().split('T')[0],
      college_id: writeCollegeId(collegeId),
    };
    this.db.topic_completions.push(tc);
    return tc;
  }

  // ── Mastery reports ───────────────────────────────────────────────────────

  async getStudentOutcomeReport(studentId: string) {
    return studentOutcomeReport(this.db, studentId);
  }
}
