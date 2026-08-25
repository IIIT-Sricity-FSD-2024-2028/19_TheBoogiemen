import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BadRequestException } from '@nestjs/common';

export interface UploadFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

export const UPLOADS_DESTINATION = path.resolve(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DESTINATION)) {
  fs.mkdirSync(UPLOADS_DESTINATION, { recursive: true });
}

export const multerStorage = diskStorage({
  destination: (req, file, callback) => {
    if (!fs.existsSync(UPLOADS_DESTINATION)) {
      fs.mkdirSync(UPLOADS_DESTINATION, { recursive: true });
    }
    callback(null, UPLOADS_DESTINATION);
  },
  filename: (req, file, callback) => {
    const timestamp = Date.now();
    const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${cleanOriginalName}`;
    callback(null, filename);
  },
});

export const fileFilter = (req: any, file: any, callback: any) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/zip',
    'text/plain',
    'application/json',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestException(
        `Unsupported file format (${file.mimetype}). Allowed types: PDF, DOCX, PNG, JPG, ZIP, TXT.`
      ),
      false
    );
  }
};

export const UPLOAD_LIMITS = {
  fileSize: 10 * 1024 * 1024, // 10MB maximum
  files: 5,
};
