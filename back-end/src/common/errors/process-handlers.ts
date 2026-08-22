/**
 * process-handlers.ts — catch failures that happen outside a request.
 *
 * The global exception filter only sees errors raised while handling an HTTP
 * request. A rejected promise in a background task, a `pool.on('error')` that
 * throws, or a synchronous throw in a timer callback bypasses it entirely: Node
 * prints its own trace to stderr and, for an unhandled rejection, exits. That
 * produces an unstructured crash with no request id, no correlation and nothing
 * in the log pipeline.
 *
 * Policy:
 *   unhandledRejection — log, keep serving. Almost always a forgotten `await`
 *     in a fire-and-forget path; killing every in-flight request over it is a
 *     worse outcome than continuing.
 *   uncaughtException  — log, then exit. Node's own guidance: state is unknown
 *     after one, so the safe move is a clean shutdown and a restart by the
 *     supervisor. Draining first means in-flight requests still get a response.
 */

import type { INestApplication } from '@nestjs/common';
import type { Logger } from 'nestjs-pino';

/** Give Pino's async transport a moment to flush before the process dies. */
const FLUSH_MS = 250;
const SHUTDOWN_TIMEOUT_MS = 5_000;

export function registerProcessHandlers(app: INestApplication, logger: Logger): void {
  let shuttingDown = false;

  const shutdown = async (reason: string, exitCode: number) => {
    if (shuttingDown) return; // a second signal must not race the first
    shuttingDown = true;

    const forceExit = setTimeout(() => {
      logger.error({ reason, msg: 'Graceful shutdown timed out — forcing exit' });
      process.exit(exitCode);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      // Runs onModuleDestroy hooks — closes the database pool, so connections
      // are returned rather than left for the server to time out.
      await app.close();
    } catch (err) {
      logger.error({ err, msg: 'Error while closing application' });
    }

    setTimeout(() => process.exit(exitCode), FLUSH_MS).unref();
  };

  process.on('unhandledRejection', (reason) => {
    logger.error({
      err: reason instanceof Error ? reason : new Error(String(reason)),
      msg: 'Unhandled promise rejection — a promise was not awaited or caught',
    });
    // Deliberately not exiting: see the policy note above.
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err, msg: 'Uncaught exception — shutting down' });
    void shutdown('uncaughtException', 1);
  });

  // SIGTERM from a container runtime, SIGINT from Ctrl-C.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      logger.log({ signal, msg: 'Shutdown signal received' });
      void shutdown(signal, 0);
    });
  }
}
