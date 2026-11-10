import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import {
  isSameCollege,
  scopeToCollege,
  writeCollegeId,
} from '../common/tenancy/scope-to-college';

@Injectable()
export class HolidaysService {
  constructor(private db: InMemoryDbService) {}

  async list(collegeId: string | null) {
    return scopeToCollege(this.db.holidays, collegeId).sort((a: any, b: any) =>
      a.date.localeCompare(b.date),
    );
  }

  async create(data: any, actorCollegeId: string | null) {
    const holiday = {
      holiday_id: uuidv4(),
      date: data.date,
      label: data.label,
      college_id: writeCollegeId(actorCollegeId),
    };
    this.db.holidays.push(holiday);
    return holiday;
  }

  async remove(id: string, collegeId: string | null) {
    const holiday = this.db.holidays.find((h: any) => h.holiday_id === id);
    if (!isSameCollege(holiday, collegeId))
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Holiday not found'),
      );
    const idx = this.db.holidays.indexOf(holiday);
    this.db.holidays.splice(idx, 1);
    return { success: true };
  }
}
