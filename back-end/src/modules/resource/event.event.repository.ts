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
}
