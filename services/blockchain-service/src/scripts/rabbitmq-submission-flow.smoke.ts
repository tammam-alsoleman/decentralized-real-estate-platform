import { NestFactory } from '@nestjs/core';
import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';

import { AppModule } from '../app.module';
import type { SubmitContractRequest } from '../contracts/dto/submit-contract-request.dto';
import type { ContractStatus } from '../contracts/types/contract-status.type';
import type { ContractType } from '../contracts/types/contract-type.type';
import type { PropertyContractSubmissionRequestedEvent } from '../messaging/contracts/property-contract-submission-requested.event';

const EXPECTED_STATUS = 'PENDING_EXTERNAL_APPROVALS';
const TIMEOUT_MS = 30_000;

type SubmittedSmokeEvent = {
  eventType: 'blockchain.contract.submitted';
  transactionId: string;
  contractType: ContractType;
  status: ContractStatus;
  fabricTxId: string;
  channelName: string;
  chaincodeName: string;
};

type FailedSmokeEvent = {
  eventType: 'blockchain.contract.submission.failed';
  transactionId?: string;
  contractType?: ContractType;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
};

type ResultSmokeEvent = SubmittedSmokeEvent | FailedSmokeEvent;

type ResultEventWaiter = {
  result: Promise<ResultSmokeEvent>;
  cancel: () => Promise<void>;
};

function buildSalePayload(transactionId: string): SubmitContractRequest {
  const now = new Date().toISOString();

  return {
    transactionId,
    contractType: 'SALE',
    propertyId: `smoke-property-${transactionId}`,
    registryNumber: `SMOKE-REG-${transactionId}`,
    propertyType: 'APARTMENT',
    location: 'Smoke Test City',
    area: '100',
    ownershipDocumentHash: `sha256:${transactionId}:ownership`,
    ownershipDocumentCid: `ipfs://${transactionId}/ownership`,
    contractHash: `sha256:${transactionId}:contract`,
    contractCid: `ipfs://${transactionId}/contract`,
    auditPackageHash: `sha256:${transactionId}:audit`,
    auditPackageCid: `ipfs://${transactionId}/audit`,
    signaturesHash: `sha256:${transactionId}:signatures`,
    platformReference: `SMOKE-PLATFORM-${transactionId}`,
    platformProofHash: `sha256:${transactionId}:platform-proof`,
    occurredAt: now,
    sellerUserId: `seller-${transactionId}`,
    sellerFullName: 'Smoke Test Seller',
    sellerNationalId: `seller-national-id-${transactionId}`,
    buyerUserId: `buyer-${transactionId}`,
    buyerFullName: 'Smoke Test Buyer',
    buyerNationalId: `buyer-national-id-${transactionId}`,
    sellerSignedAt: now,
    buyerSignedAt: now,
    price: '100000',
    currency: 'USD',
  };
}

function buildSubmissionEvent(
  transactionId: string,
): PropertyContractSubmissionRequestedEvent {
  const messageId = randomUUID();

  return {
    messageId,
    correlationId: messageId,
    causationId: messageId,
    eventType: 'property.contract.submission.requested',
    schemaVersion: '1.0',
    occurredAt: new Date().toISOString(),
    producer: 'blockchain-service-rabbitmq-smoke',
    payload: buildSalePayload(transactionId),
  };
}

async function createResultQueue(
  channel: Channel,
  exchange: string,
  successRoutingKey: string,
  failureRoutingKey: string,
): Promise<string> {
  await channel.assertExchange(exchange, 'topic', { durable: true });
  const queue = await channel.assertQueue('', {
    exclusive: true,
    durable: false,
    autoDelete: true,
  });

  await channel.bindQueue(queue.queue, exchange, successRoutingKey);
  await channel.bindQueue(queue.queue, exchange, failureRoutingKey);

  return queue.queue;
}

async function waitForResultEvent(
  channel: Channel,
  queueName: string,
  transactionId: string,
): Promise<ResultEventWaiter> {
  let consumerTag: string | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  let handleMessage: (message: ConsumeMessage | null) => void = () => undefined;

  const cancelConsumer = async (): Promise<void> => {
    if (!consumerTag) {
      return;
    }

    const tag = consumerTag;
    consumerTag = undefined;

    try {
      await channel.cancel(tag);
    } catch {
      // The channel may already be closing during smoke-test cleanup.
    }
  };

  const resultPromise = new Promise<ResultSmokeEvent>((resolve, reject) => {
    timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      void cancelConsumer();
      reject(
        new Error(
          `Timed out waiting ${TIMEOUT_MS}ms for RabbitMQ result event for ${transactionId}`,
        ),
      );
    }, TIMEOUT_MS);

    handleMessage = (message) => {
      if (!message || settled) {
        return;
      }

      let event: ResultSmokeEvent;

      try {
        event = parseResultEvent(message);
      } catch {
        channel.ack(message);
        console.warn(
          'Ignored non-JSON RabbitMQ result message while waiting for smoke test result.',
        );
        return;
      }

      channel.ack(message);

      if (event.transactionId !== transactionId) {
        return;
      }

      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      void cancelConsumer();
      resolve(event);
    };
  });

  try {
    const consumeReply = await channel.consume(queueName, handleMessage, {
      noAck: false,
    });
    consumerTag = consumeReply.consumerTag;
  } catch (error) {
    if (timeout) {
      clearTimeout(timeout);
    }
    throw error;
  }

  return {
    result: resultPromise,
    cancel: cancelConsumer,
  };
}

function parseResultEvent(message: ConsumeMessage): ResultSmokeEvent {
  return JSON.parse(message.content.toString('utf8')) as ResultSmokeEvent;
}

async function publishSubmissionEvent(
  channel: Channel,
  exchange: string,
  routingKey: string,
  event: PropertyContractSubmissionRequestedEvent,
): Promise<void> {
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(event)), {
    contentType: 'application/json',
    persistent: true,
  });
}

function requireConfig(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`${name} is required for RabbitMQ submission smoke test`);
  }

  return value;
}

function assertSubmittedEvent(event: ResultSmokeEvent): SubmittedSmokeEvent {
  if (event.eventType === 'blockchain.contract.submission.failed') {
    console.error('RabbitMQ submission smoke test received failure event.');
    console.error(
      JSON.stringify(
        {
          eventType: event.eventType,
          transactionId: event.transactionId,
          contractType: event.contractType,
          errorCode: event.errorCode,
          errorMessage: event.errorMessage,
          retryable: event.retryable,
        },
        null,
        2,
      ),
    );
    throw new Error('Blockchain submission failed');
  }

  if (event.status !== EXPECTED_STATUS) {
    throw new Error(
      `Received status ${event.status}, expected ${EXPECTED_STATUS}`,
    );
  }

  if (!event.fabricTxId) {
    throw new Error('Submitted event did not include fabricTxId');
  }

  return event;
}

async function run(): Promise<void> {
  process.env.RABBITMQ_CONSUMER_ENABLED = 'true';

  const rabbitmqUrl = requireConfig('RABBITMQ_URL');
  const exchange = requireConfig('RABBITMQ_EXCHANGE', 'realestate.events');
  const inputRoutingKey = requireConfig(
    'RABBITMQ_CONTRACT_SUBMISSION_ROUTING_KEY',
    'property.contract.submission.requested',
  );
  const successRoutingKey = requireConfig(
    'RABBITMQ_CONTRACT_SUBMITTED_ROUTING_KEY',
    'blockchain.contract.submitted',
  );
  const failureRoutingKey = requireConfig(
    'RABBITMQ_CONTRACT_SUBMISSION_FAILED_ROUTING_KEY',
    'blockchain.contract.submission.failed',
  );

  let app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;
  let connection: ChannelModel | undefined;
  let channel: Channel | undefined;
  let resultWaiter: ResultEventWaiter | undefined;

  try {
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    const resultQueue = await createResultQueue(
      channel,
      exchange,
      successRoutingKey,
      failureRoutingKey,
    );
    const transactionId = `smoke-rmq-sale-${Date.now()}`;
    const submissionEvent = buildSubmissionEvent(transactionId);
    resultWaiter = await waitForResultEvent(
      channel,
      resultQueue,
      transactionId,
    );

    app = await NestFactory.createApplicationContext(AppModule);

    await publishSubmissionEvent(
      channel,
      exchange,
      inputRoutingKey,
      submissionEvent,
    );

    const resultEvent = assertSubmittedEvent(await resultWaiter.result);

    console.log('RabbitMQ submission flow smoke test succeeded.');
    console.log(`transactionId=${resultEvent.transactionId}`);
    console.log(`fabricTxId=${resultEvent.fabricTxId}`);
    console.log(`status=${resultEvent.status}`);
    console.log(`channelName=${resultEvent.channelName}`);
    console.log(`chaincodeName=${resultEvent.chaincodeName}`);
  } finally {
    if (resultWaiter) {
      await resultWaiter.cancel();
    }

    if (app) {
      await app.close();
    }

    if (channel) {
      await channel.close();
    }

    if (connection) {
      await connection.close();
    }
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error('RabbitMQ submission flow smoke test failed.');
  console.error(message);
  process.exitCode = 1;
});
