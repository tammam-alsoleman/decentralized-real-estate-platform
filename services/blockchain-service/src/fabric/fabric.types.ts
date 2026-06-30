import type { ContractStatus } from '../contracts/types/contract-status.type';
import type { ContractType } from '../contracts/types/contract-type.type';

export type FabricSubmitResult = {
  transactionId: string;
  fabricTxId: string;
  status: ContractStatus;
  payloadHash?: string;
  contractRecord?: FabricContractRecord;
  rawResult?: string;
};

export type FabricContractRecord = {
  transactionId: string;
  contractType: ContractType;
  status: ContractStatus;
  fabricTxId?: string;
  payloadHash?: string;
  [key: string]: unknown;
};

export type FabricHistoryRecord = {
  txId: string;
  timestamp: string;
  isDelete: boolean;
  value?: FabricContractRecord;
};
