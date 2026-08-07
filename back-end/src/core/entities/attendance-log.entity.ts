import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('attendance_logs')
export class AttendanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'course_id' })
  courseId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  status: string; // 'present', 'absent', 'late'

  @CreateDateColumn()
  createdAt: Date;
}
