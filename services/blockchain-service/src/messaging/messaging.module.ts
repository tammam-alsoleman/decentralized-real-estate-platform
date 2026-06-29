import { Module, forwardRef } from '@nestjs/common';

import { ContractsModule } from '../contracts/contracts.module';
import { ContractSubmissionConsumer } from './consumers/contract-submission.consumer';
import { BlockchainEventsPublisher } from './publishers/blockchain-events.publisher';
import { RabbitmqService } from './rabbitmq.service';

@Module({
  imports: [forwardRef(() => ContractsModule)],
  providers: [
    RabbitmqService,
    ContractSubmissionConsumer,
    BlockchainEventsPublisher,
  ],
  exports: [RabbitmqService, BlockchainEventsPublisher],
})
export class MessagingModule {}
