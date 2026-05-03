import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const rawVal = this.configService.get<string>('NODE_ENV');
    const nodeEnv = (rawVal || '').trim().toLowerCase();
    
    if (nodeEnv === 'production') {
      console.log(`[EnvGuard] Access DENIED. NODE_ENV is "production"`);
      throw new ForbiddenException('Mock data endpoints are disabled in production');
    }
    return true;
  }
}
