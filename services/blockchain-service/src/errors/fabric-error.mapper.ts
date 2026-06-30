import { ErrorCode } from './error-codes';
import { ServiceError } from './service-error';

export class FabricErrorMapper {
  static toServiceError(error: unknown): ServiceError {
    if (error instanceof ServiceError) {
      return error;
    }

    if (error instanceof Error) {
      const message = `${error.name} ${error.message}`.toLowerCase();

      if (
        message.includes('msp') ||
        message.includes('authorization') ||
        message.includes('access denied') ||
        message.includes('permission')
      ) {
        return new ServiceError(
          ErrorCode.FABRIC_AUTHORIZATION_ERROR,
          'Fabric authorization failed',
          false,
          error,
        );
      }

      if (
        message.includes('already exists') ||
        message.includes('different payload') ||
        message.includes('duplicate') ||
        message.includes('mvcc')
      ) {
        return new ServiceError(
          ErrorCode.FABRIC_CONFLICT_ERROR,
          'Fabric transaction conflicts with existing ledger state',
          false,
          error,
        );
      }

      if (message.includes('not found')) {
        return new ServiceError(
          ErrorCode.FABRIC_NOT_FOUND,
          'Fabric ledger record was not found',
          false,
          error,
        );
      }

      if (
        message.includes('timeout') ||
        message.includes('deadline') ||
        message.includes('unavailable')
      ) {
        return new ServiceError(
          ErrorCode.FABRIC_TRANSIENT_ERROR,
          'Fabric network is temporarily unavailable',
          true,
          error,
        );
      }

      if (
        message.includes('rejected contract') ||
        message.includes('validation') ||
        message.includes('endorsement policy')
      ) {
        return new ServiceError(
          ErrorCode.FABRIC_REJECTED_STATE_ERROR,
          'Fabric transaction was rejected',
          false,
          error,
        );
      }

      if (message.includes('approval is required')) {
        return new ServiceError(
          ErrorCode.CONTRACT_APPROVALS_MISSING,
          'Contract approval is required before confirmation',
          false,
          error,
        );
      }

      if (
        message.includes('precondition') ||
        message.includes('invalid argument') ||
        message.includes('required')
      ) {
        return new ServiceError(
          ErrorCode.FABRIC_PRECONDITION_ERROR,
          'Fabric transaction precondition failed',
          false,
          error,
        );
      }

      return new ServiceError(
        ErrorCode.UNKNOWN_ERROR,
        'Unknown Fabric error',
        false,
        error,
      );
    }

    return new ServiceError(
      ErrorCode.UNKNOWN_ERROR,
      'Unknown Fabric error',
      false,
      error,
    );
  }
}
