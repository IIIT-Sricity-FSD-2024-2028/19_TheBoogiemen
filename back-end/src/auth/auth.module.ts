import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { loadAuthConfig } from '../config/auth.config';
import { AuthRateLimitMiddleware } from '../common/middleware/rate-limit.middleware';

/**
 * Global so that JwtService and PasswordService are injectable wherever they are
 * needed (notably JwtAuthGuard, registered as a global guard in AppModule)
 * without every feature module having to import this one.
 *
 * loadAuthConfig() throws if JWT_SECRET is missing or weak, so a misconfigured
 * deployment fails at boot rather than silently signing tokens with a default.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const config = loadAuthConfig();
        return {
          secret: config.jwtSecret,
          // `expiresIn` is typed as the `ms` package's StringValue template-literal
          // union. The value comes from the environment, so it cannot be narrowed
          // statically; loadAuthConfig() is responsible for it being sensible.
          signOptions: { expiresIn: config.jwtExpiresIn as any },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, AuthRateLimitMiddleware],
  exports: [AuthService, PasswordService, JwtModule],
})
export class AuthModule implements NestModule {
  /**
   * Bind the rate limiter to this module's routes only.
   *
   * `forRoutes(AuthController)` rather than a path string: Nest reads the
   * controller's own route metadata, so the binding already accounts for the
   * global 'api' prefix and does not silently stop matching if a route is
   * renamed. A hardcoded 'auth/login' would have to be kept in step by hand,
   * and a stale one fails open — the limiter would simply never run.
   *
   * Scoping is what keeps this cheap. Registered here instead of app.use(), the
   * middleware is absent from the stack for every non-auth route.
   *
   * Only failed sign-ins accrue, so covering the whole controller is safe:
   * logout (204) and a successful login (200) never count against anyone.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthRateLimitMiddleware).forRoutes(AuthController);
  }
}
