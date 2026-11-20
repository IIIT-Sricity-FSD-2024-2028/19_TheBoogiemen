import { Module } from '@nestjs/common';
import { OutcomesController } from './outcomes.controller';
import { OutcomesService } from './outcomes.service';

@Module({
  controllers: [OutcomesController],
  providers: [OutcomesService],
})
export class OutcomesModule {}
