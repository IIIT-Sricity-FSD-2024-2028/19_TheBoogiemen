import { Injectable } from '@nestjs/common';
import { USER } from '../../common/types/interfaces';
import { MOCK_USERS } from '../../common/types/mock-data';

@Injectable()
export class UserRepository {
  private items: USER[] = MOCK_USERS;

  constructor() {}

  async findAll(): Promise<USER[]> { return this.items; }
  async findOneById(id: string): Promise<USER | undefined> { return this.items.find(i => i.user_id === id); }
  async update(id: string, data: Partial<USER>): Promise<USER | null> {
    const idx = this.items.findIndex(i => i.user_id === id);
    if(idx > -1) { Object.assign(this.items[idx], data); return this.items[idx]; }
    return null;
  }
  async create(data: USER): Promise<USER> {
    this.items.push(data);
    return data;
  }
  async delete(id: string): Promise<void> {
    const idx = this.items.findIndex(i => i.user_id === id);
    if(idx > -1) this.items.splice(idx, 1);
  }
}
