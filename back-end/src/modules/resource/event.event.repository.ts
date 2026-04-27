import { Injectable } from '@nestjs/common';
import { EVENT, ASSESSMENT_VENUE } from '../../common/types/interfaces';
import { MOCK_EVENTS } from '../../common/types/mock-data';

@Injectable()
export class EventRepository {
  public items: EVENT[] = MOCK_EVENTS;
  public venues: ASSESSMENT_VENUE[] = [];

  constructor() {}

  async findAllByResourceId(resourceId: string): Promise<EVENT[]> {
    return this.items.filter(e => e.resource_id === resourceId);
  }

  async create(data: EVENT): Promise<EVENT> {
    this.items.push(data);
    return data;
  }

  async createVenue(data: ASSESSMENT_VENUE): Promise<ASSESSMENT_VENUE> {
    this.venues.push(data);
    return data;
  }

  async findOneById(id: string): Promise<EVENT | undefined> {
    return this.items.find(e => e.id === id);
  }

  async findAll(): Promise<EVENT[]> {
    return this.items;
  }

  async update(id: string, data: Partial<EVENT>): Promise<EVENT | null> {
    const idx = this.items.findIndex(e => e.id === id);
    if (idx > -1) {
      Object.assign(this.items[idx], data);
      return this.items[idx];
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    const idx = this.items.findIndex(e => e.id === id);
    if (idx > -1) this.items.splice(idx, 1);
  }
}
