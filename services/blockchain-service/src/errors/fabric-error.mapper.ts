import { ErrorCode } from './error-codes';
import { ServiceError } from './service-error';

export class FabricErrorMapper {
  static toServiceError(error: unknown): ServiceError {
    if (error instanceof ServiceError) {
      return error;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('msp') || message.includes('authorization')) {
        return new ServiceError(
          ErrorCode.FABRIC_AUTHORIZATION_ERROR,
          error.message,
          false,
          error,
        );
      }

      if (message.includes('already exists') || message.includes('different payload')) {
        return new ServiceError(
          ErrorCode.FABRIC_CONFLICT_ERROR,
          error.message,
          false,
          error,
        );
      }

      if (message.includes('not found')) {
        return new ServiceError(
          ErrorCode.FABRIC_NOT_FOUND,
          error.message,
          false,
          error,
        );
      }

      if (message.includes('timeout') || message.includes('unavailable')) {
        return new ServiceError(
          ErrorCode.FABRIC_TRANSIENT_ERROR,
          error.message,
          true,
          error,
        );
      }

      if (message.includes('rejected contract')) {
        return new ServiceError(
          ErrorCode.FABRIC_REJECTED_STATE_ERROR,
          error.message,
          false,
          error,
        );
      }

      if (message.includes('approval is required')) {
        return new ServiceError(
          ErrorCode.CONTRACT_APPROVALS_MISSING,
          error.message,
          false,
          error,
        );
      }

      return new ServiceError(
        ErrorCode.UNKNOWN_ERROR,
        error.message,
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
