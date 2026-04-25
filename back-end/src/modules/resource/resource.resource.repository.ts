import { Injectable } from '@nestjs/common';
import { RESOURCE } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';

@Injectable()
export class ResourceRepository {
  public items: RESOURCE[] = [];

  constructor() {
    this.items.push(
      { resource_id: SEED.RESOURCES[0], name: 'Room 101', type: 'Classroom', capacity: 60 },
      { resource_id: SEED.RESOURCES[1], name: 'Lab 1', type: 'Laboratory', capacity: 30 },
      { resource_id: SEED.RESOURCES[2], name: 'Auditorium', type: 'Hall', capacity: 300 }
    );
  }

  async findOneById(id: string): Promise<RESOURCE | undefined> {
    return this.items.find(r => r.resource_id === id);
  }
}
