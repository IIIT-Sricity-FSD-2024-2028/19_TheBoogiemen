import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const className = context.getClass().name;

    if (className === 'AuthController' || className === 'AppController' || className === 'PublicController' || className === 'PlatformController') {
      return true;
    }
    
    // Check for organization ID in headers (For API clients or frontend)
    const orgId = request.headers['x-organization-id'];

    if (!orgId) {
      throw new UnauthorizedException('Tenant context is missing. Please provide x-organization-id header.');
    }

    // Attach tenantId to the request so controllers/services can use it
    request.tenantId = orgId;

    return true;
  }
}
