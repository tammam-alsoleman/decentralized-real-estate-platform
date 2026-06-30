import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

import { RabbitmqService } from './rabbitmq.service';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('RabbitmqService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'rabbitmq.url': 'amqp://guest:guest@localhost:5672',
        'rabbitmq.exchange': 'realestate.events',
        'rabbitmq.contractSubmissionQueue': 'blockchain.contract-submission',
        'rabbitmq.contractSubmissionRoutingKey':
          'property.contract.submission.requested',
      };

      return values[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes JSON messages to the configured exchange', async () => {
    const channel = createChannelMock();
    mockConnection(channel);
    const service = new RabbitmqService(configService);

    await service.publish('blockchain.contract.submitted', {
      transactionId: 'tx-001',
    });

    expect(channel.assertExchange).toHaveBeenCalledWith(
      'realestate.events',
      'topic',
      { durable: true },
    );
    expect(channel.assertQueue).toHaveBeenCalledWith(
      'blockchain.contract-submission',
      { durable: true },
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      'blockchain.contract-submission',
      'realestate.events',
      'property.contract.submission.requested',
    );
    expect(channel.publish).toHaveBeenCalledWith(
      'realestate.events',
      'blockchain.contract.submitted',
      Buffer.from(JSON.stringify({ transactionId: 'tx-001' })),
      {
        contentType: 'application/json',
        persistent: true,
      },
    );
  });

  it('publishes invalid JSON failures through the invalid handler and acknowledges the message', async () => {
    const channel = createChannelMock();
    mockConnection(channel);
    const service = new RabbitmqService(configService);
    const handler = jest.fn();
    const invalidJsonHandler = jest.fn();

    await service.consume(
      'blockchain.contract-submission',
      handler,
      invalidJsonHandler,
    );

    const consumeCallback = (channel.consume as jest.Mock).mock.calls[0][1] as (
      message: ConsumeMessage,
    ) => Promise<void>;
    const rawMessage = {
      content: Buffer.from('{invalid-json'),
    } as ConsumeMessage;

    await consumeCallback(rawMessage);

    expect(handler).not.toHaveBeenCalled();
    expect(invalidJsonHandler).toHaveBeenCalledWith(
      expect.any(SyntaxError),
      rawMessage,
    );
    expect(channel.ack).toHaveBeenCalledWith(rawMessage);
  });
});

function createChannelMock(): jest.Mocked<Channel> {
  return {
    assertExchange: jest.fn().mockResolvedValue(undefined),
    assertQueue: jest.fn().mockResolvedValue(undefined),
    bindQueue: jest.fn().mockResolvedValue(undefined),
    prefetch: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockReturnValue(true),
    consume: jest.fn().mockResolvedValue({ consumerTag: 'consumer-001' }),
    ack: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<Channel>;
}

function mockConnection(channel: jest.Mocked<Channel>): void {
  const connection = {
    createChannel: jest.fn().mockResolvedValue(channel),
    close: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ChannelModel>;

  (amqp.connect as jest.Mock).mockResolvedValue(connection);
}
