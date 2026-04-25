import { Injectable } from '@nestjs/common';
import { EVENT, ASSESSMENT_VENUE } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventRepository {
  public items: EVENT[] = [];
  public venues: ASSESSMENT_VENUE[] = [];

  constructor() {
    this.items.push(
      { id: uuidv4(), resource_id: SEED.RESOURCES[0], start_time: '2025-01-01T10:00:00Z', end_time: '2025-01-01T12:00:00Z', event_type: 'lecture' },
      { id: uuidv4(), resource_id: SEED.RESOURCES[1], start_time: '2025-01-02T14:00:00Z', end_time: '2025-01-02T16:00:00Z', event_type: 'seminar' }
    );
  }

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
}
