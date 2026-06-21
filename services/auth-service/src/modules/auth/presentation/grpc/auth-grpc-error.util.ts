import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { AccountAlreadyVerifiedError } from '../../domain/errors/account-already-verified.error';
import { AccountNotVerifiedError } from '../../domain/errors/account-not-verified.error';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { EmailVerificationOtpResendLimitExceededError } from '../../domain/errors/email-verification-otp-resend-limit-exceeded.error';
import { InvalidAccessTokenError } from '../../domain/errors/invalid-access-token.error';
import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error';
import { PhoneNumberAlreadyExistsError } from '../../domain/errors/phone-number-already-exists.error';

export function throwGrpcError(error: unknown): never {
  if (
    error instanceof PhoneNumberAlreadyExistsError ||
    error instanceof EmailAlreadyExistsError
  ) {
    throw new RpcException({
      code: status.ALREADY_EXISTS,
      message: error.message,
    });
  }

  if (error instanceof EmailVerificationOtpResendLimitExceededError) {
    throw new RpcException({
      code: status.RESOURCE_EXHAUSTED ?? status.FAILED_PRECONDITION,
      message: error.message,
    });
  }

  if (
    error instanceof AccountAlreadyVerifiedError ||
    error instanceof AccountNotVerifiedError
  ) {
    throw new RpcException({
      code: status.FAILED_PRECONDITION,
      message: error.message,
    });
  }

  if (
    error instanceof InvalidRefreshTokenError ||
    error instanceof InvalidAccessTokenError
  ) {
    throw new RpcException({
      code: status.UNAUTHENTICATED,
      message: error.message,
    });
  }

  if (
    error instanceof Error &&
    (error.message.includes('missing required input') ||
      error.message.includes('required'))
  ) {
    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: error.message,
    });
  }

  throw new RpcException({
    code: status.INTERNAL,
    message: 'Internal authentication service error',
  });
}
