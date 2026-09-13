import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { InMemoryDbService } from '../../database/in-memory-db.service';

export interface TenantContext {
  tenantId: string;
  tenantCode: string;
  tenantName?: string;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly db: InMemoryDbService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const rawHeader = req.headers['x-tenant-id'] as string;
    const rawCode = (req.headers['tenant_code'] || req.headers['x-tenant-code']) as string;
    const user = (req as any).user;

    // Resolve tenant identifier
    let tenantId = rawHeader || user?.tenant_id || 't1';
    let tenantCode = rawCode || user?.tenant_code || 'IIITS';

    // Verify against in-memory colleges/tenants if present
    const college = this.db.colleges?.find(
      (c: any) => c.college_id === tenantId || c.code?.toLowerCase() === tenantCode.toLowerCase()
    );

    const context: TenantContext = {
      tenantId: college?.college_id || tenantId,
      tenantCode: college?.code || tenantCode,
      tenantName: college?.name || 'Default Campus',
    };

    (req as any).tenantContext = context;
    res.setHeader('X-Tenant-ID', context.tenantId);

    next();
  }
}
