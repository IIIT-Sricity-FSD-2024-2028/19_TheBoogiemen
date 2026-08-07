import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../core/entities/user.entity';
import { OrganizationMembership } from '../core/entities/organization-membership.entity';
import { Organization } from '../core/entities/organization.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InstitutionService {
  constructor(
    @InjectRepository(Organization) private orgRepository: Repository<Organization>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(OrganizationMembership) private membershipRepository: Repository<OrganizationMembership>,
  ) {}

  async setupInstitution(tenantId: string, setupData: any) {
    const org = await this.orgRepository.findOne({ where: { id: tenantId } });
    if (!org) throw new BadRequestException('Invalid tenant context');
    
    // In a real app, save departments, settings, terms, etc.
    org.status = 'active';
    await this.orgRepository.save(org);
    return { success: true, message: 'Institution setup complete' };
  }

  async importStudents(tenantId: string, studentsList: any[]) {
    return this.importUsers(tenantId, studentsList, 'student');
  }

  async importFaculty(tenantId: string, facultyList: any[]) {
    return this.importUsers(tenantId, facultyList, 'faculty');
  }

  private async importUsers(tenantId: string, userList: any[], role: string) {
    const org = await this.orgRepository.findOne({ where: { id: tenantId } });
    if (!org) throw new BadRequestException('Invalid tenant context');

    const results = { imported: 0, failed: 0 };
    for (const record of userList) {
      try {
        let user = await this.userRepository.findOne({ where: { email: record.email } });
        if (!user) {
          // Generate temporary password or send invite link
          const tempPassword = Math.random().toString(36).slice(-8);
          const passwordHash = await bcrypt.hash(tempPassword, 10);
          user = this.userRepository.create({
            email: record.email,
            name: record.name || record.first_name,
            passwordHash,
            platformRole: 'user'
          });
          user = await this.userRepository.save(user);
        }

        const existingMembership = await this.membershipRepository.findOne({ where: { user: { id: user.id }, organization: { id: tenantId } } });
        if (!existingMembership) {
          const membership = this.membershipRepository.create({
            user,
            organization: org,
            role
          });
          await this.membershipRepository.save(membership);
        }
        results.imported++;
      } catch (err) {
        results.failed++;
      }
    }
    return { success: true, results };
  }
}
