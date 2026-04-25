import { Injectable } from '@nestjs/common';
import { FEE_PAYMENT } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FeeRepository {
  private items: FEE_PAYMENT[] = [];

  constructor() {
    this.items.push({
      payment_id: uuidv4(),
      student_id: SEED.STUDENTS[0],
      fee_id: SEED.FEE_STRUCTURES[0],
      amount_paid: 5000,
      payment_date: new Date().toISOString(),
      status: 'PAID',
    });
    this.items.push({
      payment_id: uuidv4(),
      student_id: SEED.STUDENTS[1],
      fee_id: SEED.FEE_STRUCTURES[0],
      amount_paid: 2000,
      status: 'PENDING',
    });
    this.items.push({
      payment_id: uuidv4(),
      student_id: SEED.STUDENTS[2],
      fee_id: SEED.FEE_STRUCTURES[0],
      status: 'PENDING',
    });
  }

  async findAll(): Promise<FEE_PAYMENT[]> { return this.items; }
  async findOneById(id: string): Promise<FEE_PAYMENT | undefined> { return this.items.find(i => i.payment_id === id); }
  async findByFeeId(feeId: string): Promise<FEE_PAYMENT[]> { return this.items.filter(i => i.fee_id === feeId); }
  async create(data: FEE_PAYMENT): Promise<FEE_PAYMENT> { this.items.push(data); return data; }
  async update(id: string, data: Partial<FEE_PAYMENT>): Promise<FEE_PAYMENT | null> {
    const idx = this.items.findIndex(i => i.payment_id === id);
    if(idx > -1) { Object.assign(this.items[idx], data); return this.items[idx]; }
    return null;
  }
  async delete(id: string): Promise<void> {
    const idx = this.items.findIndex(i => i.payment_id === id);
    if(idx > -1) this.items.splice(idx, 1);
  }
}
