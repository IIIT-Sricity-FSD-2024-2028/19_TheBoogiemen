import { Injectable, CanActivate, ExecutionContext, SetMetadata, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const roleHeader = request.headers['role'];
    const authHeader = request.headers['authorization'];

    // Determine user role from header or mock token
    let userRole = roleHeader;

    if (!userRole && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      if (token.includes('saasadmin')) userRole = 'PLATFORM_SUPER_ADMIN';
      else if (token.includes('sales')) userRole = 'PLATFORM_SALES_SUPPORT';
      else if (token.includes('techsupport')) userRole = 'PLATFORM_TECH_SUPPORT';
      else if (token.includes('director')) userRole = 'INSTITUTE_SUPER_ADMIN';
      else if (token.includes('finance')) userRole = 'FINANCE_ADMIN';
      else if (token.includes('hod') || token.includes('head')) userRole = 'DEPARTMENT_ADMIN_HOD';
      else if (token.includes('faculty')) userRole = 'faculty';
      else if (token.includes('student')) userRole = 'student';
    }

    if (!userRole) {
      throw new UnauthorizedException('Authentication role header or bearer token required');
    }

    // Role Alias Mapping matrix
    const roleMap: Record<string, string[]> = {
      FINANCE_ADMIN: ['FINANCE_ADMIN', 'finance_admin'],
      PLATFORM_SUPER_ADMIN: ['PLATFORM_SUPER_ADMIN', 'globaladmin'],
      PLATFORM_SALES_SUPPORT: ['PLATFORM_SALES_SUPPORT', 'support'],
      PLATFORM_TECH_SUPPORT: ['PLATFORM_TECH_SUPPORT', 'support'],
      INSTITUTE_SUPER_ADMIN: ['INSTITUTE_SUPER_ADMIN', 'superadmin', 'admin'],
      DEPARTMENT_ADMIN_HOD: ['DEPARTMENT_ADMIN_HOD', 'head'],
      faculty: ['faculty', 'FACULTY_MENTOR'],
      student: ['student', 'STUDENT'],
    };

    const userEquivalentRoles = roleMap[userRole] || [userRole];

    const hasAccess = requiredRoles.some((reqRole) =>
      userEquivalentRoles.includes(reqRole) || (roleMap[reqRole] && roleMap[reqRole].includes(userRole))
    );

    if (!hasAccess) {
      throw new ForbiddenException(`Backend Authorization Error: Role "${userRole}" is forbidden from accessing this resource`);
    }

    return true;
  }
}
