import { Module, forwardRef } from '@nestjs/common';
import { OutcomeController } from './outcome.outcome.controller';
import { OutcomeService } from './outcome.outcome.service';
import { OutcomeRepository } from './outcome.outcome.repository';
import { AssessmentModule } from '../assessment/assessment.assessment.module';

@Module({
  imports: [forwardRef(() => AssessmentModule)],
  controllers: [OutcomeController],
  providers: [OutcomeService, OutcomeRepository],
  exports: [OutcomeService],
})
export class OutcomeModule {}
