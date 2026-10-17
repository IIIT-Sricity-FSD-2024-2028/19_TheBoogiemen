/**
 * logger.config.spec.ts — the log-destination wiring that must not regress.
 *
 * The failure this guards against is silent: if the error target loses its
 * level, error-*.log quietly becomes a copy of app-*.log; if a file target is
 * dropped, logging looks completely normal and nothing is written to disk.
 * Neither shows up until someone goes looking for a log that isn't there.
 */

import * as path from 'path';

/** Env has to be set before the module is imported — LOG_DIR is read at load. */
function loadConfig(env: Record<string, string | undefined>) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  jest.resetModules();

  const mod = require('./logger.config');
  const result = mod.buildLoggerConfig().pinoHttp;
  process.env = saved;
  return result;
}

const targetsOf = (cfg: any): any[] => cfg.transport?.targets ?? [];
const fileTargets = (cfg: any) =>
  targetsOf(cfg).filter(
    (t) =>
      t.target === 'pino/file' && typeof t.options?.destination === 'string',
  );

describe('log destinations', () => {
  it('writes to the console and to two dated files in development', () => {
    const cfg = loadConfig({
      NODE_ENV: 'development',
      LOG_TO_FILE: undefined,
      LOG_DIR: undefined,
    });
    const targets = targetsOf(cfg);

    expect(targets).toHaveLength(3);
    expect(targets[0].target).toBe('pino-pretty');
    expect(fileTargets(cfg)).toHaveLength(2);
  });

  it('keeps stdout in production instead of pino-pretty', () => {
    const cfg = loadConfig({ NODE_ENV: 'production' });
    const targets = targetsOf(cfg);

    expect(targets.some((t) => t.target === 'pino-pretty')).toBe(false);
    // destination 1 is stdout, not a path.
    expect(targets[0]).toMatchObject({
      target: 'pino/file',
      options: { destination: 1 },
    });
    expect(fileTargets(cfg)).toHaveLength(2);
  });

  it('sends only errors to the error file', () => {
    const cfg = loadConfig({ NODE_ENV: 'development', LOG_LEVEL: 'debug' });
    const files = fileTargets(cfg);

    const app = files.find((t) => t.options.destination.includes('app-'));
    const err = files.find((t) => t.options.destination.includes('error-'));

    expect(app.level).toBe('debug');
    expect(err.level).toBe('error');
  });

  it('names files by date so a day of logs is one file', () => {
    const cfg = loadConfig({ NODE_ENV: 'development' });
    for (const t of fileTargets(cfg)) {
      expect(path.basename(t.options.destination)).toMatch(
        /^(app|error)-\d{4}-\d{2}-\d{2}\.log$/,
      );
      expect(t.options.mkdir).toBe(true); // or a fresh clone writes nothing
    }
  });

  it('honours LOG_DIR', () => {
    const cfg = loadConfig({ NODE_ENV: 'development', LOG_DIR: 'custom-logs' });
    for (const t of fileTargets(cfg)) {
      expect(path.dirname(t.options.destination).endsWith('custom-logs')).toBe(
        true,
      );
      expect(path.isAbsolute(t.options.destination)).toBe(true);
    }
  });

  it('drops the file targets when LOG_TO_FILE=false, keeping the console', () => {
    const cfg = loadConfig({ NODE_ENV: 'development', LOG_TO_FILE: 'false' });

    expect(fileTargets(cfg)).toHaveLength(0);
    expect(targetsOf(cfg)).toHaveLength(1);
  });

  it('timestamps lines as ISO-8601, not epoch milliseconds', () => {
    const cfg = loadConfig({ NODE_ENV: 'development' });
    // pino's stdTimeFunctions.isoTime emits `,"time":"<ISO>"`.
    expect(cfg.timestamp()).toMatch(/^,"time":"\d{4}-\d{2}-\d{2}T[\d:.]+Z"$/);
  });

  it('still redacts credentials, which now reach a permanent file', () => {
    const cfg = loadConfig({ NODE_ENV: 'development' });
    expect(cfg.redact.paths).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
      ]),
    );
    expect(cfg.redact.censor).toBe('[redacted]');
  });
});
