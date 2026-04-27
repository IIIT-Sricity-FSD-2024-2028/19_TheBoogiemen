import { Controller, Post, Body, UseGuards, SetMetadata, Get, Param, Put, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ResourceService } from './resource.resource.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EnvGuard } from '../../common/guards/env.guard';
import { ScheduleEventInputDto } from './dto/schedule-event.input.dto';
import { CreateResourceInputDto } from './dto/create-resource.input.dto';
import { UpdateResourceInputDto } from './dto/update-resource.input.dto';
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
  @UseGuards(EnvGuard)
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      resources: MOCK_RESOURCES,
      events: MOCK_EVENTS
    }, 'mock data fetched');
  }

  @Get()
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch all resources' })
  async getAllResources() {
    const data = await this.resourceService.getAllResources();
    return new BaseResponseDto(true, data, 'resources fetched successfully');
  }

  @Get(':id')
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch resource by ID' })
  async getResourceById(@Param('id') id: string) {
    const data = await this.resourceService.getResourceById(id);
    return new BaseResponseDto(true, data, 'resource fetched successfully');
  }

  @Post()
  @SetMetadata('roles', ['admin'])
  @ApiBody({ type: CreateResourceInputDto })
  @ApiResponse({ status: 201, description: 'Create resource' })
  async createResource(@Body() dto: CreateResourceInputDto) {
    const data = await this.resourceService.createResource(dto);
    return new BaseResponseDto(true, data, 'resource created successfully');
  }

  @Put(':id')
  @SetMetadata('roles', ['admin'])
  @ApiBody({ type: UpdateResourceInputDto })
  @ApiResponse({ status: 200, description: 'Full update of resource' })
  async updateResource(@Param('id') id: string, @Body() dto: UpdateResourceInputDto) {
    const data = await this.resourceService.updateResource(id, dto);
    return new BaseResponseDto(true, data, 'resource updated successfully');
  }

  @Patch(':id')
  @SetMetadata('roles', ['admin'])
  @ApiBody({ type: UpdateResourceInputDto })
  @ApiResponse({ status: 200, description: 'Partial update of resource' })
  async patchResource(@Param('id') id: string, @Body() dto: UpdateResourceInputDto) {
    const data = await this.resourceService.patchResource(id, dto);
    return new BaseResponseDto(true, data, 'resource patched successfully');
  }

  @Delete(':id')
  @SetMetadata('roles', ['admin'])
  @ApiResponse({ status: 200, description: 'Delete resource' })
  async deleteResource(@Param('id') id: string) {
    await this.resourceService.deleteResource(id);
    return new BaseResponseDto(true, null, 'resource deleted successfully');
  }

  @Get('events/all')
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch all events' })
  async getAllEvents() {
    const data = await this.resourceService.getAllEvents();
    return new BaseResponseDto(true, data, 'events fetched successfully');
  }

  @Get('events/:id')
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch event by ID' })
  async getEventById(@Param('id') id: string) {
    const data = await this.resourceService.getEventById(id);
    return new BaseResponseDto(true, data, 'event fetched successfully');
  }

  @Put('events/:id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiBody({ type: ScheduleEventInputDto })
  @ApiResponse({ status: 200, description: 'Update event' })
  async updateEvent(@Param('id') id: string, @Body() dto: ScheduleEventInputDto) {
    const data = await this.resourceService.updateEvent(id, dto);
    return new BaseResponseDto(true, data, 'event updated successfully');
  }

  @Delete('events/:id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiResponse({ status: 200, description: 'Delete event' })
  async deleteEvent(@Param('id') id: string) {
    await this.resourceService.deleteEvent(id);
    return new BaseResponseDto(true, null, 'event deleted successfully');
  }
}
