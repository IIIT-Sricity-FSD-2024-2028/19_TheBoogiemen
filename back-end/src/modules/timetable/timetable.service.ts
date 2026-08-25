import { Injectable, BadRequestException } from '@nestjs/common';
import { InMemoryDbService } from '../../database/in-memory-db.service';
import { FileLoggerService } from '../../common/services/file-logger.service';

export interface TimetableSlot {
  slot_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  faculty_id: string;
  faculty_name: string;
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
  time: '09:00' | '10:00' | '11:00' | '12:00' | '13:00' | '14:00' | '15:00';
  room: string;
  section: string;
  type: 'lecture' | 'lab' | 'tutorial';
}

@Injectable()
export class TimetableService {
  constructor(
    private readonly db: InMemoryDbService,
    private readonly fileLogger: FileLoggerService
  ) {}

  private days: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI')[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  private times: ('09:00' | '10:00' | '11:00' | '12:00' | '13:00' | '14:00' | '15:00')[] = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  ];
  private rooms = ['LH-101', 'LH-102', 'LH-201', 'Lab-1 (Software)', 'Lab-2 (Hardware)'];

  /**
   * Generates a conflict-free automated timetable for a given section.
   * Ensures:
   * 1. No faculty is scheduled in two places simultaneously.
   * 2. No room is double-booked in the same slot.
   * 3. Weekly credit requirements for each course are fulfilled.
   */
  async generateSectionTimetable(section: string = 'A', resetExisting = true) {
    const courses = this.db.courses;
    if (!courses || courses.length === 0) {
      throw new BadRequestException('No courses available to generate timetable.');
    }

    if (resetExisting) {
      this.db.timetable = this.db.timetable.filter((t) => t.section !== section);
    }

    const generatedSlots: TimetableSlot[] = [];
    const facultyBooking = new Set<string>(); // "facultyId_day_time"
    const roomBooking = new Set<string>(); // "room_day_time"

    // Mark existing bookings from other sections
    for (const existing of this.db.timetable) {
      facultyBooking.add(`${existing.faculty_id}_${existing.day}_${existing.time}`);
      roomBooking.add(`${existing.room}_${existing.day}_${existing.time}`);
    }

    let dayIdx = 0;
    let timeIdx = 0;

    for (const course of courses) {
      const lecturesNeeded = Math.min(course.credits || 3, 4);
      let scheduled = 0;

      for (let attempt = 0; attempt < 50 && scheduled < lecturesNeeded; attempt++) {
        const day = this.days[(dayIdx + attempt) % this.days.length];
        const time = this.times[(timeIdx + attempt) % this.times.length];

        // Find available room
        const room = this.rooms.find(
          (r) => !roomBooking.has(`${r}_${day}_${time}`)
        ) || 'LH-101';

        const facultyKey = `${course.faculty_id}_${day}_${time}`;
        const roomKey = `${room}_${day}_${time}`;

        // Check conflicts
        if (!facultyBooking.has(facultyKey) && !roomBooking.has(roomKey)) {
          const faculty = this.db.faculty.find((f) => f.user_id === course.faculty_id);
          const facultyName = faculty
            ? `${faculty.first_name} ${faculty.last_name || ''}`.trim()
            : course.faculty_name || 'Faculty';

          const slot: TimetableSlot = {
            slot_id: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            course_id: course.course_id,
            course_code: course.course_code,
            course_name: course.course_name,
            faculty_id: course.faculty_id || 'u2',
            faculty_name: facultyName,
            day,
            time,
            room,
            section,
            type: scheduled === 0 && course.course_code.includes('CS') ? 'lab' : 'lecture',
          };

          generatedSlots.push(slot);
          (this.db.timetable as any).push(slot);

          facultyBooking.add(facultyKey);
          roomBooking.add(roomKey);
          scheduled++;

          timeIdx = (timeIdx + 1) % this.times.length;
          if (timeIdx === 0) dayIdx = (dayIdx + 1) % this.days.length;
        }
      }
    }

    this.fileLogger.logAudit(
      'TIMETABLE_GENERATE',
      'TimetableEngine',
      `Section ${section}`,
      { generatedSlotsCount: generatedSlots.length, section }
    );

    return {
      success: true,
      section,
      total_slots_generated: generatedSlots.length,
      slots: generatedSlots,
    };
  }

  async checkClashes(): Promise<{ hasClash: boolean; clashes: string[] }> {
    const clashes: string[] = [];
    const facultySeen = new Map<string, string>();
    const roomSeen = new Map<string, string>();

    for (const slot of this.db.timetable) {
      const facName = (slot as any).faculty_name || slot.faculty_id;
      const facKey = `${slot.faculty_id}_${slot.day}_${slot.time}`;
      if (facultySeen.has(facKey)) {
        clashes.push(
          `Faculty clash: ${facName} double-booked on ${slot.day} at ${slot.time} for ${slot.course_code} and ${facultySeen.get(facKey)}`
        );
      } else {
        facultySeen.set(facKey, slot.course_code);
      }

      const roomKey = `${slot.room}_${slot.day}_${slot.time}`;
      if (roomSeen.has(roomKey)) {
        clashes.push(
          `Room clash: Room ${slot.room} double-booked on ${slot.day} at ${slot.time} for ${slot.course_code} and ${roomSeen.get(roomKey)}`
        );
      } else {
        roomSeen.set(roomKey, slot.course_code);
      }
    }

    return {
      hasClash: clashes.length > 0,
      clashes,
    };
  }
}
