import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InMemoryDbService implements OnModuleInit {
  private readonly dataPath = path.join(__dirname, '..', '..', '..', 'data', 'mock-db.json');
  private isLoaded = false;

  public departments = this.createProxyArray([]);
  public users = this.createProxyArray([]);
  public students = this.createProxyArray([]);
  public faculty = this.createProxyArray([]);
  public courses = this.createProxyArray([]);
  public enrollment = this.createProxyArray([]);
  public attendance_log = this.createProxyArray([]);
  public assessments = this.createProxyArray([]);
  public marks_entry = this.createProxyArray([]);
  public leave_applications = this.createProxyArray([]);
  public research_projects = this.createProxyArray([]);
  public discussion_posts = this.createProxyArray([]);
  public discussion_replies = this.createProxyArray([]);
  public events = this.createProxyArray([]);
  public resources = this.createProxyArray([]);
  public fees = this.createProxyArray([]);
  public submissions = this.createProxyArray([]);
  public timetable = this.createProxyArray([]);
  public syllabus_progress = this.createProxyArray([]);
  public attendance_requests = this.createProxyArray([]);
  public resource_bookings = this.createProxyArray([]);

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
      }
    });
  }

  private loadData() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const rawData = fs.readFileSync(this.dataPath, 'utf8');
        const data = JSON.parse(rawData);
        
        // Disable persistence during bulk load
        this.isLoaded = false;
        
        for (const key in data) {
          if (Array.isArray(data[key]) && this[key]) {
            this[key].length = 0; // Clear proxy array
            this[key].push(...data[key]); // Push into proxy array (will not persist due to isLoaded=false)
          }
        }
        
        this.isLoaded = true;
        console.log(`[Database] Loaded mock data from ${this.dataPath}`);
      } else {
        this.isLoaded = true;
        console.warn(`[Database] Mock data file not found at ${this.dataPath}. Starting with empty data.`);
      }
    } catch (error) {
      this.isLoaded = true;
      console.error('[Database] Error loading mock data:', error);
    }
  }

  public persist() {
    try {
      const dataToSave = {
        departments: this.departments,
        users: this.users,
        students: this.students,
        faculty: this.faculty,
        courses: this.courses,
        enrollment: this.enrollment,
        attendance_log: this.attendance_log,
        assessments: this.assessments,
        marks_entry: this.marks_entry,
        leave_applications: this.leave_applications,
        research_projects: this.research_projects,
        discussion_posts: this.discussion_posts,
        discussion_replies: this.discussion_replies,
        events: this.events,
        resources: this.resources,
        fees: this.fees,
        submissions: this.submissions,
        timetable: this.timetable,
        syllabus_progress: this.syllabus_progress,
        attendance_requests: this.attendance_requests,
        resource_bookings: this.resource_bookings,
      };

      fs.writeFileSync(this.dataPath, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (error) {
      console.error('[Database] Error persisting mock data:', error);
    }
  }
}
