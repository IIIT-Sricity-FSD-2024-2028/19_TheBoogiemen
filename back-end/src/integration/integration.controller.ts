import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiHeader, ApiBody } from '@nestjs/swagger';

@ApiTags('Integration')
@Controller('integration')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post('configure')
  @Roles('institution_owner', 'institution_admin')
  @ApiOperation({ summary: 'Configure LMS Integration credentials for the tenant' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner or admin' })
  @ApiBody({ schema: { type: 'object', properties: { provider: { type: 'string' }, domain: { type: 'string' }, accessToken: { type: 'string' } } } })
  async configureIntegration(@Req() req: any, @Body() body: any) {
    return this.integrationService.configureIntegration(req.tenantId, body.provider, body.domain, body.accessToken);
  }

  @Post('sync')
  @Roles('institution_owner', 'institution_admin')
  @ApiOperation({ summary: 'Manually trigger an LMS sync' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner or admin' })
  async triggerSync(@Req() req: any) {
    return this.integrationService.triggerManualSync(req.tenantId);
  }
}
