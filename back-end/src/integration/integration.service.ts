import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../core/entities/user.entity';
import { IntegrationConfig } from '../core/entities/integration-config.entity';
import { Course } from '../core/entities/course.entity';
import { Enrollment } from '../core/entities/enrollment.entity';
import { OrganizationMembership } from '../core/entities/organization-membership.entity';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(IntegrationConfig) private configRepository: Repository<IntegrationConfig>,
    @InjectRepository(Course) private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment) private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(OrganizationMembership) private membershipRepository: Repository<OrganizationMembership>,
  ) {}

  async configureIntegration(tenantId: string, provider: string, domain: string, accessToken: string) {
    let config = await this.configRepository.findOne({ where: { organizationId: tenantId, provider } });
    
    // Simplistic encryption/decryption could be added here. For MVP, we store plaintext or basic hash depending on requirements.
    // Usually, tokens are encrypted with a KMS.
    if (!config) {
      config = this.configRepository.create({
        organizationId: tenantId,
        provider,
        domain,
        accessToken, // In a production app, encrypt this before saving
      });
    } else {
      config.domain = domain;
      config.accessToken = accessToken;
      config.isActive = true;
    }

    await this.configRepository.save(config);
    return { success: true, message: `Successfully configured ${provider} integration` };
  }

  async triggerManualSync(tenantId: string) {
    const config = await this.configRepository.findOne({ where: { organizationId: tenantId, isActive: true } });
    if (!config) throw new BadRequestException('No active integration found for this tenant');
    
    // Run the sync async, don't await the whole thing for the HTTP response
    this.syncTenantData(config).catch(err => this.logger.error(`Manual sync failed: ${err.message}`));
    
    return { success: true, message: 'Sync triggered successfully. It will run in the background.' };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledSyncs() {
    this.logger.debug('Running scheduled background task: Syncing LMS data...');
    const activeConfigs = await this.configRepository.find({ where: { isActive: true } });
    
    for (const config of activeConfigs) {
      try {
        await this.syncTenantData(config);
      } catch (err: any) {
        this.logger.error(`Failed to sync tenant ${config.organizationId} using ${config.provider}: ${err.message}`);
      }
    }
  }

  private async syncTenantData(config: IntegrationConfig) {
    this.logger.log(`Starting sync for Organization ${config.organizationId} via ${config.provider}`);
    
    if (config.provider === 'canvas') {
      await this.syncCanvasLms(config);
    } else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  // --- Canvas LMS Adapter Logic ---
  
  private async syncCanvasLms(config: IntegrationConfig) {
    const baseUrl = config.domain.endsWith('/') ? config.domain.slice(0, -1) : config.domain;
    const headers = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Accept': 'application/json'
    };

    // 1. Fetch Courses
    // For a real Canvas API we paginate, but for the MVP adapter we fetch the first page.
    let coursesRes;
    try {
      const response = await fetch(`${baseUrl}/api/v1/courses?per_page=50`, { headers });
      if (!response.ok) throw new Error(`Canvas API error: ${response.statusText}`);
      coursesRes = await response.json();
    } catch (e: any) {
      this.logger.error(`Error fetching courses from Canvas: ${e.message}`);
      throw e;
    }

    // 2. Sync Courses
    for (const canvasCourse of coursesRes) {
      if (!canvasCourse.id) continue;
      
      let course = await this.courseRepository.findOne({ where: { externalId: canvasCourse.id.toString(), organizationId: config.organizationId } });
      if (!course) {
        course = this.courseRepository.create({
          organizationId: config.organizationId,
          externalId: canvasCourse.id.toString(),
          name: canvasCourse.name || canvasCourse.original_name,
          code: canvasCourse.course_code || `COURSE-${canvasCourse.id}`,
        });
        await this.courseRepository.save(course);
        this.logger.debug(`Created course: ${course.name}`);
      }

      // 3. Fetch Enrollments for this course
      await this.syncCanvasEnrollments(config, course, headers, baseUrl, canvasCourse.id);
    }
  }

  private async syncCanvasEnrollments(config: IntegrationConfig, course: Course, headers: any, baseUrl: string, canvasCourseId: number) {
    let enrollmentsRes;
    try {
      const response = await fetch(`${baseUrl}/api/v1/courses/${canvasCourseId}/enrollments?per_page=100`, { headers });
      if (!response.ok) return; // Skip if error fetching enrollments
      enrollmentsRes = await response.json();
    } catch (e) {
      return;
    }

    for (const enr of enrollmentsRes) {
      if (!enr.user || !enr.user.id) continue;
      const canvasUser = enr.user;

      // Ensure User exists in global table
      let user = await this.userRepository.findOne({ where: { externalId: canvasUser.id.toString(), externalProvider: 'canvas' } });
      
      if (!user) {
        // Look up by email if provided, to link existing users
        const email = canvasUser.login_id || canvasUser.email || `canvas_${canvasUser.id}@mock.domain`;
        user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
          user = this.userRepository.create({
            name: canvasUser.name || canvasUser.short_name,
            email: email,
            passwordHash: crypto.randomBytes(16).toString('hex'), // They will use SSO/Canvas to login, no password needed
            externalId: canvasUser.id.toString(),
            externalProvider: 'canvas',
          });
          await this.userRepository.save(user);
        } else {
          // Link existing user to external ID
          user.externalId = canvasUser.id.toString();
          user.externalProvider = 'canvas';
          await this.userRepository.save(user);
        }
      }

      // Ensure Organization Membership
      const role = (enr.type === 'TeacherEnrollment' || enr.type === 'TaEnrollment') ? 'faculty' : 'student';
      
      let membership = await this.membershipRepository.findOne({ where: { userId: user.id, organizationId: config.organizationId } });
      if (!membership) {
        membership = this.membershipRepository.create({
          userId: user.id,
          organizationId: config.organizationId,
          role: role,
        });
        await this.membershipRepository.save(membership);
      }

      // Ensure Course Enrollment
      let enrollment = await this.enrollmentRepository.findOne({ where: { userId: user.id, courseId: course.id } });
      if (!enrollment) {
        enrollment = this.enrollmentRepository.create({
          organizationId: config.organizationId,
          userId: user.id,
          courseId: course.id,
          role: role,
        });
        await this.enrollmentRepository.save(enrollment);
      }
    }
  }
}
