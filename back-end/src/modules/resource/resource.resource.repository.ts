import { Injectable } from '@nestjs/common';
import { RESOURCE } from '../../common/types/interfaces';
import { MOCK_RESOURCES } from '../../common/types/mock-data';

@Injectable()
export class ResourceRepository {
  public items: RESOURCE[] = MOCK_RESOURCES;

  constructor() {}

  async findOneById(id: string): Promise<RESOURCE | undefined> {
    return this.items.find(r => r.resource_id === id);
  }

  async findAll(): Promise<RESOURCE[]> {
    return this.items;
  }

  async create(data: RESOURCE): Promise<RESOURCE> {
    this.items.push(data);
    return data;
  }

  async update(id: string, data: Partial<RESOURCE>): Promise<RESOURCE | null> {
    const idx = this.items.findIndex(r => r.resource_id === id);
    if (idx > -1) {
      Object.assign(this.items[idx], data);
      return this.items[idx];
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    const idx = this.items.findIndex(r => r.resource_id === id);
    if (idx > -1) this.items.splice(idx, 1);
  }
}
