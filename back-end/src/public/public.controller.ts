import { Controller, Post, Get, Body } from '@nestjs/common';
import { PublicService } from './public.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Public Forms')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Post('contact')
  @ApiOperation({ summary: 'Submit a general contact or support form' })
  @ApiBody({ schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, message: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Form submitted successfully' })
  async submitContact(@Body() body: any) {
    // Basic validation
    if (!body.email || !body.message) {
      return { success: false, message: 'Email and message are required.' };
    }
    return this.publicService.submitContactForm(body);
  }

  @Post('institutions/applications')
  @ApiOperation({ summary: 'Submit a new B2B institution onboarding application' })
  @ApiBody({ schema: { type: 'object', properties: { institutionName: { type: 'string' }, email: { type: 'string' }, size: { type: 'number' }, plan: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  async submitApplication(@Body() body: any) {
    if (!body.institutionName || !body.email) {
      return { success: false, message: 'Institution Name and Email are required.' };
    }
    return this.publicService.submitApplication(body);
  }
}
