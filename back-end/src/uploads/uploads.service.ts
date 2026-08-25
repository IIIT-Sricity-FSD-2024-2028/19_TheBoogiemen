import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { FileLoggerService } from '../common/services/file-logger.service';
import { UploadFile } from './upload.config';

export interface UploadedDoc {
  file_id: string;
  original_name: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  uploader_role: string;
  category: 'progress_report' | 'assignment' | 'research' | 'general';
  related_entity_id?: string;
  created_at: string;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly db: InMemoryDbService,
    private readonly fileLogger: FileLoggerService
  ) {}

  async saveFileRecord(
    file: UploadFile,
    uploadedBy: string,
    uploaderRole: string,
    category: 'progress_report' | 'assignment' | 'research' | 'general' = 'general',
    relatedEntityId?: string
  ): Promise<UploadedDoc> {
    const fileId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: UploadedDoc = {
      file_id: fileId,
      original_name: file.originalname,
      file_name: file.filename,
      file_path: file.path,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by: uploadedBy,
      uploader_role: uploaderRole,
      category,
      related_entity_id: relatedEntityId,
      created_at: new Date().toISOString(),
    };

    if (!(this.db as any).uploads) {
      (this.db as any).uploads = [];
    }
    (this.db as any).uploads.push(record);

    this.fileLogger.logAudit(
      'FILE_UPLOAD',
      `${uploadedBy} (${uploaderRole})`,
      file.originalname,
      { fileId, size: file.size, category, relatedEntityId }
    );

    return record;
  }

  async getFileById(fileId: string): Promise<UploadedDoc> {
    const list: UploadedDoc[] = (this.db as any).uploads || [];
    const doc = list.find((d) => d.file_id === fileId);
    if (!doc) {
      throw new NotFoundException(`File record ${fileId} not found`);
    }
    if (!fs.existsSync(doc.file_path)) {
      throw new NotFoundException(`Physical file ${doc.file_name} not found on server disk`);
    }
    return doc;
  }

  async getProgressReportsForStudent(studentId: string): Promise<UploadedDoc[]> {
    const list: UploadedDoc[] = (this.db as any).uploads || [];
    return list.filter(
      (d) => d.category === 'progress_report' && d.related_entity_id === studentId
    );
  }

  async getAllUploads(category?: string): Promise<UploadedDoc[]> {
    const list: UploadedDoc[] = (this.db as any).uploads || [];
    if (category) {
      return list.filter((d) => d.category === category);
    }
    return list;
  }

  async deleteFile(fileId: string): Promise<{ success: boolean; message: string }> {
    const list: UploadedDoc[] = (this.db as any).uploads || [];
    const idx = list.findIndex((d) => d.file_id === fileId);
    if (idx === -1) {
      throw new NotFoundException(`File record ${fileId} not found`);
    }
    const doc = list[idx];
    if (fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }
    list.splice(idx, 1);
    return { success: true, message: `File ${doc.original_name} deleted successfully` };
  }
}
