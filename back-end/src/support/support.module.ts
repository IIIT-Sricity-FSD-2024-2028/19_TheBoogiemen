import { Module } from '@nestjs/common';
import { CollegeSupportController, PlatformSupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({ controllers: [CollegeSupportController, PlatformSupportController], providers: [SupportService], exports: [SupportService] })
export class SupportModule {}
