/**
 * uploads.controller.ts — one upload endpoint, one download endpoint.
 *
 * Every form that attaches a document (leave, attendance request, research
 * milestone, assessment submission) posts here first, then sends the returned
 * `file_id` with its own payload. That keeps multipart handling in one place
 * instead of spread across five controllers.
 */

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUserId, CurrentUserRole } from '../common/decorators/current-user.decorator';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { UPLOAD_OPTIONS, ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from './upload.config';
import { UploadContext, UPLOAD_CONTEXTS, UploadsService } from './uploads.service';
import type { Role } from '../auth/jwt-payload';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  // No @Roles: any authenticated user may attach a document to their own work.
  // Who can read it back is decided on download, by ownership.
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document and receive a file_id to attach' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'context'],
      properties: {
        file: { type: 'string', format: 'binary' },
        context: { type: 'string', enum: UPLOAD_CONTEXTS },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Stored — returns file_id, original_name and size' })
  @ApiResponse({ status: 400, description: 'Missing file, disallowed type, or unknown context' })
  @ApiResponse({ status: 413, description: 'File exceeds the size limit' })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('context') context: string,
    @CurrentUserId() userId: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.VALIDATION_FAILED,
          'No file was uploaded. Send it as multipart/form-data under the field "file".',
          { allowed: ALLOWED_EXTENSIONS, maxBytes: MAX_FILE_BYTES },
        ),
      );
    }

    // Validated after the file is on disk, so a bad context must not leave the
    // bytes behind.
    if (!UPLOAD_CONTEXTS.includes(context as UploadContext)) {
      this.uploads.discard(file);
      throw new BadRequestException(
        errorBody(
          ErrorCode.VALIDATION_FAILED,
          `"context" must be one of: ${UPLOAD_CONTEXTS.join(', ')}`,
          { received: context ?? null, allowed: UPLOAD_CONTEXTS },
        ),
      );
    }

    const record = this.uploads.record(file, context as UploadContext, userId);

    return {
      success: true,
      data: {
        file_id: record.file_id,
        original_name: record.original_name,
        size_bytes: record.size_bytes,
        mime_type: record.mime_type,
        uploaded_at: record.uploaded_at,
      },
    };
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Download a document (owner or reviewing staff only)' })
  @ApiResponse({ status: 200, description: 'The file, as an attachment' })
  @ApiResponse({ status: 403, description: 'Not the owner and not staff' })
  @ApiResponse({ status: 404, description: 'No such document' })
  async download(
    @Param('fileId') fileId: string,
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: string,
    @Res() res: Response,
  ) {
    const record = this.uploads.findById(fileId);
    this.uploads.assertCanRead(record, userId, role as Role);
    const filePath = this.uploads.resolvePath(record);

    // Always an attachment, never inline: a stored HTML or SVG file rendered
    // inline would execute in this origin, and the origin holds the session.
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${record.original_name.replace(/"/g, '')}"`,
    );
    res.sendFile(filePath);
  }
}
