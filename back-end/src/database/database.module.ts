import { Module, Global } from '@nestjs/common';
import { InMemoryDbService } from './in-memory-db.service';

@Global()
@Module({
  providers: [InMemoryDbService],
  exports: [InMemoryDbService],
})
export class DatabaseModule {}
