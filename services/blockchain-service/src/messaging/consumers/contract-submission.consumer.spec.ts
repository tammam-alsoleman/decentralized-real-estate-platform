import { ConfigService } from '@nestjs/config';

import { ContractSubmissionService } from '../../contracts/contract-submission.service';
import { ErrorCode } from '../../errors/error-codes';
import { BlockchainEventsPublisher } from '../publishers/blockchain-events.publisher';
import { RabbitmqService } from '../rabbitmq.service';
import { ContractSubmissionConsumer } from './contract-submission.consumer';

describe('ContractSubmissionConsumer', () => {
  it('does not start consuming when RABBITMQ_CONSUMER_ENABLED=false', async () => {
    const rabbitmqService = {
      connect: jest.fn(),
      consume: jest.fn(),
    } as unknown as jest.Mocked<RabbitmqService>;
    const consumer = new ContractSubmissionConsumer(
      {} as ContractSubmissionService,
      rabbitmqService,
      {} as BlockchainEventsPublisher,
      {
        get: jest.fn((key: string) =>
          key === 'rabbitmq.consumerEnabled' ? false : undefined,
        ),
      } as unknown as ConfigService,
    );

    await consumer.onModuleInit();

    expect(rabbitmqService.connect).not.toHaveBeenCalled();
    expect(rabbitmqService.consume).not.toHaveBeenCalled();
  });

  it('starts consuming when RABBITMQ_CONSUMER_ENABLED=true', async () => {
    const rabbitmqService = {
      connect: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RabbitmqService>;
    const consumer = new ContractSubmissionConsumer(
      {} as ContractSubmissionService,
      rabbitmqService,
      {} as BlockchainEventsPublisher,
      {
        get: jest.fn((key: string) => {
          const values: Record<string, unknown> = {
            'rabbitmq.consumerEnabled': true,
            'rabbitmq.contractSubmissionQueue':
              'blockchain.contract-submission',
          };

          return values[key];
        }),
      } as unknown as ConfigService,
    );

    await consumer.onModuleInit();

    expect(rabbitmqService.connect).toHaveBeenCalledTimes(1);
    expect(rabbitmqService.consume).toHaveBeenCalledWith(
      'blockchain.contract-submission',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('publishes a sanitized failure event for invalid JSON messages', async () => {
    const rabbitmqService = {
      connect: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RabbitmqService>;
    const eventsPublisher = {
      publishContractSubmissionFailed: jest.fn(),
    } as unknown as jest.Mocked<BlockchainEventsPublisher>;
    const consumer = new ContractSubmissionConsumer(
      {} as ContractSubmissionService,
      rabbitmqService,
      eventsPublisher,
      {
        get: jest.fn((key: string) => {
          const values: Record<string, unknown> = {
            'rabbitmq.consumerEnabled': true,
            'rabbitmq.contractSubmissionQueue':
              'blockchain.contract-submission',
          };

          return values[key];
        }),
      } as unknown as ConfigService,
    );

    await consumer.onModuleInit();

    const invalidJsonHandler = rabbitmqService.consume.mock.calls[0][2] as (
      error: Error,
    ) => Promise<void>;
    await invalidJsonHandler(
      new SyntaxError(
        'Unexpected token in internal-parser-stack: raw-message-details',
      ),
    );

    expect(
      eventsPublisher.publishContractSubmissionFailed,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'blockchain.contract.submission.failed',
        errorCode: ErrorCode.VALIDATION_ERROR,
        errorMessage: 'Invalid JSON message received from RabbitMQ',
        retryable: false,
      }),
    );

    const event =
      eventsPublisher.publishContractSubmissionFailed.mock.calls[0][0];
    const serializedEvent = JSON.stringify(event);

    expect(serializedEvent).not.toContain('internal-parser-stack');
    expect(serializedEvent).not.toContain('raw-message-details');
    expect(serializedEvent).not.toContain('stack');
  });
});
