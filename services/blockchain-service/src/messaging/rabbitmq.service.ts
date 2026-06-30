import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';

export type RabbitMessageHandler<TMessage> = (
  message: TMessage,
) => Promise<void> | void;

export type RabbitInvalidJsonHandler = (
  error: Error,
  rawMessage: ConsumeMessage,
) => Promise<void> | void;

@Injectable()
export class RabbitmqService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connected = false;
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly configService: ConfigService) {}

  async connect(): Promise<void> {
    if (this.channel) {
      return;
    }

    const connection = await amqp.connect(this.rabbitmqUrl);
    const channel = await connection.createChannel();

    await channel.assertExchange(this.exchangeName, 'topic', {
      durable: true,
    });
    await channel.assertQueue(this.contractSubmissionQueue, {
      durable: true,
    });
    await channel.bindQueue(
      this.contractSubmissionQueue,
      this.exchangeName,
      this.contractSubmissionRoutingKey,
    );
    await channel.prefetch(1);

    this.connection = connection;
    this.channel = channel;
    this.connected = true;
    this.logger.log('RabbitMQ connection established.');
  }

  async publish<TMessage>(
    routingKey: string,
    message: TMessage,
  ): Promise<void> {
    const channel = await this.getChannel();
    const published = channel.publish(
      this.exchangeName,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        contentType: 'application/json',
        persistent: true,
      },
    );

    if (!published) {
      this.logger.warn(`RabbitMQ publish buffer is full for ${routingKey}.`);
    }
  }

  async consume<TMessage>(
    queueName: string,
    handler: RabbitMessageHandler<TMessage>,
    invalidJsonHandler?: RabbitInvalidJsonHandler,
  ): Promise<void> {
    const channel = await this.getChannel();

    await channel.consume(
      queueName,
      async (rawMessage) => {
        if (!rawMessage) {
          return;
        }

        try {
          const message = this.parseJsonMessage<TMessage>(rawMessage);
          await handler(message);
        } catch (error) {
          if (error instanceof SyntaxError && invalidJsonHandler) {
            await invalidJsonHandler(error, rawMessage);
          } else {
            this.logger.error(
              'RabbitMQ message handling failed; message will be acknowledged to avoid requeue loop.',
              error instanceof Error ? error.message : String(error),
            );
          }
        } finally {
          channel.ack(rawMessage);
        }
      },
      {
        noAck: false,
      },
    );
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = undefined;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = undefined;
    }

    this.connected = false;
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async getChannel(): Promise<Channel> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available');
    }

    return this.channel;
  }

  private parseJsonMessage<TMessage>(rawMessage: ConsumeMessage): TMessage {
    return JSON.parse(rawMessage.content.toString('utf8')) as TMessage;
  }

  private get rabbitmqUrl(): string {
    return (
      this.configService.get<string>('rabbitmq.url') ??
      'amqp://guest:guest@rabbitmq:5672'
    );
  }

  private get exchangeName(): string {
    return this.configService.get<string>('rabbitmq.exchange') ?? 'realestate.events';
  }

  private get contractSubmissionQueue(): string {
    return (
      this.configService.get<string>('rabbitmq.contractSubmissionQueue') ??
      'blockchain.contract-submission'
    );
  }

  private get contractSubmissionRoutingKey(): string {
    return (
      this.configService.get<string>('rabbitmq.contractSubmissionRoutingKey') ??
      'property.contract.submission.requested'
    );
  }
}
