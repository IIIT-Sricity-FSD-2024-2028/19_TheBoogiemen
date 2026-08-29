/**
 * colleges.service.ts — the vendor's registry of customer colleges.
 *
 * A college and its SPOC are created together (see CreateCollegeDto's
 * docstring) and reuse the exact same primitives the rest of the app already
 * trusts for account creation: bcrypt via PasswordService, the users
 * collection, the InMemoryDbService persistence proxy. Nothing new is
 * invented for "how to create an account" — only "what a college is" is new.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { PasswordService } from '../auth/password.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { CreateCollegeDto } from './dto/create-college.dto';

function sanitizeUser<T extends Record<string, any>>(user: T): Partial<T> {
  const { password, password_hash, ...safe } = user ?? {};
  return safe as Partial<T>;
}

@Injectable()
export class CollegesService {
  constructor(
    private readonly db: InMemoryDbService,
    private readonly passwordService: PasswordService,
    @InjectPinoLogger(CollegesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateCollegeDto) {
    if (this.db.users.find((u) => u.email === dto.spoc.email)) {
      throw new BadRequestException(
        errorBody(ErrorCode.DUPLICATE_RESOURCE, 'Email already exists'),
      );
    }

    const collegeId = `col${Date.now()}`;
    const college = {
      college_id: collegeId,
      name: dto.college.name,
      city: dto.college.city ?? null,
      state: dto.college.state ?? null,
      type: dto.college.type ?? null,
      status: 'active' as const,
      created_at: new Date().toISOString(),
    };
    this.db.colleges.push(college);

    // No delivery channel exists for this credential yet (NotificationService
    // is a logged stub — see its own docstring). A generated password is
    // returned once, in this response only, exactly like the admin-creation
    // flow already returns nothing sensitive back but here there is no other
    // way to hand the SPOC their first password during the demo phase.
    const generated = !dto.spoc.password;
    const password = dto.spoc.password ?? randomTempPassword();

    const userId = `u${Date.now()}s`;
    const firstName = dto.spoc.first_name || dto.spoc.email.split('@')[0];
    const spocUser = {
      user_id: userId,
      username: firstName,
      first_name: firstName,
      last_name: dto.spoc.last_name || '',
      email: dto.spoc.email,
      phone: dto.spoc.phone || '',
      role: 'spoc' as const,
      college_id: collegeId,
      password_hash: await this.passwordService.hash(password),
    };
    this.db.users.push(spocUser);

    this.logger.info(
      { collegeId, spocUserId: userId },
      'College and SPOC provisioned',
    );

    return {
      college,
      spoc: sanitizeUser(spocUser),
      // Only present when we generated it — never echo back a password the
      // caller supplied themselves.
      ...(generated ? { generated_password: password } : {}),
    };
  }

  async findAll() {
    return this.db.colleges.map((c) => this.withStats(c));
  }

  async findOne(collegeId: string) {
    const college = this.db.colleges.find((c) => c.college_id === collegeId);
    if (!college) {
      throw new BadRequestException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'College not found'),
      );
    }
    const admins = this.db.users
      .filter((u) => u.college_id === collegeId && u.role === 'admin')
      .map(sanitizeUser);
    const spoc = this.db.users
      .filter((u) => u.college_id === collegeId && u.role === 'spoc')
      .map(sanitizeUser);
    return { ...this.withStats(college), admins, spoc };
  }

  /** Cheap, read-only rollups — no subscription/revenue numbers yet (§13 of the plan). */
  private withStats(college: any) {
    const collegeUsers = this.db.users.filter(
      (u) => u.college_id === college.college_id,
    );
    return {
      ...college,
      spoc_email:
        collegeUsers.find((u) => u.role === 'spoc')?.email ?? null,
      admin_count: collegeUsers.filter((u) => u.role === 'admin').length,
      student_count: collegeUsers.filter((u) => u.role === 'student').length,
      faculty_count: collegeUsers.filter((u) => u.role === 'faculty').length,
    };
  }
}

function randomTempPassword(): string {
  // Not a security boundary — it is shown once, in a superadmin-only
  // response, to be relayed out of band. Readable-but-random is enough.
  return 'Bp' + Math.random().toString(36).slice(2, 10) + '!1';
}
