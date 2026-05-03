import { Controller, Post, Patch, Body, Param, UseGuards, SetMetadata, Get, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { LeaveService } from './leave.leave.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EnvGuard } from '../../common/guards/env.guard';
import { ApplyLeaveInputDto } from './dto/apply-leave.input.dto';
import { ApproveLeaveInputDto } from './dto/approve-leave.input.dto';
import { UpdateLeaveInputDto } from './dto/update-leave.input.dto';
import { LeaveOutputDto } from './dto/leave.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { SEED } from '../../common/types/seed-constants';
import { MOCK_LEAVE_REQUESTS } from '../../common/types/mock-data';

@ApiTags('Leave')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @SetMetadata('roles', ['student'])
  @ApiBody({ type: ApplyLeaveInputDto })
  @ApiResponse({ status: 201, type: LeaveOutputDto })
  async applyLeave(@Body() dto: ApplyLeaveInputDto) {
    const data = await this.leaveService.applyLeave(dto);
    return new BaseResponseDto(true, data, 'leave applied successfully');
  }

  @Patch(':id/approve')
  @SetMetadata('roles', ['admin'])
  @ApiParam({ name: 'id', description: 'Leave ID' })
  @ApiBody({ type: ApproveLeaveInputDto })
  @ApiResponse({ status: 200, type: LeaveOutputDto })
  async approveLeave(@Param('id') id: string, @Body() dto: ApproveLeaveInputDto) {
    dto.leave_id = id;
    const adminId = SEED.ADMINS[0];
    const data = await this.leaveService.approveLeave(id, adminId);
    return new BaseResponseDto(true, data, 'leave approved successfully');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['faculty', 'student', 'admin', 'academic_head'])
  @UseGuards(EnvGuard)
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      leaves: MOCK_LEAVE_REQUESTS
    }, 'mock data fetched');
  }

  @Get()
  @SetMetadata('roles', ['admin', 'academic_head', 'faculty'])
  @ApiResponse({ status: 200, description: 'Fetch all leave requests' })
  async getAllLeaves() {
    const data = await this.leaveService.getAllLeaves();
    return new BaseResponseDto(true, data, 'leave requests fetched successfully');
  }

  @Get(':id')
  @SetMetadata('roles', ['admin', 'academic_head', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch leave request by ID' })
  async getLeaveById(@Param('id') id: string) {
    const data = await this.leaveService.getLeaveById(id);
    return new BaseResponseDto(true, data, 'leave request fetched successfully');
  }

  @Put(':id')
  @SetMetadata('roles', ['admin'])
  @ApiBody({ type: UpdateLeaveInputDto })
  @ApiResponse({ status: 200, description: 'Full update of leave request' })
  async updateLeave(@Param('id') id: string, @Body() dto: UpdateLeaveInputDto) {
    const data = await this.leaveService.updateLeave(id, dto);
    return new BaseResponseDto(true, data, 'leave request updated successfully');
  }

  @Patch(':id')
  @SetMetadata('roles', ['admin'])
  @ApiBody({ type: UpdateLeaveInputDto })
  @ApiResponse({ status: 200, description: 'Partial update of leave request' })
  async patchLeave(@Param('id') id: string, @Body() dto: UpdateLeaveInputDto) {
    const data = await this.leaveService.patchLeave(id, dto);
    return new BaseResponseDto(true, data, 'leave request patched successfully');
  }

  @Delete(':id')
  @SetMetadata('roles', ['admin'])
  @ApiResponse({ status: 200, description: 'Delete leave request' })
  async deleteLeave(@Param('id') id: string) {
    await this.leaveService.deleteLeave(id);
    return new BaseResponseDto(true, null, 'leave request deleted successfully');
  }
}
