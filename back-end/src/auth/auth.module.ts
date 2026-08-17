import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { loadAuthConfig } from '../config/auth.config';

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
  providers: [AuthService, PasswordService],
  exports: [AuthService, PasswordService, JwtModule],
})
export class AuthModule {}
