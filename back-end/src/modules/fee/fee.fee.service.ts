import { Injectable, NotFoundException } from '@nestjs/common';
import { FeeRepository } from './fee.fee.repository';
import { FeeStructureRepository } from './fee-structure.fee-structure.repository';
import { NotificationService } from '../../common/services/notification.service';
import { CreateFeeAuditInputDto } from './dto/create-fee-audit.input.dto';
import { FeeAuditOutputDto } from './dto/fee-audit.output.dto';

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
}
