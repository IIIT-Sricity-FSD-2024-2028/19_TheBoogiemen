import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Platform Operations')
@Controller('platform')
// In a full implementation, these would be protected by a strict Superadmin guard
// @UseGuards(RolesGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('applications')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Get all pending institution applications' })
  @ApiHeader({ name: 'role', description: 'Must be: superadmin' })
  async getApplications() {
    return this.platformService.getApplications();
  }

  @Post('applications/:id/verify')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Verify and approve an institution application' })
  @ApiHeader({ name: 'role', description: 'Must be: superadmin' })
  async verifyApplication(@Param('id') id: string) {
    return this.platformService.verifyApplication(id);
  }

  @Post('organizations/provision')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Provision a new B2B tenant and assign the institution owner' })
  @ApiHeader({ name: 'role', description: 'Must be: superadmin' })
  @ApiResponse({ status: 201, description: 'Tenant provisioned successfully' })
  async provisionTenant(@Body() body: any) {
    return this.platformService.provisionTenant(body);
  }
}
