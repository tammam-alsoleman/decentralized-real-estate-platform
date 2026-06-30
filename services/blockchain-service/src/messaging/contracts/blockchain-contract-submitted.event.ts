import type { ContractStatus } from '../../contracts/types/contract-status.type';
import type { ContractType } from '../../contracts/types/contract-type.type';

export type BlockchainContractSubmittedEvent = {
  eventId: string;
  eventType: 'blockchain.contract.submitted';
  occurredAt: string;
  transactionId: string;
  contractType: ContractType;
  status: ContractStatus;
  fabricTxId: string;
  channelName: string;
  chaincodeName: string;
  payloadHash?: string;
  correlationId: string;
};
