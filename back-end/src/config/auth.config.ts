/**
 * auth.config.ts — authentication configuration, validated at boot.
 *
 * The application must refuse to start rather than fall back to a built-in
 * secret. A default signing key is the same vulnerability as no signing at all:
 * anyone who has read the source can mint a valid Super Admin token.
 */

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
}

/** Minimum acceptable length for the signing secret. */
export const MIN_SECRET_LENGTH = 32;

/** Placeholder values shipped in .env.example — never valid at runtime. */
const REJECTED_SECRETS = [
  'change-me',
  'changeme',
  'secret',
  'your-secret-here',
  'replace-this-with-a-long-random-string',
];

export class AuthConfigError extends Error {}

export function loadAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const jwtSecret = (env.JWT_SECRET ?? '').trim();

  if (!jwtSecret) {
    throw new AuthConfigError(
      'JWT_SECRET is not set.\n' +
        '  Copy back-end/.env.example to back-end/.env and set a strong secret.\n' +
        "  Generate one with:  node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  }

  if (jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new AuthConfigError(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters (got ${jwtSecret.length}).`,
    );
  }

  if (REJECTED_SECRETS.includes(jwtSecret.toLowerCase())) {
    throw new AuthConfigError(
      'JWT_SECRET is still set to a placeholder value. Replace it with a real random secret.',
    );
  }

  const bcryptRounds = Number(env.BCRYPT_ROUNDS ?? 12);
  if (
    !Number.isInteger(bcryptRounds) ||
    bcryptRounds < 10 ||
    bcryptRounds > 15
  ) {
    throw new AuthConfigError(
      'BCRYPT_ROUNDS must be an integer between 10 and 15.',
    );
  }

  return {
    jwtSecret,
    jwtExpiresIn: (env.JWT_EXPIRES_IN ?? '2h').trim(),
    bcryptRounds,
  };
}
