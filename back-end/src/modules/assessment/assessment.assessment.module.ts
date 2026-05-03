import { Module, forwardRef } from '@nestjs/common';
import { AssessmentController } from './assessment.assessment.controller';
import { AssessmentService } from './assessment.assessment.service';
import { AssessmentRepository } from './assessment.assessment.repository';
import { MarksRepository } from './marks.marks.repository';
import { NotificationService } from '../../common/services/notification.service';
import { OutcomeModule } from '../outcome/outcome.outcome.module';

@Module({
  imports: [forwardRef(() => OutcomeModule)],
  controllers: [AssessmentController],
  providers: [AssessmentService, AssessmentRepository, MarksRepository, NotificationService],
  exports: [AssessmentService, MarksRepository, AssessmentRepository],
})
export class AssessmentModule {}
