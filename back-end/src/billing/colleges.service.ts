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
import { PRICED_MODULES, PricedModule } from './dto/estimate.dto';
import { getActiveSubscription, isExpired, planStatus } from '../common/billing/subscription';

export function sanitizeUser<T extends Record<string, any>>(user: T): Partial<T> {
  const { password, password_hash, ...safe } = user ?? {};
  return safe as Partial<T>;
}

export interface CreateCollegeAndSpocParams {
  collegeName: string;
  city?: string | null;
  state?: string | null;
  type?: string | null;
  spocEmail: string;
  spocFirstName?: string;
  spocLastName?: string;
  spocPhone?: string;
  /**
   * Already hashed — this function never hashes a password itself. The two
   * callers hash under different circumstances (one generates a password if
   * none was given, one already has a hash sitting in a draft session) and
   * neither should be duplicated here just to keep this signature uniform.
   */
  spocPasswordHash: string;
}

@Injectable()
export class CollegesService {
  constructor(
    private readonly db: InMemoryDbService,
    private readonly passwordService: PasswordService,
    @InjectPinoLogger(CollegesService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * The one place "create a college and its SPOC" happens. Two callers:
   * this.create() below (superadmin, manual/exceptional onboarding) and
   * OnboardingService's payment-fulfillment step (self-service, the primary
   * path per ONBOARDING_PIPELINE_PLAN.md). Factored out specifically so
   * those two paths cannot drift — a bug fixed in one is fixed in both,
   * because there is only one implementation to fix.
   */
  async createCollegeAndSpoc(params: CreateCollegeAndSpocParams) {
    if (this.db.users.find((u) => u.email === params.spocEmail)) {
      throw new BadRequestException(
        errorBody(ErrorCode.DUPLICATE_RESOURCE, 'Email already exists'),
      );
    }

    const collegeId = `col${Date.now()}`;
    const college = {
      college_id: collegeId,
      name: params.collegeName,
      city: params.city ?? null,
      state: params.state ?? null,
      type: params.type ?? null,
      status: 'active' as const,
      created_at: new Date().toISOString(),
    };
    this.db.colleges.push(college);

    const userId = `u${Date.now()}s`;
    const firstName = params.spocFirstName || params.spocEmail.split('@')[0];
    const spocUser = {
      user_id: userId,
      username: firstName,
      first_name: firstName,
      last_name: params.spocLastName || '',
      email: params.spocEmail,
      phone: params.spocPhone || '',
      role: 'spoc' as const,
      college_id: collegeId,
      password_hash: params.spocPasswordHash,
    };
    this.db.users.push(spocUser);

    this.logger.info(
      { collegeId, spocUserId: userId },
      'College and SPOC provisioned',
    );

    return { college, spocUser };
  }

  /** Superadmin-driven provisioning — manual/exceptional onboarding, no payment involved. */
  async create(dto: CreateCollegeDto) {
    // No delivery channel exists for this credential yet (NotificationService
    // is a logged stub — see its own docstring). A generated password is
    // returned once, in this response only — there is no other way to hand
    // the SPOC their first password during the demo phase.
    const generated = !dto.spoc.password;
    const password = dto.spoc.password ?? randomTempPassword();

    const { college, spocUser } = await this.createCollegeAndSpoc({
      collegeName: dto.college.name,
      city: dto.college.city,
      state: dto.college.state,
      type: dto.college.type,
      spocEmail: dto.spoc.email,
      spocFirstName: dto.spoc.first_name,
      spocLastName: dto.spoc.last_name,
      spocPhone: dto.spoc.phone,
      spocPasswordHash: await this.passwordService.hash(password),
    });

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

  /** Cheap, read-only rollups, plus the plan/renewal fields the SPOC
   *  dashboard reads (SPOC_BILLING_ENFORCEMENT_DIAGNOSIS.md bug 1). `plan` is
   *  null for a college with no subscription row — the superadmin manual
   *  path (§5.2) — same "no subscription = unlimited" convention every other
   *  billing call site uses. */
  private withStats(college: any) {
    const collegeUsers = this.db.users.filter(
      (u) => u.college_id === college.college_id,
    );
    const sub = getActiveSubscription(this.db, college.college_id);
    // The price charged is on the quote that produced this subscription, not
    // the subscription row itself — quotes.breakdown is the one place a
    // priced number is ever stored (see pricing.service.ts's docstring on
    // why a preview price and a charged price must share one computation,
    // not be recomputed here from current rates).
    const quote = sub
      ? this.db.quotes.find((q: any) => q.quote_id === sub.quote_id)
      : null;
    return {
      ...college,
      spoc_email:
        collegeUsers.find((u) => u.role === 'spoc')?.email ?? null,
      admin_count: collegeUsers.filter((u) => u.role === 'admin').length,
      student_count: collegeUsers.filter((u) => u.role === 'student').length,
      faculty_count: collegeUsers.filter((u) => u.role === 'faculty').length,
      plan: sub
        ? {
            student_seats: sub.student_seats,
            faculty_seats: sub.faculty_seats,
            modules: sub.modules,
            starts_on: sub.starts_on,
            ends_on: sub.ends_on,
            status: planStatus(sub),
            // Annual, the same figure computeQuote() priced and payment
            // captured — null only if the quote row itself is ever missing.
            payable_paise: quote?.breakdown?.payable_paise ?? null,
          }
        : null,
    };
  }

  /** The caller's own college's licensed modules — for hiding nav items a
   *  student/faculty dashboard has no server-side access to anyway. The
   *  real gate is RequiresModuleGuard on each route; this only avoids
   *  offering a link that would 403. Unlimited (all modules) for a null
   *  collegeId (superadmin) or a college with no subscription row, matching
   *  assertModuleEnabled()'s own convention. An expired plan licenses none. */
  async getMyModules(collegeId: string | null): Promise<PricedModule[]> {
    const sub = getActiveSubscription(this.db, collegeId);
    if (!sub) return [...PRICED_MODULES];
    return isExpired(sub) ? [] : sub.modules;
  }
}

function randomTempPassword(): string {
  // Not a security boundary — it is shown once, in a superadmin-only
  // response, to be relayed out of band. Readable-but-random is enough.
  return 'Bp' + Math.random().toString(36).slice(2, 10) + '!1';
}
