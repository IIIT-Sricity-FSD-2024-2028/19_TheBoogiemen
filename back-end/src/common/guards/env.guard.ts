import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode, errorBody } from '../errors/error-codes';

@Injectable()
export class EnvGuard implements CanActivate {
  // Nest's Logger, not PinoLogger: app.useLogger() routes it through Pino, and a
  // guard instantiated outside DI would not receive an injected logger.
  private readonly logger = new Logger(EnvGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const rawVal = this.configService.get<string>('NODE_ENV');
    const nodeEnv = (rawVal || '').trim().toLowerCase();
    
    if (nodeEnv === 'production') {
      this.logger.warn('Mock-data endpoint blocked: NODE_ENV is production');
      throw new ForbiddenException(
        errorBody(ErrorCode.ENVIRONMENT_RESTRICTED, 'Mock data endpoints are disabled in production'),
      );
    }
    return true;
  }
}
