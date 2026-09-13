/**
 * support.service.ts — the SPOC <-> superadmin channel.
 *
 * Modelled directly on discussion_posts / discussion_replies
 * (admin/common.controller.ts's Discussions section): a thread, messages
 * hung off it with a denormalised author name/role, and no resolved/status
 * field — a superadmin replying is what "resolves" a thread, exactly like a
 * faculty reply resolves a discussion post today. No new state machine.
 *
 * The one real difference from discussions is cardinality, not mechanics:
 * discussions is many threads per (many) students; support is one thread per
 * college. That collapses "start a new thread" and "send the next message"
 * into a single action from the SPOC's side — see sendAsSpoc() — while
 * superadmin still gets the familiar list-many / open-one / reply shape,
 * because superadmin genuinely has many colleges' threads to manage.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';

@Injectable()
export class SupportService {
  constructor(private readonly db: InMemoryDbService) {}

  /** The SPOC's own thread, with every message — or `null` if none started yet. */
  async myThread(collegeId: string) {
    const thread = this.db.support_threads.find(
      (t) => t.college_id === collegeId,
    );
    if (!thread) return null;
    return this.withMessages(thread);
  }

  /** SPOC sends a message. Creates the thread on the first call, appends after. */
  async sendAsSpoc(
    collegeId: string,
    senderId: string,
    senderName: string,
    content: string,
  ) {
    let thread = this.db.support_threads.find(
      (t) => t.college_id === collegeId,
    );
    if (!thread) {
      thread = {
        thread_id: `st${Date.now()}`,
        college_id: collegeId,
        subject: 'Support',
        created_at: new Date().toISOString(),
      };
      this.db.support_threads.push(thread);
    }
    this.pushMessage(thread.thread_id, senderId, senderName, 'spoc', content);
    return this.withMessages(thread);
  }

  /** Superadmin's inbox: every college's thread, newest activity first. */
  async allThreads() {
    const threads = this.db.support_threads.map((t) => {
      const messages = this.db.support_messages.filter(
        (m) => m.thread_id === t.thread_id,
      );
      const last = messages[messages.length - 1];
      const college = this.db.colleges.find(
        (c) => c.college_id === t.college_id,
      );
      return {
        thread_id: t.thread_id,
        college_id: t.college_id,
        college_name: college?.name ?? 'Unknown college',
        subject: t.subject,
        message_count: messages.length,
        last_message: last
          ? { content: last.content, sender_role: last.sender_role, created_at: last.created_at }
          : null,
      };
    });
    threads.sort((a, b) => {
      const at = a.last_message?.created_at ?? '';
      const bt = b.last_message?.created_at ?? '';
      return bt.localeCompare(at);
    });
    return threads;
  }

  async threadDetail(threadId: string) {
    const thread = this.db.support_threads.find(
      (t) => t.thread_id === threadId,
    );
    if (!thread) {
      throw new BadRequestException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Thread not found'),
      );
    }
    return this.withMessages(thread);
  }

  /** Superadmin replies to a specific college's thread — mirrors createReply(). */
  async replyAsSuperadmin(
    threadId: string,
    senderId: string,
    senderName: string,
    content: string,
  ) {
    const thread = this.db.support_threads.find(
      (t) => t.thread_id === threadId,
    );
    if (!thread) {
      throw new BadRequestException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Thread not found'),
      );
    }
    this.pushMessage(threadId, senderId, senderName, 'superadmin', content);
    return this.withMessages(thread);
  }

  private pushMessage(
    threadId: string,
    senderId: string,
    senderName: string,
    senderRole: 'spoc' | 'superadmin',
    content: string,
  ) {
    this.db.support_messages.push({
      message_id: `sm${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      thread_id: threadId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      content,
      created_at: new Date().toISOString(),
    });
  }

  private withMessages(thread: any) {
    const messages = this.db.support_messages
      .filter((m) => m.thread_id === thread.thread_id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { ...thread, messages };
  }
}
