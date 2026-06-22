import { Inject, Injectable } from '@nestjs/common';
import { AccountNotVerifiedError } from '../../domain/errors/account-not-verified.error';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { EMAIL_OTP_DELIVERY_PORT } from '../ports/email-otp-delivery.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { OtpResponsePolicyService } from '../../infrastructure/security/otp-response-policy.service';
import type { EmailOtpDeliveryPort } from '../ports/email-otp-delivery.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { GenerateOtpCodeUseCase } from './generate-otp-code.use-case';

export type RequestEmailChangeOtpInput = {
  userId: string;
  newEmail: string;
};

export type RequestEmailChangeOtpResult = {
  sent: boolean;
  userId: string;
  currentEmail: string;
  newEmail: string;
  otpPlainCode?: string;
  expiresAt?: Date;
};

@Injectable()
export class RequestEmailChangeOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly generateOtpCodeUseCase: GenerateOtpCodeUseCase,
    @Inject(EMAIL_OTP_DELIVERY_PORT)
    private readonly emailOtpDelivery: EmailOtpDeliveryPort,
    private readonly otpResponsePolicy: OtpResponsePolicyService,
  ) {}

  async execute(
    input: RequestEmailChangeOtpInput,
  ): Promise<RequestEmailChangeOtpResult> {
    const newEmail = input.newEmail.trim();
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      return {
        sent: false,
        userId: input.userId,
        currentEmail: '',
        newEmail,
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AccountNotVerifiedError();
    }

    if ((user.email ?? '') === newEmail) {
      return {
        sent: false,
        userId: user.id,
        currentEmail: user.email ?? '',
        newEmail,
      };
    }

    const existingUser = await this.userRepository.findByEmail(newEmail);

    if (existingUser && existingUser.id !== user.id) {
      throw new EmailAlreadyExistsError();
    }

    const otpResult = await this.generateOtpCodeUseCase.execute({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: newEmail,
      purpose: OtpPurpose.EMAIL_CHANGE,
    });

    await this.emailOtpDelivery.sendEmailOtp({
      email: newEmail,
      otpPlainCode: otpResult.plainCode,
      purpose: otpResult.otpCode.purpose,
      expiresAt: otpResult.otpCode.expiresAt,
    });

    return {
      sent: true,
      userId: user.id,
      currentEmail: user.email ?? '',
      newEmail,
      otpPlainCode: this.otpResponsePolicy.shouldReturnOtpPlainCode()
        ? otpResult.plainCode
        : undefined,
      expiresAt: otpResult.otpCode.expiresAt,
    };
  }
}
