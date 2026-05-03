import { Controller, Get, UseGuards, SetMetadata, Post, Body, Param, Put, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FeeService } from './fee.fee.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EnvGuard } from '../../common/guards/env.guard';
import { CreateFeeAuditInputDto } from './dto/create-fee-audit.input.dto';
import { CreateFeePaymentInputDto } from './dto/create-fee-payment.input.dto';
import { UpdateFeePaymentInputDto } from './dto/update-fee-payment.input.dto';
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

  @Post('reminders')
  @SetMetadata('roles', ['academic_head', 'admin'])
  @ApiResponse({ status: 201, description: 'Send fee reminders' })
  async sendReminders(@Body() dto: any) {
    return new BaseResponseDto(true, { message: 'Reminders sent successfully' }, 'reminders sent');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['academic_head', 'student', 'admin', 'faculty'])
  @UseGuards(EnvGuard)
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      structures: MOCK_FEE_STRUCTURES,
      payments: MOCK_FEE_PAYMENTS
    }, 'mock data fetched');
  }

  @Get('payments')
  @SetMetadata('roles', ['academic_head', 'admin'])
  @ApiResponse({ status: 200, description: 'Fetch all fee payments' })
  async getAllPayments() {
    const data = await this.feeService.getAllPayments();
    return new BaseResponseDto(true, data, 'payments fetched successfully');
  }

  @Get('payments/:id')
  @SetMetadata('roles', ['academic_head', 'admin', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch fee payment by ID' })
  async getPaymentById(@Param('id') id: string) {
    const data = await this.feeService.getPaymentById(id);
    return new BaseResponseDto(true, data, 'payment fetched successfully');
  }

  @Post('payments')
  @SetMetadata('roles', ['admin'])
  @ApiBody({ type: CreateFeePaymentInputDto })
  @ApiResponse({ status: 201, description: 'Create fee payment' })
  async createPayment(@Body() dto: CreateFeePaymentInputDto) {
    const data = await this.feeService.createPayment(dto);
    return new BaseResponseDto(true, data, 'payment created successfully');
  }

  @Put('payments/:id')
  @SetMetadata('roles', ['admin'])
  @ApiBody({ type: UpdateFeePaymentInputDto })
  @ApiResponse({ status: 200, description: 'Full update of fee payment' })
  async updatePayment(@Param('id') id: string, @Body() dto: UpdateFeePaymentInputDto) {
    const data = await this.feeService.updatePayment(id, dto);
    return new BaseResponseDto(true, data, 'payment updated successfully');
  }

  @Patch('payments/:id')
  @SetMetadata('roles', ['admin'])
  @ApiBody({ type: UpdateFeePaymentInputDto })
  @ApiResponse({ status: 200, description: 'Partial update of fee payment' })
  async patchPayment(@Param('id') id: string, @Body() dto: UpdateFeePaymentInputDto) {
    const data = await this.feeService.patchPayment(id, dto);
    return new BaseResponseDto(true, data, 'payment patched successfully');
  }

  @Delete('payments/:id')
  @SetMetadata('roles', ['admin'])
  @ApiResponse({ status: 200, description: 'Delete fee payment' })
  async deletePayment(@Param('id') id: string) {
    await this.feeService.deletePayment(id);
    return new BaseResponseDto(true, null, 'payment deleted successfully');
  }
}
