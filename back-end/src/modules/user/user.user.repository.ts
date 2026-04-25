import { Injectable } from '@nestjs/common';
import { USER } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserRepository {
  private items: USER[] = [];

  constructor() {
    this.items.push({
      user_id: 'user1',
      username: 'alice',
      email: 'alice@example.com',
      role: 'student'
    });
    this.items.push({
      user_id: 'user2',
      username: 'bob',
      email: 'bob@example.com',
      role: 'student'
    });
    this.items.push({
      user_id: 'user3',
      username: 'charlie',
      email: 'charlie@example.com',
      role: 'faculty'
    });
    this.items.push({
      user_id: 'user4',
      username: 'diana',
      email: 'diana@example.com',
      role: 'academic_head'
    });
    this.items.push({
      user_id: 'user5',
      username: 'admin1',
      email: 'admin@example.com',
      role: 'admin'
    });
  }

  async findAll(): Promise<USER[]> { return this.items; }
  async findOneById(id: string): Promise<USER | undefined> { return this.items.find(i => i.user_id === id); }
  async update(id: string, data: Partial<USER>): Promise<USER | null> {
    const idx = this.items.findIndex(i => i.user_id === id);
    if(idx > -1) { Object.assign(this.items[idx], data); return this.items[idx]; }
    return null;
  }
}
