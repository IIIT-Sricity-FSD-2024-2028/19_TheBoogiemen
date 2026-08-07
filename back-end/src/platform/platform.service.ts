import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../core/entities/organization.entity';
import { User } from '../core/entities/user.entity';
import { OrganizationMembership } from '../core/entities/organization-membership.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Organization) private orgRepository: Repository<Organization>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(OrganizationMembership) private membershipRepository: Repository<OrganizationMembership>,
  ) {}

  // In a real application, we'd fetch these from the PostgreSQL 'Applications' table
  // Since we used in-memory for the Public forms submission as a stub, we will stub this too for now
  private applications = [
    { id: 'app_1', institutionName: 'Demo Institute', email: 'admin@demo.edu', status: 'pending' }
  ];

  async getApplications() {
    return this.applications;
  }

  async verifyApplication(id: string) {
    const app = this.applications.find(a => a.id === id);
    if (!app) throw new NotFoundException('Application not found');
    app.status = 'approved';
    return { success: true, message: 'Application approved.', application: app };
  }

  async provisionTenant(body: any) {
    const { name, ownerEmail, ownerName, ownerPassword, plan } = body;
    if (!name || !ownerEmail || !ownerPassword) {
      throw new BadRequestException('Organization name, ownerEmail, and ownerPassword are required.');
    }

    // 1. Create Organization
    const newOrg = this.orgRepository.create({
      name,
      status: 'provisioned'
    });
    const savedOrg = await this.orgRepository.save(newOrg);

    // 2. Create or Find User
    let owner = await this.userRepository.findOne({ where: { email: ownerEmail } });
    if (!owner) {
      const passwordHash = await bcrypt.hash(ownerPassword, 10);
      owner = this.userRepository.create({
        email: ownerEmail,
        name: ownerName || ownerEmail.split('@')[0],
        passwordHash,
        platformRole: 'user'
      });
      owner = await this.userRepository.save(owner);
    }

    // 3. Create Membership for Institution Owner
    const membership = this.membershipRepository.create({
      user: owner,
      organization: savedOrg,
      role: 'institution_owner'
    });
    await this.membershipRepository.save(membership);

    return { 
      success: true, 
      message: 'Tenant provisioned successfully', 
      organization: { id: savedOrg.id, name: savedOrg.name },
      owner: { id: owner.id, email: owner.email }
    };
  }
}
