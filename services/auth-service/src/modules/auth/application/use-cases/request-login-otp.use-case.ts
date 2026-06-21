import { Inject, Injectable } from '@nestjs/common';
import { AccountNotVerifiedError } from '../../domain/errors/account-not-verified.error';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { EMAIL_OTP_DELIVERY_PORT } from '../ports/email-otp-delivery.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { EmailOtpDeliveryPort } from '../ports/email-otp-delivery.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { GenerateOtpCodeUseCase } from './generate-otp-code.use-case';

export type RequestLoginOtpInput = {
  email: string;
};

export type RequestLoginOtpResult = {
  sent: boolean;
  userId: string;
  email: string;
  otpPlainCode?: string;
  expiresAt?: Date;
};

@Injectable()
export class RequestLoginOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly generateOtpCodeUseCase: GenerateOtpCodeUseCase,
    @Inject(EMAIL_OTP_DELIVERY_PORT)
    private readonly emailOtpDelivery: EmailOtpDeliveryPort,
  ) {}

  async execute(input: RequestLoginOtpInput): Promise<RequestLoginOtpResult> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      return {
        sent: false,
        userId: '',
        email: input.email,
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AccountNotVerifiedError();
    }

    const otpResult = await this.generateOtpCodeUseCase.execute({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email ?? input.email,
      purpose: OtpPurpose.LOGIN,
    });

    await this.emailOtpDelivery.sendEmailOtp({
      email: user.email ?? input.email,
      otpPlainCode: otpResult.plainCode,
      purpose: otpResult.otpCode.purpose,
      expiresAt: otpResult.otpCode.expiresAt,
    });

    return {
      sent: true,
      userId: user.id,
      email: user.email ?? input.email,
      otpPlainCode: otpResult.plainCode,
      expiresAt: otpResult.otpCode.expiresAt,
    };
  }
}
