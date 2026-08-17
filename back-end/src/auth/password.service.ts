/**
 * password.service.ts — the only place passwords are hashed or compared.
 *
 * Passwords were previously stored and compared in plaintext (`u.password === password`),
 * with the plaintext values committed to `data/mock-db.json`. Everything now goes
 * through bcrypt, stored under `password_hash` to match the declared schema in
 * `Database/dbschema.sql` and the `USER` interface.
 *
 * bcryptjs (pure JS) is used rather than bcrypt (native addon) so the project
 * installs without a C++ toolchain on every developer machine.
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { loadAuthConfig } from '../config/auth.config';

/** A bcrypt digest always starts with one of these version prefixes. */
const BCRYPT_PREFIX = /^\$2[aby]\$\d{2}\$/;

@Injectable()
export class PasswordService {
  private readonly rounds = loadAuthConfig().bcryptRounds;

  /** True when the stored value is already a bcrypt digest rather than plaintext. */
  static isHashed(value: unknown): boolean {
    return typeof value === 'string' && BCRYPT_PREFIX.test(value);
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  /**
   * Constant-time comparison of a candidate password against a stored digest.
   *
   * Returns false — never throws — for a missing or malformed digest, so an
   * account with no usable credential simply cannot authenticate.
   */
  async verify(plain: string, storedHash: unknown): Promise<boolean> {
    if (!plain || typeof storedHash !== 'string' || !storedHash) return false;
    if (!PasswordService.isHashed(storedHash)) return false;
    try {
      return await bcrypt.compare(plain, storedHash);
    } catch {
      return false;
    }
  }
}
