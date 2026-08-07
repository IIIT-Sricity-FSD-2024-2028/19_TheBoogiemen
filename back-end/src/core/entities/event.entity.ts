import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  eventName: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  venue: string;

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
