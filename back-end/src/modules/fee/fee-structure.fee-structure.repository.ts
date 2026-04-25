import { Injectable } from '@nestjs/common';
import { FEE_STRUCTURE } from '../../common/types/interfaces';
import { MOCK_FEE_STRUCTURES } from '../../common/types/mock-data';

@Injectable()
export class FeeStructureRepository {
  private items: FEE_STRUCTURE[] = MOCK_FEE_STRUCTURES;

  constructor() {}

  async findAll(): Promise<FEE_STRUCTURE[]> { return this.items; }
  async findOneById(id: string): Promise<FEE_STRUCTURE | undefined> { return this.items.find(i => i.fee_id === id); }
  async findByYearId(yearId: string): Promise<FEE_STRUCTURE | undefined> { return this.items.find(i => i.year_id === yearId); }
  async create(data: FEE_STRUCTURE): Promise<FEE_STRUCTURE> { this.items.push(data); return data; }
  async update(id: string, data: Partial<FEE_STRUCTURE>): Promise<FEE_STRUCTURE | null> {
    const idx = this.items.findIndex(i => i.fee_id === id);
    if(idx > -1) { Object.assign(this.items[idx], data); return this.items[idx]; }
    return null;
  }
  async delete(id: string): Promise<void> {
    const idx = this.items.findIndex(i => i.fee_id === id);
    if(idx > -1) this.items.splice(idx, 1);
  }
}
