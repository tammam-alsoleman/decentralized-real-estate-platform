import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { OTP_CODE_REPOSITORY } from '../ports/otp-code.repository.port';
import type { OtpCodeRepositoryPort } from '../ports/otp-code.repository.port';

export type VerifyOtpCodeInput = {
  phoneNumber: string;
  email?: string | null;
  purpose: OtpPurpose;
  plainCode: string;
};

export type VerifyOtpCodeResult = {
  verified: boolean;
};

@Injectable()
export class VerifyOtpCodeUseCase {
  constructor(
    @Inject(OTP_CODE_REPOSITORY)
    private readonly otpCodeRepository: OtpCodeRepositoryPort,
  ) {}

  async execute(input: VerifyOtpCodeInput): Promise<VerifyOtpCodeResult> {
    const now = new Date();
    const isEmailVerification =
      input.purpose === ('EMAIL_VERIFICATION' as OtpPurpose);
    const otpCode =
      isEmailVerification && input.email
        ? await this.otpCodeRepository.findLatestValidCodeByEmail(
            input.email,
            input.purpose,
            now,
          )
        : await this.otpCodeRepository.findLatestValidCode(
            input.phoneNumber,
            input.purpose,
            now,
          );

    if (!otpCode) {
      return { verified: false };
    }

    const codeHash = createHash('sha256')
      .update(input.plainCode)
      .digest('hex');

    if (codeHash !== otpCode.codeHash) {
      await this.otpCodeRepository.incrementAttempts(otpCode.id);

      return { verified: false };
    }

    await this.otpCodeRepository.markConsumed(otpCode.id, now);

    return { verified: true };
  }
}
