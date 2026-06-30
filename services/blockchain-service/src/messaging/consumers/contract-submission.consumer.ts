import { Inject, Injectable, Logger, OnModuleInit, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { ContractSubmissionService } from '../../contracts/contract-submission.service';
import { ErrorCode } from '../../errors/error-codes';
import { BlockchainEventsPublisher } from '../publishers/blockchain-events.publisher';
import { RabbitmqService } from '../rabbitmq.service';
import type { PropertyContractSubmissionRequestedEvent } from '../contracts/property-contract-submission-requested.event';

@Injectable()
export class ContractSubmissionConsumer implements OnModuleInit {
  static readonly eventType = 'property.contract.submission.requested';
  private readonly logger = new Logger(ContractSubmissionConsumer.name);

  constructor(
    @Inject(forwardRef(() => ContractSubmissionService))
    private readonly contractSubmissionService: ContractSubmissionService,
    private readonly rabbitmqService: RabbitmqService,
    private readonly eventsPublisher: BlockchainEventsPublisher,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.consumerEnabled) {
      this.logger.log('RabbitMQ contract submission consumer is disabled.');
      return;
    }

    await this.rabbitmqService.connect();
    await this.rabbitmqService.consume<PropertyContractSubmissionRequestedEvent>(
      this.contractSubmissionQueue,
      (event) => this.handle(event),
      (error) => this.handleInvalidJson(error),
    );
    this.logger.log('RabbitMQ contract submission consumer started.');
  }

  async handle(
    event: PropertyContractSubmissionRequestedEvent,
  ): Promise<void> {
    await this.contractSubmissionService.handleSubmissionRequested(event);
  }

  private async handleInvalidJson(error: Error): Promise<void> {
    await this.eventsPublisher.publishContractSubmissionFailed({
      eventId: randomUUID(),
      eventType: 'blockchain.contract.submission.failed',
      occurredAt: new Date().toISOString(),
      errorCode: ErrorCode.VALIDATION_ERROR,
      errorMessage: 'Invalid JSON message received from RabbitMQ',
      retryable: false,
    });

    this.logger.warn(`Invalid RabbitMQ JSON message acknowledged: ${error.message}`);
  }

  private get consumerEnabled(): boolean {
    return this.configService.get<boolean>('rabbitmq.consumerEnabled') === true;
  }

  private get contractSubmissionQueue(): string {
    return (
      this.configService.get<string>('rabbitmq.contractSubmissionQueue') ??
      'blockchain.contract-submission'
    );
  }
}
