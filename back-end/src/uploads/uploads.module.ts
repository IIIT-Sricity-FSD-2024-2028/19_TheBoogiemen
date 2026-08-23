import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { ensureUploadDir } from './upload.config';

/**
 * Multer options are passed per-route via FileInterceptor rather than through
 * MulterModule.register, so the storage and filter rules live beside the route
 * that uses them.
 */
@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {
  constructor() {
    // Create the directory at boot rather than on first upload, so a
    // permissions problem surfaces at startup instead of mid-request.
    ensureUploadDir();
  }
}
