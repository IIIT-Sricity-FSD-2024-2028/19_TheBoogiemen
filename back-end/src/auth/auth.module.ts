import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
