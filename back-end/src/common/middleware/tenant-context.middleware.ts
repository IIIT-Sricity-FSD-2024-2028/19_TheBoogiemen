/**
 * tenant-context.middleware.ts — which college a request belongs to.
 *
 * The college comes from the verified session token (college_id claim), not
 * from `x-tenant-id` / `tenant_code` headers: those are client-controlled, so
 * trusting them let any caller claim any college. The resolved college is
 * attached as `req.tenantContext` and echoed in the `X-Tenant-ID` response
 * header for tracing. Data access itself is scoped by core/scope.ts.
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InMemoryDbService } from '../../database/in-memory-db.service';
import { requestIdentity } from './request-identity';

export interface TenantContext {
  tenantId: string | null;
  tenantCode: string | null;
  tenantName: string | null;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly db: InMemoryDbService, private readonly jwt: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { collegeId } = requestIdentity(req, this.jwt);
    const college = collegeId ? this.db.colleges.find((c: any) => c.college_id === collegeId) : null;
    const context: TenantContext = {
      tenantId: college?.college_id ?? null,
      tenantCode: college?.code ?? null,
      tenantName: college?.name ?? null,
    };
    (req as any).tenantContext = context;
    if (context.tenantId) res.setHeader('X-Tenant-ID', context.tenantId);
    next();
  }
}
