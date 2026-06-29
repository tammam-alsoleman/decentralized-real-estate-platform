import { Module, forwardRef } from '@nestjs/common';

import { FabricModule } from '../fabric/fabric.module';
import { MessagingModule } from '../messaging/messaging.module';
import { ContractSubmissionService } from './contract-submission.service';

@Module({
  imports: [FabricModule, forwardRef(() => MessagingModule)],
  providers: [ContractSubmissionService],
  exports: [ContractSubmissionService],
})
export class ContractsModule {}
