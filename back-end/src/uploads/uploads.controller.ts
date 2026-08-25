import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Headers,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  StreamableFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import { UploadsService } from './uploads.service';
import { multerStorage, fileFilter, UPLOAD_LIMITS, UploadFile } from './upload.config';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Uploads & Progress Reports')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('file')
  @ApiOperation({ summary: 'Generic File Upload' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      fileFilter,
      limits: UPLOAD_LIMITS,
    })
  )
  async uploadGenericFile(
    @UploadedFile() file: any,
    @Headers('user-id') userId: string,
    @Headers('role') role: string,
    @Body('category') category: 'progress_report' | 'assignment' | 'research' | 'general' = 'general',
    @Body('related_entity_id') relatedEntityId?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file provided or invalid file format');
    }
    const record = await this.uploadsService.saveFileRecord(
      file as UploadFile,
      userId || 'anonymous',
      role || 'student',
      category,
      relatedEntityId
    );
    return {
      success: true,
      message: `File "${file.originalname}" uploaded successfully!`,
      data: record,
    };
  }

  // ── Issue #50: Ingest Progress Reports for Students ──
  @Post('progress-report')
  @ApiOperation({ summary: 'Ingest Student Progress Report PDF' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      fileFilter,
      limits: UPLOAD_LIMITS,
    })
  )
  async uploadProgressReport(
    @UploadedFile() file: any,
    @Body('student_id') studentId: string,
    @Body('semester') semester: string,
    @Headers('user-id') userId: string,
    @Headers('role') role: string
  ) {
    if (!file) {
      throw new BadRequestException('Progress report PDF file is required');
    }
    if (!studentId) {
      throw new BadRequestException('student_id is required');
    }
    const record = await this.uploadsService.saveFileRecord(
      file as UploadFile,
      userId || 'faculty_mentor',
      role || 'faculty',
      'progress_report',
      studentId
    );
    return {
      success: true,
      message: `Progress report for Student ${studentId} ingested successfully!`,
      data: {
        ...record,
        semester: semester || 'Spring 2026',
        download_url: `/api/uploads/download/${record.file_id}`,
      },
    };
  }

  @Get('progress-reports/student/:studentId')
  @ApiOperation({ summary: 'Get all ingested progress reports for a student' })
  async getStudentProgressReports(@Param('studentId') studentId: string) {
    const docs = await this.uploadsService.getProgressReportsForStudent(studentId);
    return {
      success: true,
      student_id: studentId,
      count: docs.length,
      reports: docs.map((d) => ({
        ...d,
        download_url: `/api/uploads/download/${d.file_id}`,
      })),
    };
  }

  @Get('download/:fileId')
  @ApiOperation({ summary: 'Download an uploaded file or progress report' })
  async downloadFile(
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: any
  ): Promise<StreamableFile> {
    const doc = await this.uploadsService.getFileById(fileId);
    const fileStream = fs.createReadStream(doc.file_path);

    res.set({
      'Content-Type': doc.mime_type,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.original_name)}"`,
      'Content-Length': doc.size_bytes.toString(),
    });

    return new StreamableFile(fileStream);
  }

  @Get()
  @ApiOperation({ summary: 'List all uploaded files' })
  async listAllUploads(@Query('category') category?: string) {
    const docs = await this.uploadsService.getAllUploads(category);
    return {
      success: true,
      count: docs.length,
      files: docs.map((d) => ({
        ...d,
        download_url: `/api/uploads/download/${d.file_id}`,
      })),
    };
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete an uploaded file' })
  async deleteUpload(@Param('fileId') fileId: string) {
    return this.uploadsService.deleteFile(fileId);
  }
}
