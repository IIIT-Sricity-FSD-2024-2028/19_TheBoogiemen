import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Course } from './course.entity';

@Entity('assessments')
export class Assessment {
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

  @Column()
  name: string;

  @Column()
  type: string; // e.g., 'quiz', 'assignment', 'midterm'

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'float' })
  maxMarks: number;

  @Column({ type: 'float', default: 100 })
  weightage: number;

  @Column({ default: 'offline' })
  examMode: string;

  @CreateDateColumn()
  createdAt: Date;
}
