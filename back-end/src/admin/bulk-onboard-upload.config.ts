/**
 * bulk-onboard-upload.config.ts — multer options for the roster CSV.
 *
 * Deliberately separate from uploads/upload.config.ts: that one writes
 * documents to disk for later download (leave proof, research milestones).
 * A roster CSV is parsed once, immediately, and never needed again — memory
 * storage, never touches disk, nothing to clean up or serve back later.
 */

import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { ErrorCode, errorBody } from '../common/errors/error-codes';

export const MAX_CSV_BYTES = 2 * 1024 * 1024; // a few thousand rows, generously

/**
 * Browsers/OSes disagree wildly on the MIME type a .csv gets tagged with
 * (text/csv, application/vnd.ms-excel, text/plain, or nothing at all) — the
 * extension is the only reliable signal, unlike uploads.service.ts's
 * documents where extension+MIME are both checked.
 */
export function csvFileFilter(
  _req: unknown,
  file: { originalname: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  const ext = path.extname(file.originalname ?? '').toLowerCase();
  if (ext !== '.csv') {
    return cb(
      new BadRequestException(
        errorBody(ErrorCode.UNSUPPORTED_MEDIA_TYPE, `File must be a .csv (got "${ext || 'unknown'}").`),
      ),
      false,
    );
  }
  cb(null, true);
}

export const BULK_ONBOARD_UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  fileFilter: csvFileFilter,
  limits: {
    fileSize: MAX_CSV_BYTES,
    files: 1,
    fields: 5,
    parts: 10,
  },
};
