import type { ErrorCode } from '../../errors/error-codes';
import type { ContractType } from '../../contracts/types/contract-type.type';

export type BlockchainContractSubmissionFailedEvent = {
  eventId: string;
  eventType: 'blockchain.contract.submission.failed';
  occurredAt: string;
  transactionId?: string;
  contractType?: ContractType;
  errorCode: ErrorCode;
  errorMessage: string;
  retryable: boolean;
  correlationId?: string;
};
