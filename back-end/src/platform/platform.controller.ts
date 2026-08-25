import { Controller, Get, Post, Body, Param, Headers, Query, BadRequestException } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { FileLoggerService } from '../common/services/file-logger.service';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('B2B SaaS Platform & System Logs')
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly fileLogger: FileLoggerService
  ) {}

  @Get('tenants')
  @ApiOperation({ summary: 'Get all subscribed educational institutions' })
  getAllTenants() {
    return this.platformService.getAllTenants();
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get tenant details by ID or code' })
  getTenantById(@Param('id') id: string) {
    return this.platformService.getTenantById(id);
  }

  @Post('tenants/onboard')
  @ApiOperation({ summary: 'Onboard a new educational institution / institute subscription' })
  onboardTenant(
    @Body() body: { name: string; code: string; domain: string; subscription_tier: string; contact_email: string; logo?: string },
  ) {
    return this.platformService.onboardTenant(body);
  }

  @Get('subscriptions/plans')
  @ApiOperation({ summary: 'List all available B2B subscription pricing plans' })
  getSubscriptionPlans() {
    return this.platformService.getSubscriptionPlans();
  }

  @Post('subscriptions/upgrade')
  @ApiOperation({ summary: 'Upgrade institute subscription tier' })
  upgradeSubscription(@Body() body: { tenant_id: string; plan_tier: string }) {
    if (!body.tenant_id || !body.plan_tier) {
      throw new BadRequestException('tenant_id and plan_tier are required');
    }
    return this.platformService.upgradeSubscription(body.tenant_id, body.plan_tier);
  }

  @Get('tokens/meter')
  @ApiOperation({ summary: 'Get API token quota and consumption meter for an institute' })
  @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID or Code (e.g., t1 or IIITS)' })
  getTokenMeter(@Headers('x-tenant-id') tenantIdHeader: string, @Query('tenant_id') tenantIdQuery: string) {
    const tenantId = tenantIdHeader || tenantIdQuery || 't1';
    return this.platformService.getTokenUsage(tenantId);
  }

  @Get('tokens/keys')
  @ApiOperation({ summary: 'Get API Keys issued for institute ERP/Integration' })
  getApiKeys(@Headers('x-tenant-id') tenantIdHeader: string, @Query('tenant_id') tenantIdQuery: string) {
    const tenantId = tenantIdHeader || tenantIdQuery || 't1';
    return this.platformService.getApiKeys(tenantId);
  }

  @Post('tokens/keys/generate')
  @ApiOperation({ summary: 'Generate a new API Key for institute integration' })
  generateApiKey(@Headers('x-tenant-id') tenantIdHeader: string, @Body() body: { tenant_id?: string; name: string }) {
    const tenantId = tenantIdHeader || body.tenant_id || 't1';
    return this.platformService.generateApiKey(tenantId, body.name);
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get complete institutional actor hierarchy & seat usage' })
  getInstituteHierarchy(@Headers('x-tenant-id') tenantIdHeader: string, @Query('tenant_id') tenantIdQuery: string) {
    const tenantId = tenantIdHeader || tenantIdQuery || 't1';
    return this.platformService.getInstituteHierarchy(tenantId);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit compliance logs for an institute' })
  getAuditLogs(@Headers('x-tenant-id') tenantIdHeader: string, @Query('tenant_id') tenantIdQuery: string) {
    const tenantId = tenantIdHeader || tenantIdQuery || 't1';
    return this.platformService.getAuditLogs(tenantId);
  }

  @Post('audit-logs')
  @ApiOperation({ summary: 'Record administrative audit log' })
  recordAuditLog(
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Headers('user-id') userIdHeader: string,
    @Body() body: { tenant_id?: string; user_id?: string; action: string; details: string },
  ) {
    const tenantId = tenantIdHeader || body.tenant_id || 't1';
    const userId = userIdHeader || body.user_id || 'u3_inst';
    return this.platformService.recordAuditLog(tenantId, userId, body.action, body.details);
  }

  // ── Evaluation Criteria: Log and Error Management Endpoints ──
  @Get('logs')
  @ApiOperation({ summary: 'Retrieve system log files (access, app, error, audit)' })
  getSystemLogs(
    @Query('type') type: 'access' | 'app' | 'error' | 'audit' = 'app',
    @Query('limit') limit: string = '100'
  ) {
    const count = parseInt(limit, 10) || 100;
    const lines = this.fileLogger.getRecentLogs(type, count);
    return {
      success: true,
      log_type: type,
      total_lines: lines.length,
      lines,
    };
  }
}
