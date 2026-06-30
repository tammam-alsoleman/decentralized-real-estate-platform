import { Injectable } from '@nestjs/common';

import { ErrorCode } from '../errors/error-codes';
import { FabricErrorMapper } from '../errors/fabric-error.mapper';
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
    payload: Record<string, unknown>,
  ): Promise<FabricSubmitResult> {
    const connection = this.gatewayFactory.createGateway();

    try {
      const proposal = connection.contract.newProposal('SubmitContract', {
        arguments: [JSON.stringify(payload)],
      });
      const transaction = await proposal.endorse();
      const response = transaction.getResult();
      const fabricTxId = transaction.getTransactionId();
      const commit = await transaction.submit();
      const commitStatus = await commit.getStatus();

      if (!commitStatus.successful) {
        throw new ServiceError(
          ErrorCode.FABRIC_REJECTED_STATE_ERROR,
          `Fabric transaction ${fabricTxId} failed validation`,
        );
      }

      const rawResult = fabricResponseToString(response);
      const contractRecord =
        parseFabricJsonResponse<FabricContractRecord>(response);

      return {
        transactionId:
          contractRecord?.transactionId ?? String(payload.transactionId ?? ''),
        fabricTxId,
        status: this.requireContractStatus(contractRecord?.status),
        payloadHash: this.optionalString(contractRecord?.payloadHash),
        contractRecord: contractRecord ?? undefined,
        rawResult: rawResult || undefined,
      };
    } catch (error) {
      throw FabricErrorMapper.toServiceError(error);
    } finally {
      connection.close();
    }
  }

  async getContractByTxId(
    transactionId: string,
  ): Promise<FabricContractRecord> {
    const connection = this.gatewayFactory.createGateway();

    try {
      const response = await connection.contract.evaluateTransaction(
        'GetContractByTxId',
        transactionId,
      );

      return this.requireJsonResponse<FabricContractRecord>(
        response,
        'GetContractByTxId',
      );
    } catch (error) {
      throw FabricErrorMapper.toServiceError(error);
    } finally {
      connection.close();
    }
  }

  async getContractHistory(
    transactionId: string,
  ): Promise<FabricHistoryRecord[]> {
    const connection = this.gatewayFactory.createGateway();

    try {
      const response = await connection.contract.evaluateTransaction(
        'GetContractHistory',
        transactionId,
      );

      return parseFabricJsonResponse<FabricHistoryRecord[]>(response) ?? [];
    } catch (error) {
      throw FabricErrorMapper.toServiceError(error);
    } finally {
      connection.close();
    }
  }

  async confirmContract(transactionId: string): Promise<FabricContractRecord> {
    const connection = this.gatewayFactory.createGateway();

    try {
      const proposal = connection.contract.newProposal('ConfirmContract', {
        arguments: [transactionId],
      });
      const transaction = await proposal.endorse();
      const response = transaction.getResult();
      const fabricTxId = transaction.getTransactionId();
      const commit = await transaction.submit();
      const commitStatus = await commit.getStatus();

      if (!commitStatus.successful) {
        throw new ServiceError(
          ErrorCode.FABRIC_REJECTED_STATE_ERROR,
          `Fabric transaction ${fabricTxId} failed validation`,
        );
      }

      const record = this.requireJsonResponse<FabricContractRecord>(
        response,
        'ConfirmContract',
      );

      return {
        ...record,
        fabricTxId: record.fabricTxId ?? fabricTxId,
      };
    } catch (error) {
      throw FabricErrorMapper.toServiceError(error);
    } finally {
      connection.close();
    }
  }

  private requireJsonResponse<T>(response: Uint8Array, operation: string): T {
    const parsed = parseFabricJsonResponse<T>(response);

    if (!parsed) {
      throw new ServiceError(
        ErrorCode.FABRIC_PRECONDITION_ERROR,
        `${operation} returned an empty Fabric response`,
      );
    }

    return parsed;
  }

  private requireContractStatus(status: unknown): FabricSubmitResult['status'] {
    if (
      status === 'PENDING_EXTERNAL_APPROVALS' ||
      status === 'REJECTED_BY_REGISTRY' ||
      status === 'REJECTED_BY_NOTARY' ||
      status === 'CONFIRMED'
    ) {
      return status;
    }

    throw new ServiceError(
      ErrorCode.FABRIC_PRECONDITION_ERROR,
      'SubmitContract returned a Fabric response without a valid status',
    );
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}

export function fabricResponseToString(response: Uint8Array): string {
  if (response.length === 0) {
    return '';
  }

  return Buffer.from(response).toString('utf8');
}

export function parseFabricJsonResponse<T>(response: Uint8Array): T | null {
  const rawResult = fabricResponseToString(response);

  if (!rawResult) {
    return null;
  }

  try {
    return JSON.parse(rawResult) as T;
  } catch (error) {
    throw new ServiceError(
      ErrorCode.FABRIC_PRECONDITION_ERROR,
      'Fabric transaction returned an invalid JSON response',
      false,
      error,
    );
  }
}
