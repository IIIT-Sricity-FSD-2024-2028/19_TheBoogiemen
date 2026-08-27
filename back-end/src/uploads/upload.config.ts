/**
 * upload.config.ts — multer storage and the rules a file must satisfy.
 *
 * Multer ships with @nestjs/platform-express, so nothing new is installed; this
 * only configures what is already there.
 *
 * Files land on disk, not in the database. The bytes are large and opaque, the
 * Aiven free tier allows 1 GB total, and the domain expert described exactly
 * this split — a decoupled store for the file, a row for the pointer.
 */

import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorCode, errorBody } from '../common/errors/error-codes';

/** Where the bytes live. Gitignored; created at boot if absent. */
export const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR ?? 'uploads',
);

export const MAX_FILE_BYTES = Number(
  process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024,
);

/**
 * Allowed types, keyed by extension, with the MIME types each may legitimately
 * arrive as.
 *
 * Both are checked. The browser-supplied MIME type is attacker-controlled, and
 * an extension alone says nothing about content — requiring the pair to agree
 * rejects the easy cases (`payload.exe` renamed to `.pdf`, or a real PDF sent
 * with `mimetype: application/x-msdownload`).
 *
 * This is not content sniffing: a file whose bytes are not really a PDF can
 * still get through. It is not executed or served inline, so the residual risk
 * is storage, not execution — see the download route's Content-Disposition.
 */
const ALLOWED: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.doc': ['application/msword'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  '.zip': [
    'application/zip',
    'application/x-zip-compressed',
    'multipart/x-zip',
  ],
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED);

/**
 * Strip everything that makes a client filename dangerous, keeping something a
 * human still recognises. The result is only ever stored as metadata and echoed
 * back on download — never used as a path on disk.
 */
export function sanitizeOriginalName(name: string): string {
  // basename() drops any directory portion, so "../../etc/passwd" becomes
  // "passwd". The allowlist below then replaces anything outside
  // [A-Za-z0-9._ -] with an underscore, which also removes control
  // characters that could forge line breaks in logs or headers.
  const base = path.basename(String(name ?? ''));
  const cleaned = base
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return (cleaned || 'document').slice(0, 120);
}

/** Ensure the upload directory exists before multer tries to write into it. */
export function ensureUploadDir(): void {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Storage: a random UUID plus the validated extension.
 *
 * The client filename is never used as the on-disk name. Doing so would allow
 * path traversal (`../../.env`), collisions, and overwriting another user's
 * document by uploading the same name.
 */
export const uploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname ?? '').toLowerCase();
    cb(null, `${randomUUID()}${ALLOWED_EXTENSIONS.includes(ext) ? ext : ''}`);
  },
});

/** Reject anything whose extension and MIME type do not agree. */
export function uploadFileFilter(
  _req: unknown,
  file: { originalname: string; mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  const ext = path.extname(file.originalname ?? '').toLowerCase();
  const permitted = ALLOWED[ext];

  if (!permitted) {
    return cb(
      new BadRequestException(
        errorBody(
          ErrorCode.UNSUPPORTED_MEDIA_TYPE,
          `File type "${ext || 'unknown'}" is not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`,
          { allowed: ALLOWED_EXTENSIONS },
        ),
      ),
      false,
    );
  }

  if (!permitted.includes(file.mimetype)) {
    return cb(
      new BadRequestException(
        errorBody(
          ErrorCode.UNSUPPORTED_MEDIA_TYPE,
          `The file contents do not match its "${ext}" extension.`,
          { extension: ext, reportedType: file.mimetype },
        ),
      ),
      false,
    );
  }

  cb(null, true);
}

/** Options handed to FileInterceptor. */
export const UPLOAD_OPTIONS = {
  storage: uploadStorage,
  fileFilter: uploadFileFilter,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 1,
    // Multipart bodies can smuggle a denial of service through field count
    // rather than file size.
    fields: 10,
    parts: 15,
  },
};
