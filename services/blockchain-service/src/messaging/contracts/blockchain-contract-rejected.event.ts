import { ContractStatus } from '../../contracts/types/contract-status.type';

export type BlockchainContractRejectedEvent = {
  transactionId: string;
  status: ContractStatus;
  rejectedBy: 'REGISTRY' | 'NOTARY';
  reasonCode?: string;
  reasonSummary?: string;
  evidenceHash?: string;
  evidenceCid?: string;
  fabricTxId?: string;
  occurredAt: string;
  correlationId: string;
};
