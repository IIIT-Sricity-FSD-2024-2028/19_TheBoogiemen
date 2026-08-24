import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';

@Injectable()
export class AuthService {
  constructor(private db: InMemoryDbService) {}

  async login(email: string, password: string, tenantCode?: string) {
    let user = this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      user = this.db.users.find((u) => u.username.toLowerCase() === email.toLowerCase() && u.password === password);
    }
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Determine Tenant Context
    let tenant = this.db.tenants.find((t) => t.tenant_id === user.tenant_id);
    if (!tenant && tenantCode) {
      tenant = this.db.tenants.find((t) => t.code.toLowerCase() === tenantCode.toLowerCase());
    }
    if (!tenant && user.tenant_id !== 'global') {
      tenant = this.db.tenants[0];
    }

    const student = this.db.students.find((s) => s.user_id === user.user_id);
    const faculty = this.db.faculty.find((f) => f.user_id === user.user_id);

    if (tenant) {
      tenant.used_tokens += 1;
    }

    // Backend Role-Based Redirection Target
    let redirectPath = '/student';
    if (user.role === 'PLATFORM_SUPER_ADMIN') redirectPath = '/saas-admin';
    else if (user.role === 'PLATFORM_SALES_SUPPORT') redirectPath = '/internal/support';
    else if (user.role === 'FINANCE_ADMIN') redirectPath = '/finance';
    else if (user.role === 'INSTITUTE_SUPER_ADMIN' || user.role === 'superadmin' || user.role === 'admin') redirectPath = '/institute-admin';
    else if (user.role === 'DEPARTMENT_ADMIN_HOD' || user.role === 'head') redirectPath = '/hod';
    else if (user.role === 'faculty') redirectPath = '/faculty';

    // Generate Tokens
    const accessToken = `jwt_acc_${user.user_id}_${tenant?.tenant_id || 'global'}_${Date.now()}`;
    const refreshToken = `jwt_ref_${user.user_id}_${Math.random().toString(36).substring(2, 15)}`;

    this.db.active_sessions[refreshToken] = {
      refresh_token: refreshToken,
      user_id: user.user_id,
      tenant_id: tenant?.tenant_id || 'global',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: 3600,
      redirect_path: redirectPath,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name || `${student?.first_name || faculty?.first_name || user.username}`,
        first_name: student?.first_name || faculty?.first_name || user.username,
        last_name: student?.last_name || faculty?.last_name || '',
      },
      tenant: tenant
        ? {
            tenant_id: tenant.tenant_id,
            name: tenant.name,
            code: tenant.code,
            logo: tenant.logo,
            primary_color: tenant.primary_color,
            subscription_tier: tenant.subscription_tier,
            monthly_token_quota: tenant.monthly_token_quota,
            used_tokens: tenant.used_tokens,
          }
        : { tenant_id: 'global', name: 'SaaS Platform Owner', code: 'PLATFORM', subscription_tier: 'Enterprise' },
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const session = this.db.active_sessions[refreshToken];
    if (!session || session.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = this.db.users.find((u) => u.user_id === session.user_id);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const newAccessToken = `jwt_acc_${user.user_id}_${session.tenant_id}_${Date.now()}`;
    const newRefreshToken = `jwt_ref_${user.user_id}_${Math.random().toString(36).substring(2, 15)}`;

    delete this.db.active_sessions[refreshToken];
    this.db.active_sessions[newRefreshToken] = {
      refresh_token: newRefreshToken,
      user_id: user.user_id,
      tenant_id: session.tenant_id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
    };
  }

  async changePassword(userId: string, current: string, newPass: string) {
    const user = this.db.users.find((u) => u.user_id === userId);
    if (!user || user.password !== current) {
      throw new UnauthorizedException('Current password incorrect');
    }
    user.password = newPass;
    return { success: true, message: 'Password updated successfully' };
  }
}
