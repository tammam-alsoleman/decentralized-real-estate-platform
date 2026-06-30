import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { FabricClientService } from '../fabric/fabric-client.service';
import { BlockchainEventsPublisher } from '../messaging/publishers/blockchain-events.publisher';
import { FabricErrorMapper } from '../errors/fabric-error.mapper';
import { ServiceError } from '../errors/service-error';
import { SubmitContractMapper } from './mappers/submit-contract.mapper';
import { ContractPayloadValidator } from './validators/contract-payload.validator';
import type { PropertyContractSubmissionRequestedEvent } from '../messaging/contracts/property-contract-submission-requested.event';

export type ContractSubmissionResult = {
  transactionId: string;
  status: string;
  fabricTxId?: string;
};

@Injectable()
export class ContractSubmissionService {
  constructor(
    private readonly fabricClient: FabricClientService,
    private readonly eventsPublisher: BlockchainEventsPublisher,
    private readonly configService: ConfigService,
  ) {}

  async handleSubmissionRequested(
    event: PropertyContractSubmissionRequestedEvent,
  ): Promise<ContractSubmissionResult> {
    try {
      ContractPayloadValidator.validate(event.payload);
      const fabricPayload = SubmitContractMapper.toFabricPayload(event.payload);
      const result = await this.fabricClient.submitContract(fabricPayload);

      await this.eventsPublisher.publishContractSubmitted({
        eventId: randomUUID(),
        eventType: 'blockchain.contract.submitted',
        occurredAt: new Date().toISOString(),
        transactionId: result.transactionId,
        contractType: event.payload.contractType,
        status: result.status,
        fabricTxId: result.fabricTxId,
        channelName:
          this.configService.get<string>('fabric.channelName') ??
          'realestatechannel',
        chaincodeName:
          this.configService.get<string>('fabric.chaincodeName') ??
          'realestate-contract',
        payloadHash: result.payloadHash,
        correlationId: event.correlationId,
      });

      return {
        transactionId: result.transactionId,
        status: result.status,
        fabricTxId: result.fabricTxId,
      };
    } catch (error) {
      const serviceError =
        error instanceof ServiceError
          ? error
          : FabricErrorMapper.toServiceError(error);

      await this.eventsPublisher.publishContractSubmissionFailed({
        eventId: randomUUID(),
        eventType: 'blockchain.contract.submission.failed',
        occurredAt: new Date().toISOString(),
        transactionId: event.payload?.transactionId,
        contractType: event.payload?.contractType,
        errorCode: serviceError.code,
        errorMessage: serviceError.message,
        retryable: serviceError.retryable,
        correlationId: event.correlationId,
      });

      throw serviceError;
    }
  }
}
