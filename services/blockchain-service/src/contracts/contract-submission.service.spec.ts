import { ConfigService } from '@nestjs/config';

import { ErrorCode } from '../errors/error-codes';
import { ServiceError } from '../errors/service-error';
import { FabricClientService } from '../fabric/fabric-client.service';
import { BlockchainEventsPublisher } from '../messaging/publishers/blockchain-events.publisher';
import { validSaleSubmitContractFixture } from './test-fixtures/valid-sale-submit-contract.fixture';
import { ContractSubmissionService } from './contract-submission.service';
import type { PropertyContractSubmissionRequestedEvent } from '../messaging/contracts/property-contract-submission-requested.event';

function buildEvent(): PropertyContractSubmissionRequestedEvent {
  return {
    messageId: 'message-001',
    correlationId: 'correlation-001',
    causationId: 'causation-001',
    eventType: 'property.contract.submission.requested',
    schemaVersion: '1.0',
    occurredAt: '2026-01-01T00:00:00Z',
    producer: 'property-service',
    payload: validSaleSubmitContractFixture(),
  };
}

describe('ContractSubmissionService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'fabric.channelName': 'realestatechannel',
        'fabric.chaincodeName': 'realestate-contract',
      };

      return values[key];
    }),
  } as unknown as ConfigService;

  it('submits a valid message to Fabric and publishes blockchain.contract.submitted', async () => {
    const fabricClient = {
      submitContract: jest.fn().mockResolvedValue({
        transactionId: 'test-sale-transaction-001',
        fabricTxId: 'fabric-tx-001',
        status: 'PENDING_EXTERNAL_APPROVALS',
        payloadHash: 'payload-hash',
      }),
      confirmContract: jest.fn(),
      approveByRegistry: jest.fn(),
      rejectByRegistry: jest.fn(),
      approveByNotary: jest.fn(),
      rejectByNotary: jest.fn(),
    } as unknown as jest.Mocked<FabricClientService>;
    const eventsPublisher = {
      publishContractSubmitted: jest.fn(),
      publishContractSubmissionFailed: jest.fn(),
    } as unknown as jest.Mocked<BlockchainEventsPublisher>;
    const service = new ContractSubmissionService(
      fabricClient,
      eventsPublisher,
      configService,
    );

    const result = await service.handleSubmissionRequested(buildEvent());

    expect(fabricClient.submitContract).toHaveBeenCalledTimes(1);
    const fabricClientMock = fabricClient as unknown as Record<
      string,
      jest.Mock
    >;
    expect(fabricClientMock.confirmContract).not.toHaveBeenCalled();
    expect(fabricClientMock.approveByRegistry).not.toHaveBeenCalled();
    expect(fabricClientMock.rejectByRegistry).not.toHaveBeenCalled();
    expect(fabricClientMock.approveByNotary).not.toHaveBeenCalled();
    expect(fabricClientMock.rejectByNotary).not.toHaveBeenCalled();
    expect(eventsPublisher.publishContractSubmitted).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'blockchain.contract.submitted',
        transactionId: 'test-sale-transaction-001',
        contractType: 'SALE',
        status: 'PENDING_EXTERNAL_APPROVALS',
        fabricTxId: 'fabric-tx-001',
        channelName: 'realestatechannel',
        chaincodeName: 'realestate-contract',
        correlationId: 'correlation-001',
      }),
    );
    expect(eventsPublisher.publishContractSubmissionFailed).not.toHaveBeenCalled();
    expect(result).toEqual({
      transactionId: 'test-sale-transaction-001',
      status: 'PENDING_EXTERNAL_APPROVALS',
      fabricTxId: 'fabric-tx-001',
    });
  });

  it('publishes blockchain.contract.submission.failed when Fabric submission fails', async () => {
    const fabricClient = {
      submitContract: jest.fn().mockRejectedValue(
        new ServiceError(
          ErrorCode.FABRIC_TRANSIENT_ERROR,
          'Fabric network is temporarily unavailable',
          true,
        ),
      ),
    } as unknown as jest.Mocked<FabricClientService>;
    const eventsPublisher = {
      publishContractSubmitted: jest.fn(),
      publishContractSubmissionFailed: jest.fn(),
    } as unknown as jest.Mocked<BlockchainEventsPublisher>;
    const service = new ContractSubmissionService(
      fabricClient,
      eventsPublisher,
      configService,
    );

    await expect(service.handleSubmissionRequested(buildEvent())).rejects.toThrow(
      ServiceError,
    );

    expect(eventsPublisher.publishContractSubmitted).not.toHaveBeenCalled();
    expect(eventsPublisher.publishContractSubmissionFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'blockchain.contract.submission.failed',
        transactionId: 'test-sale-transaction-001',
        contractType: 'SALE',
        errorCode: ErrorCode.FABRIC_TRANSIENT_ERROR,
        errorMessage: 'Fabric network is temporarily unavailable',
        retryable: true,
        correlationId: 'correlation-001',
      }),
    );
  });

  it('publishes blockchain.contract.submission.failed when validation fails', async () => {
    const event = buildEvent();
    event.payload = {
      ...event.payload,
      rentAmount: '1500',
    };
    const fabricClient = {
      submitContract: jest.fn(),
    } as unknown as jest.Mocked<FabricClientService>;
    const eventsPublisher = {
      publishContractSubmitted: jest.fn(),
      publishContractSubmissionFailed: jest.fn(),
    } as unknown as jest.Mocked<BlockchainEventsPublisher>;
    const service = new ContractSubmissionService(
      fabricClient,
      eventsPublisher,
      configService,
    );

    await expect(service.handleSubmissionRequested(event)).rejects.toThrow(
      ServiceError,
    );

    expect(fabricClient.submitContract).not.toHaveBeenCalled();
    expect(eventsPublisher.publishContractSubmissionFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'blockchain.contract.submission.failed',
        transactionId: 'test-sale-transaction-001',
        contractType: 'SALE',
        errorCode: ErrorCode.VALIDATION_ERROR,
        retryable: false,
      }),
    );
  });
});
