import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>('roles', context.getHandler());
    if (!required) return true;
    const req = context.switchToHttp().getRequest();
    let role = req.headers['x-user-role'];
    if (!role) throw new ForbiddenException('Missing x-user-role header');

    // Role mapping for frontend-backend parity
    if (role === 'head') role = 'academic_head';
    if (role === 'superuser') role = 'admin';

    if (!required.includes(role)) throw new ForbiddenException(`Insufficient role: ${role} not in [${required.join(',')}]`);
    return true;
  }
}
