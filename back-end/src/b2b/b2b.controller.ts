import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { B2bService } from './b2b.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiHeader, ApiBody } from '@nestjs/swagger';

@ApiTags('B2B Operations')
@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) {}

  @Post('api-keys')
  @Roles('institution_owner', 'institution_admin')
  @ApiOperation({ summary: 'Generate a new B2B API Key (Admin Only)' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner or admin' })
  @ApiBody({ schema: { type: 'object', properties: { name: { type: 'string' } } } })
  async generateApiKey(@Req() req: any, @Body('name') name: string) {
    return this.b2bService.generateApiKey(req.tenantId, name);
  }

  @Get('api-keys')
  @Roles('institution_owner', 'institution_admin')
  @ApiOperation({ summary: 'List all active API Keys for this tenant' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner or admin' })
  async listApiKeys(@Req() req: any) {
    return this.b2bService.listApiKeys(req.tenantId);
  }

  @Delete('api-keys/:id')
  @Roles('institution_owner', 'institution_admin')
  @ApiOperation({ summary: 'Revoke an API Key' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner or admin' })
  async revokeApiKey(@Req() req: any, @Param('id') id: string) {
    return this.b2bService.revokeApiKey(req.tenantId, id);
  }

  // --- Example B2B Endpoint (Accessible via API Key or Session) ---

  @Get('users')
  // Depending on how AuthGuard evaluates API keys vs Sessions, 
  // it might need an ApiKeyGuard. For MVP, we assume TenantGuard is validating the x-organization-id header,
  // and we'd enforce the API key specifically if there is no session token.
  @ApiOperation({ summary: 'List all users in the tenant (Integration API)' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'authorization', description: 'Bearer {API_KEY}' })
  async getTenantUsers(@Req() req: any) {
    return this.b2bService.getTenantUsers(req.tenantId);
  }
}
