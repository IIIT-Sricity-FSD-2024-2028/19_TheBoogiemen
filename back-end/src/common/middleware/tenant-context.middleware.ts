import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InMemoryDbService } from '../../database/in-memory-db.service';

export interface TenantScopedRequest extends Request {
  tenantContext?: {
    tenantId: string;
    tenantName: string;
    tier: string;
  };
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly db: InMemoryDbService) {}

  use(req: TenantScopedRequest, res: Response, next: NextFunction) {
    const rawTenantHeader =
      (req.headers['x-tenant-id'] as string) ||
      (req.headers['tenant-id'] as string) ||
      (req.headers['tenant_code'] as string);

    let tenant: any = null;
    if (rawTenantHeader) {
      tenant = this.db.tenants.find(
        (t) =>
          t.tenant_id.toLowerCase() === rawTenantHeader.toLowerCase() ||
          t.code.toLowerCase() === rawTenantHeader.toLowerCase()
      );
    }

    if (!tenant) {
      tenant = this.db.tenants[0] || {
        tenant_id: 't1',
        name: 'IIIT Sricity',
        subscription_tier: 'Enterprise University',
      };
    }

    req.tenantContext = {
      tenantId: tenant.tenant_id,
      tenantName: tenant.name,
      tier: tenant.subscription_tier,
    };

    res.setHeader('X-Tenant-ID', tenant.tenant_id);
    res.setHeader('X-Tenant-Name', tenant.name);

    next();
  }
}
