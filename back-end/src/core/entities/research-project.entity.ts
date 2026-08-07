import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity('research_projects')
export class ResearchProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column()
  title: string;

  @Column()
  type: string;

  @Column()
  supervisor: string;

  @Column({ default: 'In Progress' })
  status: string;

  @Column('text', { nullable: true })
  submissionNotes: string;

  @CreateDateColumn()
  createdAt: Date;
}
