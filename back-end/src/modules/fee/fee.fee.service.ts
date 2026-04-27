import { Injectable, NotFoundException } from '@nestjs/common';
import { FeeRepository } from './fee.fee.repository';
import { FeeStructureRepository } from './fee-structure.fee-structure.repository';
import { NotificationService } from '../../common/services/notification.service';
import { CreateFeeAuditInputDto } from './dto/create-fee-audit.input.dto';
import { FeeAuditOutputDto } from './dto/fee-audit.output.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FeeService {
  constructor(
    private readonly feeRepo: FeeRepository,
    private readonly feeStructureRepo: FeeStructureRepository,
    private readonly notificationService: NotificationService
  ) {}

  async auditCompliance(dto: CreateFeeAuditInputDto): Promise<FeeAuditOutputDto> {
    const structure = await this.feeStructureRepo.findByYearId(dto.year_id);
    if (!structure) throw new NotFoundException('Fee structure not found for year_id');

    const payments = await this.feeRepo.findByFeeId(structure.fee_id);
    
    const compliant = payments.filter(p => p.status === 'PAID');
    const pending = payments.filter(p => p.status === 'PENDING');

    for (const p of pending) {
      this.notificationService.notify(p.student_id, 'Fee arrears detected');
    }

    return {
      year_id: dto.year_id,
      compliant_count: compliant.length,
      non_compliant_count: pending.length,
      pending_students: pending.map(p => ({
        student_id: p.student_id,
        amount: structure.amount - (p.amount_paid || 0),
      }))
    };
  }

  async findAllFeeStructures() {
    return this.feeStructureRepo.findAll();
  }

  async getAllPayments() {
    return this.feeRepo.findAll();
  }

  async getPaymentById(id: string) {
    const payment = await this.feeRepo.findOneById(id);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async createPayment(dto: any) {
    return this.feeRepo.create({
      payment_id: uuidv4(),
      student_id: dto.student_id,
      fee_id: dto.fee_id,
      amount_paid: dto.amount_paid || 0,
      status: dto.status || 'PENDING',
      payment_date: new Date().toISOString()
    });
  }

  async updatePayment(id: string, dto: any) {
    const payment = await this.feeRepo.findOneById(id);
    if (!payment) throw new NotFoundException('Payment not found');
    
    // full replace requires all fields or defaults
    const updated = await this.feeRepo.update(id, {
      student_id: dto.student_id || payment.student_id,
      fee_id: dto.fee_id || payment.fee_id,
      transaction_id: dto.transaction_id,
      amount_paid: dto.amount_paid || 0,
      status: dto.status || 'PENDING',
      payment_date: payment.payment_date
    });
    return updated;
  }

  async patchPayment(id: string, dto: any) {
    const payment = await this.feeRepo.findOneById(id);
    if (!payment) throw new NotFoundException('Payment not found');
    
    const updated = await this.feeRepo.update(id, dto);
    return updated;
  }

  async deletePayment(id: string) {
    const payment = await this.feeRepo.findOneById(id);
    if (!payment) throw new NotFoundException('Payment not found');
    await this.feeRepo.delete(id);
  }
}
