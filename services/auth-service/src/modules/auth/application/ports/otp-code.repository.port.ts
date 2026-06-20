import { OtpCodeEntity } from '../../domain/entities/otp-code.entity';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';

export const OTP_CODE_REPOSITORY = Symbol('OTP_CODE_REPOSITORY');

export interface OtpCodeRepositoryPort {
  findLatestValidCode(
    phoneNumber: string,
    purpose: OtpPurpose,
    now?: Date,
  ): Promise<OtpCodeEntity | null>;
  findLatestValidCodeByEmail(
    email: string,
    purpose: OtpPurpose,
    now?: Date,
  ): Promise<OtpCodeEntity | null>;
  save(otpCode: OtpCodeEntity): Promise<OtpCodeEntity>;
  incrementAttempts(id: string): Promise<void>;
  markConsumed(id: string, consumedAt?: Date): Promise<void>;
}
