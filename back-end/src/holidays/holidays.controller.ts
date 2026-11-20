import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { Roles } from '../auth/roles.guard';
import { CurrentUserCollegeId } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ErrorCode, errorBody } from '../common/errors/error-codes';

@ApiTags('Holidays')
@Controller('holidays')
export class HolidaysController {
  constructor(private holidaysService: HolidaysService) {}

  @Get()
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'List this college\'s holidays' })
  async list(@CurrentUserCollegeId() collegeId: string | null) {
    return this.holidaysService.list(collegeId);
  }

  @Post()
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Add a holiday — no class is held system-wide on this date' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async create(
    @Body() body: any,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    if (!body.date || !body.label)
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'date and label are required'),
      );
    return this.holidaysService.create(body, collegeId);
  }

  @Delete(':id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Remove a holiday' })
  async remove(
    @Param('id') id: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.holidaysService.remove(id, collegeId);
  }
}
