import { ContractStatus } from '../../contracts/types/contract-status.type';

export type BlockchainContractConfirmedEvent = {
  transactionId: string;
  fabricTxId: string;
  status: ContractStatus;
  occurredAt: string;
  correlationId: string;
};
