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
}
