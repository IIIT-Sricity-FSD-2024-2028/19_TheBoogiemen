import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Course } from './course.entity';
import { ForumReply } from './forum-reply.entity';

@Entity('forum_posts')
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'course_id' })
  courseId: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  tag: string;

  @OneToMany(() => ForumReply, reply => reply.post)
  replies: ForumReply[];

  @CreateDateColumn()
  createdAt: Date;
}
