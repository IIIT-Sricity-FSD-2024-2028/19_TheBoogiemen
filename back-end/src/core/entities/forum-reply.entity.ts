import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { ForumPost } from './forum-post.entity';

@Entity('forum_replies')
export class ForumReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => ForumPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: ForumPost;

  @Column({ name: 'post_id' })
  postId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
