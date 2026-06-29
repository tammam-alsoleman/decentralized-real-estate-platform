import { Injectable } from '@nestjs/common';

import { ErrorCode } from '../errors/error-codes';
import { ServiceError } from '../errors/service-error';
import { FabricGatewayFactory } from './fabric-gateway.factory';
import type {
  FabricContractRecord,
  FabricHistoryRecord,
  FabricSubmitResult,
} from './fabric.types';

@Injectable()
export class FabricClientService {
  constructor(private readonly gatewayFactory: FabricGatewayFactory) {}

  async submitContract(
    _payload: Record<string, unknown>,
  ): Promise<FabricSubmitResult> {
    this.gatewayFactory.getConfig();
    throw new ServiceError(
      ErrorCode.NOT_IMPLEMENTED,
      'Fabric submitContract is not implemented in the skeleton',
    );
  }

  async getContractByTxId(
    _transactionId: string,
  ): Promise<FabricContractRecord> {
    this.gatewayFactory.getConfig();
    throw new ServiceError(
      ErrorCode.NOT_IMPLEMENTED,
      'Fabric getContractByTxId is not implemented in the skeleton',
    );
  }

  async getContractHistory(
    _transactionId: string,
  ): Promise<FabricHistoryRecord[]> {
    this.gatewayFactory.getConfig();
    throw new ServiceError(
      ErrorCode.NOT_IMPLEMENTED,
      'Fabric getContractHistory is not implemented in the skeleton',
    );
  }

  async confirmContract(_transactionId: string): Promise<FabricContractRecord> {
    this.gatewayFactory.getConfig();
    throw new ServiceError(
      ErrorCode.NOT_IMPLEMENTED,
      'Fabric confirmContract is not implemented in the skeleton',
    );
  }
}
