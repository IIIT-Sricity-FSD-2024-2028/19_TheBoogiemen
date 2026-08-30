import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUserCollegeId } from '../common/decorators/current-user.decorator';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { CollegesService } from './colleges.service';
import { CreateCollegeDto } from './dto/create-college.dto';

@ApiTags('Billing — Colleges')
@ApiBearerAuth()
@Controller('billing/colleges')
export class CollegesController {
  constructor(private readonly colleges: CollegesService) {}

  @Post()
  @Roles('superadmin')
  @ApiOperation({
    summary: 'Provision a college and its SPOC in one action (superadmin only)',
  })
  @ApiResponse({ status: 201, description: 'College and SPOC account created' })
  async create(@Body() body: CreateCollegeDto) {
    const data = await this.colleges.create(body);
    return { success: true, data };
  }

  @Get()
  @Roles('superadmin')
  @ApiOperation({ summary: 'List every registered college (the vendor cockpit)' })
  async findAll() {
    return { success: true, data: await this.colleges.findAll() };
  }

  // Literal path, registered before the ':id' route below — Nest matches in
  // registration order, and 'me' would otherwise be captured as an :id and
  // handed to the superadmin-only handler (which would then just 403 it, but
  // there is no reason to depend on that; a literal route belongs before a
  // wildcard one, full stop).
  @Get('me')
  @Roles('spoc')
  @ApiOperation({
    summary: "My own college — name, admins I've hired, basic counts",
  })
  async findMine(@CurrentUserCollegeId() collegeId: string | null) {
    if (!collegeId) {
      // Unreachable in practice — see the identical guard in
      // admin/common.controller.ts's createUser for why this is a 500.
      throw new InternalServerErrorException(
        errorBody(
          ErrorCode.MISCONFIGURATION,
          'This SPOC account has no college on record.',
        ),
      );
    }
    // Reuses findOne() exactly as superadmin's detail view does — a SPOC
    // seeing their own college's name and their own hired admins is not a
    // different query, only a different, token-derived id.
    return { success: true, data: await this.colleges.findOne(collegeId) };
  }

  // Literal path, same reasoning as 'me' above. Open to every academic role,
  // not just spoc — a student/faculty dashboard needs this to hide a nav
  // item for a module their college never licensed
  // (SPOC_BILLING_ENFORCEMENT_DIAGNOSIS.md bug 3). The server-side gate is
  // RequiresModuleGuard on the actual routes; this is only what lets the UI
  // avoid offering a link that would 403.
  @Get('me/modules')
  @Roles('student', 'faculty', 'admin', 'head', 'spoc', 'superadmin')
  @ApiOperation({ summary: "The caller's own college's licensed modules" })
  async myModules(@CurrentUserCollegeId() collegeId: string | null) {
    return { success: true, data: { modules: await this.colleges.getMyModules(collegeId) } };
  }

  @Get(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'One college in full: SPOC, admins, basic counts' })
  async findOne(@Param('id') id: string) {
    return { success: true, data: await this.colleges.findOne(id) };
  }
}
