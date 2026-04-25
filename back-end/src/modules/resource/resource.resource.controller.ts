import { Controller, Post, Body, UseGuards, SetMetadata, Get } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ResourceService } from './resource.resource.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ScheduleEventInputDto } from './dto/schedule-event.input.dto';
import { EventOutputDto } from './dto/event.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { MOCK_RESOURCES, MOCK_EVENTS } from '../../common/types/mock-data';

@ApiTags('Resource')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Post('events')
  @SetMetadata('roles', ['faculty', 'admin'])
  @ApiBody({ type: ScheduleEventInputDto })
  @ApiResponse({ status: 201, type: EventOutputDto })
  async scheduleEvent(@Body() dto: ScheduleEventInputDto) {
    const data = await this.resourceService.scheduleEvent(dto);
    return new BaseResponseDto(true, data, 'event scheduling successful');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['faculty', 'student', 'admin', 'academic_head'])
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      resources: MOCK_RESOURCES,
      events: MOCK_EVENTS
    }, 'mock data fetched');
  }
}
