import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>('roles', context.getHandler());
    if (!required) return true;
    const req = context.switchToHttp().getRequest();
    const role = req.headers['x-user-role'];
    if (!role) throw new ForbiddenException('Missing x-user-role header');
    if (!required.includes(role)) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
