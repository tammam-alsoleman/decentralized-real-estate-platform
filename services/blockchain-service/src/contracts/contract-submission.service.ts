import { Injectable } from '@nestjs/common';

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
  ) {}

  async handleSubmissionRequested(
    event: PropertyContractSubmissionRequestedEvent,
  ): Promise<ContractSubmissionResult> {
    try {
      ContractPayloadValidator.validate(event.payload);
      const fabricPayload = SubmitContractMapper.toFabricPayload(event.payload);
      const result = await this.fabricClient.submitContract(fabricPayload);

      await this.eventsPublisher.publishContractSubmitted({
        transactionId: result.transactionId,
        fabricTxId: result.fabricTxId,
        status: result.status,
        payloadHash: result.payloadHash,
        occurredAt: new Date().toISOString(),
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
        transactionId: event.payload?.transactionId,
        errorCode: serviceError.code,
        errorMessage: serviceError.message,
        retryable: serviceError.retryable,
        occurredAt: new Date().toISOString(),
        correlationId: event.correlationId,
      });

      throw serviceError;
    }
  }
}
