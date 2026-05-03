import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ResourceRepository } from './resource.resource.repository';
import { EventRepository } from './event.event.repository';
import { ScheduleEventInputDto } from './dto/schedule-event.input.dto';
import { EventOutputDto } from './dto/event.output.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResourceService {
  constructor(
    private readonly resourceRepo: ResourceRepository,
    private readonly eventRepo: EventRepository
  ) {}

  async scheduleEvent(dto: ScheduleEventInputDto): Promise<EventOutputDto> {
    const resource = await this.resourceRepo.findOneById(dto.resource_id);
    if (!resource) throw new NotFoundException('Resource not found');

    const existingEvents = await this.eventRepo.findAllByResourceId(dto.resource_id);
    const dtoStart = new Date(dto.start_time).getTime();
    const dtoEnd = new Date(dto.end_time).getTime();

    const overlap = existingEvents.some(e => {
      const eStart = new Date(e.start_time).getTime();
      const eEnd = new Date(e.end_time).getTime();
      return eStart < dtoEnd && eEnd > dtoStart;
    });

    if (overlap) throw new ConflictException('Resource already booked for this time slot');

    const newEvent = await this.eventRepo.create({
      id: uuidv4(),
      resource_id: dto.resource_id,
      start_time: dto.start_time,
      end_time: dto.end_time,
      event_type: dto.event_type,
    });

    let venue_id;
    if (dto.event_type === 'assessment') {
      const venue = await this.eventRepo.createVenue({
        venue_id: uuidv4(),
        event_id: newEvent.id,
        room_number: resource.name,
      });
      venue_id = venue.venue_id;
    }

    return {
      id: newEvent.id,
      resource_id: newEvent.resource_id,
      start_time: newEvent.start_time,
      end_time: newEvent.end_time,
      event_type: newEvent.event_type,
      venue_id
    };
  }

  async getAllResources() {
    return this.resourceRepo.findAll();
  }

  async getResourceById(id: string) {
    const res = await this.resourceRepo.findOneById(id);
    if (!res) throw new NotFoundException('Resource not found');
    return res;
  }

  async createResource(dto: any) {
    return this.resourceRepo.create({
      resource_id: uuidv4(),
      name: dto.name,
      capacity: dto.capacity || 10,
      type: dto.type || 'ROOM',
      location: dto.location || 'Main Building'
    });
  }

  async updateResource(id: string, dto: any) {
    const res = await this.resourceRepo.findOneById(id);
    if (!res) throw new NotFoundException('Resource not found');
    
    return this.resourceRepo.update(id, {
      name: dto.name || res.name,
      capacity: dto.capacity || res.capacity,
      type: dto.type || res.type,
      location: dto.location || res.location
    });
  }

  async patchResource(id: string, dto: any) {
    const res = await this.resourceRepo.findOneById(id);
    if (!res) throw new NotFoundException('Resource not found');
    
    return this.resourceRepo.update(id, dto);
  }

  async deleteResource(id: string) {
    const res = await this.resourceRepo.findOneById(id);
    if (!res) throw new NotFoundException('Resource not found');
    
    await this.resourceRepo.delete(id);
  }

  async getAllEvents() {
    return this.eventRepo.findAll();
  }

  async getEventById(id: string) {
    const event = await this.eventRepo.findOneById(id);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async updateEvent(id: string, dto: any) {
    const event = await this.eventRepo.findOneById(id);
    if (!event) throw new NotFoundException('Event not found');
    
    return this.eventRepo.update(id, dto);
  }

  async deleteEvent(id: string) {
    const event = await this.eventRepo.findOneById(id);
    if (!event) throw new NotFoundException('Event not found');
    
    await this.eventRepo.delete(id);
  }
}
