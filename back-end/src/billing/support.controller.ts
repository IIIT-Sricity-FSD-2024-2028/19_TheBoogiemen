import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import {
  CurrentUserCollegeId,
  CurrentUserId,
} from '../common/decorators/current-user.decorator';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { SupportService } from './support.service';
import { SendSupportMessageDto } from './dto/support-message.dto';

@ApiTags('Billing — Support')
@ApiBearerAuth()
@Controller('billing/support')
export class SupportController {
  constructor(
    private readonly support: SupportService,
    private readonly db: InMemoryDbService,
  ) {}

  // ── SPOC side: exactly one thread, so no thread id ever appears in the URL ──

  @Get('thread')
  @Roles('spoc')
  @ApiOperation({ summary: "Fetch my college's support thread (null if none yet)" })
  async myThread(@CurrentUserCollegeId() collegeId: string | null) {
    const data = collegeId ? await this.support.myThread(collegeId) : null;
    return { success: true, data };
  }

  @Post('messages')
  @Roles('spoc')
  @ApiOperation({ summary: 'Send a message to superadmin — starts the thread on first use' })
  async send(
    @Body() body: SendSupportMessageDto,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    if (!collegeId) {
      // Unreachable in practice — see the identical guard in
      // admin/common.controller.ts's createUser for why this is a 500.
      throw new InternalServerErrorException(
        errorBody(ErrorCode.MISCONFIGURATION, 'This SPOC account has no college on record.'),
      );
    }
    const senderName = this.displayNameOf(userId);
    const data = await this.support.sendAsSpoc(collegeId, userId, senderName, body.content);
    return { success: true, data };
  }

  // ── Superadmin side: many colleges, so the familiar list / open / reply shape ──

  @Get('threads')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Every college’s thread, newest activity first' })
  async allThreads() {
    return { success: true, data: await this.support.allThreads() };
  }

  @Get('threads/:id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'One thread in full' })
  async threadDetail(@Param('id') id: string) {
    return { success: true, data: await this.support.threadDetail(id) };
  }

  @Post('threads/:id/reply')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Reply to a college’s thread' })
  async reply(
    @Param('id') id: string,
    @Body() body: SendSupportMessageDto,
    @CurrentUserId() userId: string,
  ) {
    const senderName = this.displayNameOf(userId);
    const data = await this.support.replyAsSuperadmin(id, userId, senderName, body.content);
    return { success: true, data };
  }

  /** Same denormalisation discussion replies already do — a display name, not a lookup. */
  private displayNameOf(userId: string): string {
    const user = this.db.users.find((u) => u.user_id === userId);
    if (!user) return 'Unknown';
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username || user.email;
  }
}
