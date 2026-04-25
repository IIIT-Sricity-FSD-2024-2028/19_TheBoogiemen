import { Controller, Post, Patch, Body, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { LeaveService } from './leave.leave.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApplyLeaveInputDto } from './dto/apply-leave.input.dto';
import { ApproveLeaveInputDto } from './dto/approve-leave.input.dto';
import { LeaveOutputDto } from './dto/leave.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { SEED } from '../../common/types/seed-constants';

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
}
