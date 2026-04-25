import { Controller, Post, Body, UseGuards, SetMetadata, Get } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FeeService } from './fee.fee.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateFeeAuditInputDto } from './dto/create-fee-audit.input.dto';
import { FeeAuditOutputDto } from './dto/fee-audit.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { MOCK_FEE_STRUCTURES, MOCK_FEE_PAYMENTS } from '../../common/types/mock-data';

@ApiTags('Fee')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('fee')
export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  @Post('audit')
  @SetMetadata('roles', ['academic_head'])
  @ApiBody({ type: CreateFeeAuditInputDto })
  @ApiResponse({ status: 201, type: FeeAuditOutputDto })
  async auditCompliance(@Body() dto: CreateFeeAuditInputDto) {
    const data = await this.feeService.auditCompliance(dto);
    return new BaseResponseDto(true, data, 'audit successful');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['academic_head', 'student', 'admin', 'faculty'])
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      structures: MOCK_FEE_STRUCTURES,
      payments: MOCK_FEE_PAYMENTS
    }, 'mock data fetched');
  }
}
