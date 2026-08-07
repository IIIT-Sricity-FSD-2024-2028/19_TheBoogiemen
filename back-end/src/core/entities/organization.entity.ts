import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrganizationMembership } from './organization-membership.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ default: 'active' })
  status: string; // lead, pending, approved, active, suspended

  @Column({ default: 'free' })
  subscriptionPlan: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => OrganizationMembership, membership => membership.organization)
  memberships: OrganizationMembership[];
}
