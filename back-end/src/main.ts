// Load .env FIRST, before any module is imported.
//
// Nest's ConfigModule populates process.env during module *instantiation*, but
// module decorators are evaluated at import time — earlier. Anything that reads
// process.env to decide module shape (DATA_STORE selecting the store, LOG_LEVEL
// selecting the logger level) would otherwise see undefined and silently fall
// back to its default, which is the worst kind of misconfiguration: no error,
// just the wrong behaviour.
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { VALIDATION_PIPE_OPTIONS } from './common/errors/validation.factory';
import { registerProcessHandlers } from './common/errors/process-handlers';
import { LOG_DIR } from './config/logger.config';

async function bootstrap() {
  // bufferLogs holds Nest's own startup output until the Pino logger is
  // installed below, so bootstrap lines are formatted like everything else
  // instead of being lost or printed in Nest's default format.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 1. Route Nest's internal logging (route mapping, lifecycle, unhandled
  // exceptions) through Pino, so the process emits exactly one log format.
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();

  // 2. Enable CORS
  // Identity and role travel in a signed JWT via the Authorization header.
  // The old 'role' and 'user-id' headers are gone — the server ignores them, and
  // allowing them here would only invite clients to keep sending them.
  // CORS does not add security — it selectively *relaxes* the same-origin
  // policy. `origin: true` reflected whatever Origin the caller sent, and with
  // `credentials: true` that let any website make credentialed requests to this
  // API and read the responses. That was survivable while auth was a header the
  // browser never attached on its own; it is a live hole now that the session
  // travels in a cookie the browser sends automatically.
  //
  // The frontend is served from this same origin, so cross-origin access is OFF
  // unless CORS_ORIGIN explicitly names an allowed origin.
  const corsOrigin = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigin.length ? corsOrigin : false,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Populates req.cookies, which JwtAuthGuard reads the session token from.
  // Registered here rather than as module middleware so it runs before guards.
  app.use(cookieParser());

  // 2b. Security response headers.
  //
  // Helmet sets ten headers and removes X-Powered-By. Nine apply to this app
  // unchanged: HSTS, nosniff, frameguard, referrer-policy, COOP, CORP,
  // Origin-Agent-Cluster, DNS-prefetch-control and permitted-cross-domain
  // -policies. It also sets X-XSS-Protection to 0, which is correct — that
  // legacy auditor was itself exploitable, and `1; mode=block` is the usual
  // hand-rolled mistake.
  //
  // These govern a different layer from everything above: CORS decides who may
  // *read* a response and the session cookie decides who may *hold* one, while
  // these decide how the browser treats a response it already has.
  //
  // Registered before express.static (step 5), so the HTML pages — the
  // responses that most need these headers — are covered, not just /api.
  app.use(
    helmet({
      // OFF DELIBERATELY. Helmet's default CSP sets `script-src-attr 'none'`,
      // which forbids inline event-handler attributes. The frontend has 194 of
      // them (onclick, onsubmit, onchange, drag handlers) plus 5 inline
      // <script> blocks, so enforcing the default policy would stop every
      // button in the app from working.
      //
      // Turning CSP on is Phases 2-3 of HELMET_SECURITY_PLAN.md, and it is
      // gated on removing those handlers — the same frontend pass as the
      // innerHTML escaping work (audit C-06). Until then this app has no CSP,
      // and no mitigation for stored XSS beyond escaping at the call sites.
      contentSecurityPolicy: false,

      // The API and the frontend are one origin, so nothing of ours is
      // legitimately embedded by anyone else. Same stance as the CORS block
      // above; loosen only if the frontend is split onto its own host.
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  // 3. Structured error handling. HTTP request logging is handled by pino-http
  // (configured in logger.config.ts), which hooks the response lifecycle rather
  // than sitting in the response path — a logging fault can no longer alter a
  // response, which is what the interceptor this replaces used to do.
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Errors raised outside a request never reach the filter — see the policy
  // note in process-handlers.ts.
  registerProcessHandlers(app, logger);

  // Runs onModuleDestroy hooks (closing the database pool) on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // 4. Global Validation
  // forbidNonWhitelisted is on globally now. It previously applied to four
  // routes only, so everywhere else an unknown body key was silently dropped
  // and the caller got a 200 back having changed nothing.
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));

  // 5. Serve Static Files (Windows & Mac Compatible)
  // This resolves the 'front-end' folder relative to your current project location
  // Add one extra '..' to go out of the back-end folder and into the root
  const frontendPath = path.join(__dirname, '..', '..', '..', 'front-end');
  logger.log({ frontendPath, msg: 'Serving static frontend' });
  app.use(express.static(frontendPath));

  // 6. Global API Prefix
  // Note: All your endpoints will now start with /api (e.g., /api/auth/login)
  app.setGlobalPrefix('api');

  // 7. Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('BarelyPassing API')
    .setDescription(
      'Academic Progress & Outcome Tracking API.\n\n' +
        'Authenticate with POST /api/auth/login, then click **Authorize** and paste the returned token. ' +
        'All endpoints require a valid bearer token except login and signup.',
    )
    .setVersion('2.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'bearer',
    )
    .addSecurityRequirements('bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 8. Start Server
  const PORT = 5001;
  await app.listen(PORT);

  // One structured line rather than a five-line ASCII box: separator rows carry
  // no information once the output is JSON.
  // nestjs-pino's Logger is a Nest LoggerService: a second string argument is
  // treated as the *context*, not the message. Put `msg` on the object instead.
  logger.log({
    port: PORT,
    url: `http://localhost:${PORT}`,
    docs: `http://localhost:${PORT}/api/docs`,
    env: process.env.NODE_ENV ?? 'development',
    logLevel: process.env.LOG_LEVEL ?? 'debug',
    // Printed so nobody has to go looking for where the logs ended up.
    logDir:
      (process.env.LOG_TO_FILE ?? 'true').toLowerCase() === 'false'
        ? 'disabled'
        : LOG_DIR,
    msg: 'Application started',
  });
}

bootstrap();
