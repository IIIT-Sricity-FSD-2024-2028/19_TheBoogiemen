/**
 * requires-module.guard.ts — the enforcement half of bug 3 in
 * SPOC_BILLING_ENFORCEMENT_DIAGNOSIS.md §4: forum/research/fees routes ran
 * unconditionally regardless of what the college's subscription opted into.
 *
 * Opt-in, not deny-by-default like RolesGuard: most routes are "core" tier
 * (courses, attendance, marks, timetable...) and carry no @RequiresModule()
 * at all, in which case this guard is a no-op. Only the routes in the
 * diagnosis doc's §4 table declare one.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InMemoryDbService } from '../../database/in-memory-db.service';
import { assertModuleEnabled } from '../billing/subscription';
import type { PricedModule } from '../../billing/dto/estimate.dto';

export const REQUIRES_MODULE_KEY = 'requiresModule';

export const RequiresModule = (module: PricedModule) =>
  SetMetadata(REQUIRES_MODULE_KEY, module);

@Injectable()
export class RequiresModuleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private db: InMemoryDbService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const requiredModule = this.reflector.getAllAndOverride<
      PricedModule | undefined
    >(REQUIRES_MODULE_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredModule) return true; // core tier — nothing to check

    const request = context.switchToHttp().getRequest();
    const collegeId: string | null = request.user?.college_id ?? null;
    // Throws ForbiddenException itself (MODULE_NOT_LICENSED / SUBSCRIPTION_EXPIRED).
    assertModuleEnabled(this.db, collegeId, requiredModule);
    return true;
  }
}
