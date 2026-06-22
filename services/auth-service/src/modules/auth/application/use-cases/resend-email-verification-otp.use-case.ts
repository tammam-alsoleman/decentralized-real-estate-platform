import { Inject, Injectable } from '@nestjs/common';
import { AccountAlreadyVerifiedError } from '../../domain/errors/account-already-verified.error';
import { EmailVerificationOtpResendLimitExceededError } from '../../domain/errors/email-verification-otp-resend-limit-exceeded.error';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { EMAIL_OTP_DELIVERY_PORT } from '../ports/email-otp-delivery.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { EmailOtpDeliveryPort } from '../ports/email-otp-delivery.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { OtpResponsePolicyService } from '../../infrastructure/security/otp-response-policy.service';
import { GenerateOtpCodeUseCase } from './generate-otp-code.use-case';

const EMAIL_VERIFICATION = 'EMAIL_VERIFICATION' as OtpPurpose;

export type ResendEmailVerificationOtpInput = {
  email: string;
};

export type ResendEmailVerificationOtpResult = {
  sent: boolean;
  userId: string;
  email: string;
  otpPlainCode?: string;
  expiresAt?: Date;
};

@Injectable()
export class ResendEmailVerificationOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly generateOtpCodeUseCase: GenerateOtpCodeUseCase,
    @Inject(EMAIL_OTP_DELIVERY_PORT)
    private readonly emailOtpDelivery: EmailOtpDeliveryPort,
    private readonly otpResponsePolicy: OtpResponsePolicyService,
  ) {}

  async execute(
    input: ResendEmailVerificationOtpInput,
  ): Promise<ResendEmailVerificationOtpResult> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      return {
        sent: false,
        userId: '',
        email: input.email,
      };
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new AccountAlreadyVerifiedError();
    }

    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      return {
        sent: false,
        userId: user.id,
        email: user.email ?? input.email,
      };
    }

    if (!user.canResendEmailVerificationOtp()) {
      throw new EmailVerificationOtpResendLimitExceededError();
    }

    const otpResult = await this.generateOtpCodeUseCase.execute({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email ?? input.email,
      purpose: EMAIL_VERIFICATION,
    });

    await this.emailOtpDelivery.sendEmailOtp({
      email: user.email ?? input.email,
      otpPlainCode: otpResult.plainCode,
      purpose: otpResult.otpCode.purpose,
      expiresAt: otpResult.otpCode.expiresAt,
    });

    user.incrementEmailVerificationResendCount();
    await this.userRepository.save(user);

    return {
      sent: true,
      userId: user.id,
      email: user.email ?? input.email,
      otpPlainCode: this.otpResponsePolicy.shouldReturnOtpPlainCode()
        ? otpResult.plainCode
        : undefined,
      expiresAt: otpResult.otpCode.expiresAt,
    };
  }
}
