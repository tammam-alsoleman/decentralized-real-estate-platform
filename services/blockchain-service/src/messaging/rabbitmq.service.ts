import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type RabbitMessageHandler<TMessage> = (
  message: TMessage,
) => Promise<void> | void;

@Injectable()
export class RabbitmqService {
  private connected = false;

  constructor(private readonly configService: ConfigService) {}

  async connect(): Promise<void> {
    this.configService.get<string>('rabbitmq.url');
    this.connected = false;
  }

  async publish<TMessage>(
    routingKey: string,
    message: TMessage,
  ): Promise<void> {
    void routingKey;
    void message;
  }

  async consume<TMessage>(
    queueName: string,
    handler: RabbitMessageHandler<TMessage>,
  ): Promise<void> {
    void queueName;
    void handler;
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
