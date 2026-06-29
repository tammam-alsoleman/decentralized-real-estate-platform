import type { ErrorCode } from '../../errors/error-codes';

export type BlockchainContractSubmissionFailedEvent = {
  transactionId?: string;
  errorCode: ErrorCode;
  errorMessage: string;
  retryable: boolean;
  occurredAt: string;
  correlationId: string;
};
