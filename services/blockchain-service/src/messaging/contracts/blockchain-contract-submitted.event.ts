import type { ContractStatus } from '../../contracts/types/contract-status.type';

export type BlockchainContractSubmittedEvent = {
  transactionId: string;
  fabricTxId: string;
  status: ContractStatus;
  payloadHash?: string;
  occurredAt: string;
  correlationId: string;
};
