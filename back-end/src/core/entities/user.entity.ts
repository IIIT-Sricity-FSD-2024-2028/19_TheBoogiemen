import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrganizationMembership } from './organization-membership.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;
  
  @Column({ default: 'user' }) // 'user' or 'superadmin'
  platformRole: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  externalId: string; // e.g. Canvas User ID

  @Column({ nullable: true })
  externalProvider: string; // e.g. 'canvas'

  @OneToMany(() => OrganizationMembership, membership => membership.user)
  memberships: OrganizationMembership[];
}
