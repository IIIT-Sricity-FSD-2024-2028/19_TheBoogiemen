import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';

@Injectable()
export class PlatformService {
  constructor(private db: InMemoryDbService) {}

  // ── SaaS Platform & Tenants ──
  getAllTenants() {
    return this.db.tenants;
  }

  getTenantById(tenantId: string) {
    const tenant = this.db.tenants.find((t) => t.tenant_id === tenantId || t.code.toLowerCase() === tenantId.toLowerCase());
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    return tenant;
  }

  onboardTenant(data: { name: string; code: string; domain: string; subscription_tier: string; contact_email: string; logo?: string }) {
    if (!data.name || !data.code || !data.domain || !data.subscription_tier || !data.contact_email) {
      throw new BadRequestException('All fields (name, code, domain, subscription_tier, contact_email) are required');
    }

    const existing = this.db.tenants.find((t) => t.code.toLowerCase() === data.code.toLowerCase() || t.domain.toLowerCase() === data.domain.toLowerCase());
    if (existing) {
      throw new BadRequestException(`Tenant with code "${data.code}" or domain "${data.domain}" already exists`);
    }

    const plan = this.db.subscription_plans.find((p) => p.tier.toLowerCase() === data.subscription_tier.toLowerCase()) || this.db.subscription_plans[0];

    const tenantId = `t${Date.now()}`;
    const newTenant = {
      tenant_id: tenantId,
      name: data.name,
      code: data.code.toUpperCase(),
      domain: data.domain,
      logo: data.logo || '🏫',
      primary_color: '#4f46e5',
      subscription_tier: plan.tier,
      status: 'active',
      seats_allocated: plan.seat_limit,
      seats_used: 1,
      monthly_token_quota: plan.token_quota,
      used_tokens: 0,
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contact_email: data.contact_email,
      created_at: new Date().toISOString(),
    };

    this.db.tenants.push(newTenant);

    // Create default Institute Super Admin for this new tenant
    const adminId = `u_${Date.now()}`;
    const adminUser = {
      user_id: adminId,
      tenant_id: tenantId,
      username: `admin_${data.code.toLowerCase()}`,
      password: 'Pass@123',
      email: data.contact_email,
      role: 'INSTITUTE_SUPER_ADMIN',
      name: `Director (${data.name})`,
    };

    this.db.users.push(adminUser);

    return {
      success: true,
      message: `Tenant "${data.name}" successfully onboarded!`,
      tenant: newTenant,
      admin_credentials: {
        email: adminUser.email,
        password: 'Pass@123',
        role: adminUser.role,
      },
    };
  }

  // ── Subscriptions ──
  getSubscriptionPlans() {
    return this.db.subscription_plans;
  }

  upgradeSubscription(tenantId: string, planTier: string) {
    const tenant = this.getTenantById(tenantId);
    const plan = this.db.subscription_plans.find((p) => p.tier.toLowerCase() === planTier.toLowerCase());
    if (!plan) {
      throw new BadRequestException(`Invalid plan tier: ${planTier}`);
    }

    tenant.subscription_tier = plan.tier;
    tenant.seats_allocated = plan.seat_limit;
    tenant.monthly_token_quota = plan.token_quota;

    return {
      success: true,
      message: `Subscription for ${tenant.name} upgraded to ${plan.tier}`,
      tenant,
    };
  }

  // ── Token Management & Metering ──
  getTokenUsage(tenantId: string) {
    const tenant = this.getTenantById(tenantId);
    const remainingTokens = Math.max(0, tenant.monthly_token_quota - tenant.used_tokens);
    const usagePercentage = Math.min(100, Math.round((tenant.used_tokens / tenant.monthly_token_quota) * 100));

    const keys = this.db.api_keys.filter((k) => k.tenant_id === tenant.tenant_id);

    return {
      tenant_id: tenant.tenant_id,
      tenant_name: tenant.name,
      subscription_tier: tenant.subscription_tier,
      monthly_quota: tenant.monthly_token_quota,
      used_tokens: tenant.used_tokens,
      remaining_tokens: remainingTokens,
      usage_percentage: usagePercentage,
      api_keys_active: keys.length,
    };
  }

  generateApiKey(tenantId: string, name: string) {
    const tenant = this.getTenantById(tenantId);
    const keyToken = `bk_live_${tenant.code.toLowerCase()}_${Math.random().toString(36).substring(2, 12)}`;
    const apiKeyObj = {
      key_id: `k_${Date.now()}`,
      tenant_id: tenant.tenant_id,
      name: name || 'Integrated Service Key',
      key_token: keyToken,
      created_at: new Date().toISOString(),
      status: 'active',
    };
    this.db.api_keys.push(apiKeyObj);

    return {
      success: true,
      message: 'API Key generated successfully',
      api_key: apiKeyObj,
    };
  }

  getApiKeys(tenantId: string) {
    const tenant = this.getTenantById(tenantId);
    return this.db.api_keys.filter((k) => k.tenant_id === tenant.tenant_id);
  }

  // ── Hierarchy & User Management ──
  getInstituteHierarchy(tenantId: string) {
    const tenant = this.getTenantById(tenantId);
    const tenantUsers = this.db.users.filter((u) => u.tenant_id === tenant.tenant_id);
    const depts = this.db.departments.filter((d) => d.tenant_id === tenant.tenant_id);

    const superAdmins = tenantUsers.filter((u) => u.role === 'INSTITUTE_SUPER_ADMIN' || u.role === 'superadmin');
    const hods = tenantUsers.filter((u) => u.role === 'DEPARTMENT_ADMIN_HOD' || u.role === 'head');
    const faculty = tenantUsers.filter((u) => u.role === 'faculty');
    const students = tenantUsers.filter((u) => u.role === 'student');
    const parents = tenantUsers.filter((u) => u.role === 'parent');

    return {
      tenant: {
        id: tenant.tenant_id,
        name: tenant.name,
        code: tenant.code,
        seats: { allocated: tenant.seats_allocated, used: tenant.seats_used },
      },
      departments: depts,
      hierarchy: {
        director_super_admin: superAdmins,
        department_heads: hods,
        faculty_mentors: faculty,
        students: students,
        parents: parents,
      },
    };
  }

  recordAuditLog(tenantId: string, userId: string, action: string, details: string) {
    const log = {
      log_id: `al_${Date.now()}`,
      tenant_id: tenantId,
      user_id: userId,
      action: action,
      details: details,
      timestamp: new Date().toISOString(),
    };
    this.db.audit_logs.push(log);
    return log;
  }

  getAuditLogs(tenantId: string) {
    return this.db.audit_logs.filter((l) => l.tenant_id === tenantId);
  }
}
