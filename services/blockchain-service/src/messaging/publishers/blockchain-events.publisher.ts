import { Injectable } from '@nestjs/common';

import { BlockchainContractConfirmedEvent } from '../contracts/blockchain-contract-confirmed.event';
import { BlockchainContractRejectedEvent } from '../contracts/blockchain-contract-rejected.event';
import { BlockchainContractSubmissionFailedEvent } from '../contracts/blockchain-contract-submission-failed.event';
import { BlockchainContractSubmittedEvent } from '../contracts/blockchain-contract-submitted.event';
import { RabbitmqService } from '../rabbitmq.service';

@Injectable()
export class BlockchainEventsPublisher {
  constructor(private readonly rabbitmqService: RabbitmqService) {}

  async publishContractSubmitted(
    event: BlockchainContractSubmittedEvent,
  ): Promise<void> {
    await this.rabbitmqService.publish('blockchain.contract.submitted', event);
  }

  async publishContractSubmissionFailed(
    event: BlockchainContractSubmissionFailedEvent,
  ): Promise<void> {
    await this.rabbitmqService.publish(
      'blockchain.contract.submission.failed',
      event,
    );
  }

  async publishContractConfirmed(
    event: BlockchainContractConfirmedEvent,
  ): Promise<void> {
    await this.rabbitmqService.publish('blockchain.contract.confirmed', event);
  }

  async publishContractRejected(
    event: BlockchainContractRejectedEvent,
  ): Promise<void> {
    await this.rabbitmqService.publish('blockchain.contract.rejected', event);
  }
}
