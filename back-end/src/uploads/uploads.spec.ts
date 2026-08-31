/**
 * uploads.spec.ts — the parts of document upload that must not regress.
 *
 * Filename sanitisation, type filtering and read authorisation. A mistake in any
 * of the three is exploitable rather than merely wrong.
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  sanitizeOriginalName,
  uploadFileFilter,
  ALLOWED_EXTENSIONS,
} from './upload.config';
import { UploadsService, UploadRecord } from './uploads.service';
import { ErrorCode } from '../common/errors/error-codes';

const filter = (originalname: string, mimetype: string) => {
  let error: any = null;
  let accepted: boolean | undefined;
  uploadFileFilter(null, { originalname, mimetype }, (e, ok) => {
    error = e;
    accepted = ok;
  });
  return { error, accepted };
};

describe('sanitizeOriginalName', () => {
  it('strips directory components so a name can never be a path', () => {
    expect(sanitizeOriginalName('../../etc/passwd')).toBe('passwd');
    expect(
      sanitizeOriginalName('..\\..\\windows\\system32\\config'),
    ).not.toContain('\\');
    expect(sanitizeOriginalName('/absolute/path/report.pdf')).toBe(
      'report.pdf',
    );
  });

  it('keeps ordinary names readable', () => {
    expect(sanitizeOriginalName('Medical Certificate-2026.pdf')).toBe(
      'Medical Certificate-2026.pdf',
    );
  });

  it('replaces characters that could break headers or logs', () => {
    expect(sanitizeOriginalName('a"b;c.pdf')).toBe('a_b_c.pdf');
  });

  it('never returns an empty or dotfile name', () => {
    expect(sanitizeOriginalName('')).toBe('document');
    expect(sanitizeOriginalName('...')).toBe('document');
    expect(sanitizeOriginalName('.htaccess')).toBe('htaccess');
  });

  it('bounds the length', () => {
    expect(sanitizeOriginalName('x'.repeat(500)).length).toBeLessThanOrEqual(
      120,
    );
  });
});

describe('uploadFileFilter', () => {
  it('accepts an allowed extension with a matching type', () => {
    expect(filter('cert.pdf', 'application/pdf').accepted).toBe(true);
    expect(filter('scan.JPG', 'image/jpeg').accepted).toBe(true); // case-insensitive
  });

  it('rejects a disallowed extension', () => {
    const { error, accepted } = filter(
      'payload.exe',
      'application/octet-stream',
    );
    expect(accepted).toBe(false);
    expect(error.getResponse().code).toBe(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
  });

  it('rejects an executable renamed to a permitted extension', () => {
    // The extension says pdf; the browser reported the real type.
    const { error, accepted } = filter(
      'payload.pdf',
      'application/x-msdownload',
    );
    expect(accepted).toBe(false);
    expect(error.getResponse().message).toMatch(/do not match/);
  });

  it('rejects a file with no extension at all', () => {
    expect(filter('README', 'text/plain').accepted).toBe(false);
  });

  it('exposes the allowed list for the client to render', () => {
    expect(ALLOWED_EXTENSIONS).toContain('.pdf');
    expect(ALLOWED_EXTENSIONS).not.toContain('.exe');
    expect(ALLOWED_EXTENSIONS).not.toContain('.svg'); // would execute if ever served inline
  });
});

describe('UploadsService access control', () => {
  const record = (over: Partial<UploadRecord> = {}): UploadRecord => ({
    file_id: 'f1',
    stored_name: 'uuid.pdf',
    original_name: 'cert.pdf',
    mime_type: 'application/pdf',
    size_bytes: 10,
    context: 'leave',
    uploaded_by: 'u1',
    uploaded_at: '2026-01-01T00:00:00.000Z',
    college_id: 'college-a',
    ...over,
  });

  const service = () => {
    const db: any = { uploads: [], persist: jest.fn() };
    const logger: any = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    return new UploadsService(db, logger);
  };

  it('lets the uploader read their own document', () => {
    expect(() =>
      service().assertCanRead(record(), 'u1', 'student', 'college-a'),
    ).not.toThrow();
  });

  it('blocks a student reading another student document', () => {
    // The realistic case: leave attachments are medical certificates.
    expect(() =>
      service().assertCanRead(
        record({ uploaded_by: 'u1' }),
        'u6',
        'student',
        'college-a',
      ),
    ).toThrow(ForbiddenException);
  });

  it('lets reviewing staff at the SAME college read any document', () => {
    for (const role of ['faculty', 'admin', 'head', 'superadmin'] as const) {
      expect(() =>
        service().assertCanRead(record(), 'someone-else', role, 'college-a'),
      ).not.toThrow();
    }
  });

  it('blocks reviewing staff at a DIFFERENT college — the cross-tenant leak this closes', () => {
    // TENANT_ISOLATION_DIAGNOSIS.md Group C: before this, any reviewer role
    // at any college could read any document, given only the file_id.
    for (const role of ['faculty', 'admin', 'head', 'superadmin'] as const) {
      expect(() =>
        service().assertCanRead(record(), 'someone-else', role, 'college-b'),
      ).toThrow(ForbiddenException);
    }
  });

  it('superadmin (no college_id claim) can still read across colleges', () => {
    // null is the superadmin case (jwt-payload.ts) — the one actor meant to
    // see across every college, same exemption ROLE_GRANTS.superadmin
    // already gets for user management.
    expect(() =>
      service().assertCanRead(record(), 'someone-else', 'superadmin', null),
    ).not.toThrow();
  });

  it('404s an unknown file id rather than revealing whether it exists', () => {
    expect(() => service().findById('nope')).toThrow(NotFoundException);
  });

  it('records metadata, the uploader\'s college, and persists it', () => {
    const db: any = { uploads: [], persist: jest.fn() };
    const svc = new UploadsService(db, {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any);

    const saved = svc.record(
      {
        filename: 'uuid-1.pdf',
        originalname: '../evil name.pdf',
        mimetype: 'application/pdf',
        size: 42,
      } as any,
      'leave',
      'u1',
      'college-a',
    );

    expect(saved.original_name).toBe('evil name.pdf'); // sanitised
    expect(saved.stored_name).toBe('uuid-1.pdf'); // on-disk name untouched
    expect(saved.file_id).not.toBe(saved.stored_name); // id is not the path
    expect(saved.college_id).toBe('college-a');
    expect(db.uploads).toHaveLength(1);
    expect(db.persist).toHaveBeenCalled();
  });
});
