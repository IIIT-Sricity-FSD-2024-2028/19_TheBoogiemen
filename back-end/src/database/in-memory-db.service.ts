import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Every collection the application stores. Adding a collection here is the
 * only step needed: it is created empty, loaded from the JSON file when
 * present, and written back by persist(). (Previously the field list and the
 * persist() list were maintained separately and drifted, so some collections
 * were silently never saved.)
 */
export const COLLECTIONS = [
  // Tenancy and configuration
  'colleges', 'college_settings', 'departments',
  // People
  'users', 'students', 'faculty',
  // Academics
  'courses', 'course_sections', 'enrollment', 'timetable', 'syllabus_progress',
  'assessments', 'marks_entry', 'submissions',
  // Attendance and leave
  'attendance_log', 'attendance_requests', 'leave_applications',
  // Campus life
  'discussion_posts', 'discussion_replies', 'research_projects', 'meetings',
  'events', 'resources', 'resource_bookings', 'announcements',
  // Fees
  'fee_structures', 'fees', 'fee_payments',
  // Support and platform
  'support_tickets', 'support_threads', 'support_messages',
  // Billing and onboarding
  'onboarding_sessions', 'quotes', 'payments', 'subscriptions',
  // Account and system
  'password_resets', 'notification_reads', 'uploads', 'audit_log',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

@Injectable()
export class InMemoryDbService implements OnModuleInit {
  private isLoaded = false;

  public colleges: any[] = this.createProxyArray([]);
  public college_settings: any[] = this.createProxyArray([]);
  public departments: any[] = this.createProxyArray([]);
  public users: any[] = this.createProxyArray([]);
  public students: any[] = this.createProxyArray([]);
  public faculty: any[] = this.createProxyArray([]);
  public courses: any[] = this.createProxyArray([]);
  public course_sections: any[] = this.createProxyArray([]);
  public enrollment: any[] = this.createProxyArray([]);
  public timetable: any[] = this.createProxyArray([]);
  public syllabus_progress: any[] = this.createProxyArray([]);
  public assessments: any[] = this.createProxyArray([]);
  public marks_entry: any[] = this.createProxyArray([]);
  public submissions: any[] = this.createProxyArray([]);
  public attendance_log: any[] = this.createProxyArray([]);
  public attendance_requests: any[] = this.createProxyArray([]);
  public leave_applications: any[] = this.createProxyArray([]);
  public discussion_posts: any[] = this.createProxyArray([]);
  public discussion_replies: any[] = this.createProxyArray([]);
  public research_projects: any[] = this.createProxyArray([]);
  public meetings: any[] = this.createProxyArray([]);
  public events: any[] = this.createProxyArray([]);
  public resources: any[] = this.createProxyArray([]);
  public resource_bookings: any[] = this.createProxyArray([]);
  public announcements: any[] = this.createProxyArray([]);
  public fee_structures: any[] = this.createProxyArray([]);
  public fees: any[] = this.createProxyArray([]);
  public fee_payments: any[] = this.createProxyArray([]);
  public support_tickets: any[] = this.createProxyArray([]);
  public support_threads: any[] = this.createProxyArray([]);
  public support_messages: any[] = this.createProxyArray([]);
  public onboarding_sessions: any[] = this.createProxyArray([]);
  public quotes: any[] = this.createProxyArray([]);
  public payments: any[] = this.createProxyArray([]);
  public subscriptions: any[] = this.createProxyArray([]);
  public password_resets: any[] = this.createProxyArray([]);
  public notification_reads: any[] = this.createProxyArray([]);
  public uploads: any[] = this.createProxyArray([]);
  public audit_log: any[] = this.createProxyArray([]);

  constructor(
    @InjectPinoLogger(InMemoryDbService.name) private readonly logger: PinoLogger,
  ) {}

  /** `MOCK_DB_PATH` lets tests run against a temporary copy of the seed. */
  public getDataPath(): string {
    if (process.env.MOCK_DB_PATH) return path.resolve(process.env.MOCK_DB_PATH);
    const candidates = [
      path.join(__dirname, '..', '..', 'data', 'mock-db.json'),
      path.join(__dirname, '..', '..', '..', 'data', 'mock-db.json'),
      path.resolve(process.cwd(), 'data', 'mock-db.json'),
      path.resolve(process.cwd(), 'back-end', 'data', 'mock-db.json'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return path.join(__dirname, '..', '..', 'data', 'mock-db.json');
  }

  onModuleInit() {
    this.loadData();
  }

  private createProxyArray(arr: any[]) {
    return new Proxy(arr, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function' && ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].includes(prop as string)) {
          return (...args: any[]) => {
            const result = value.apply(target, args);
            if (this.isLoaded) this.persist();
            return result;
          };
        }
        return value;
      },
      set: (target, prop, value, receiver) => {
        const result = Reflect.set(target, prop, value, receiver);
        if (this.isLoaded && prop !== 'length') this.persist();
        return result;
      },
    });
  }

  private loadData() {
    const dataPath = this.getDataPath();
    try {
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        this.isLoaded = false;
        for (const key of COLLECTIONS) {
          const target = (this as any)[key] as any[];
          target.length = 0;
          if (Array.isArray(data[key])) target.push(...data[key]);
        }
        this.isLoaded = true;
        this.logger.info({ path: dataPath, collections: COLLECTIONS.length }, 'Loaded seed data');
      } else {
        this.isLoaded = true;
        this.logger.warn({ path: dataPath }, 'Seed data file not found — starting with empty collections');
      }
    } catch (error) {
      this.isLoaded = true;
      this.logger.error({ err: error, path: dataPath }, 'Failed to load seed data');
    }
  }

  /**
   * Writes every collection to disk. Call after changing fields of an existing
   * record: in-place edits do not go through the array proxy.
   */
  public persist() {
    const dataPath = this.getDataPath();
    try {
      const data: Record<string, unknown> = {};
      for (const key of COLLECTIONS) data[key] = (this as any)[key];
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      this.logger.error({ err: error, path: dataPath }, 'Failed to persist data');
    }
  }
}
