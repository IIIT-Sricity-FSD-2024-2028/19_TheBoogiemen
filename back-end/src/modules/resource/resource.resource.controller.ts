import { Controller, Post, Body, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ResourceService } from './resource.resource.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ScheduleEventInputDto } from './dto/schedule-event.input.dto';
import { EventOutputDto } from './dto/event.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';

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
}
