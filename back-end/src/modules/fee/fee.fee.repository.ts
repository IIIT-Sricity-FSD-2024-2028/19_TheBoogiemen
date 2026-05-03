import { Injectable } from '@nestjs/common';
import { FEE_PAYMENT } from '../../common/types/interfaces';
import { MOCK_FEE_PAYMENTS } from '../../common/types/mock-data';

@Injectable()
export class FeeRepository {
  private items: FEE_PAYMENT[] = MOCK_FEE_PAYMENTS;

  constructor() {}

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
