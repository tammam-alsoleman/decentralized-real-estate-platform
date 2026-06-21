import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
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
