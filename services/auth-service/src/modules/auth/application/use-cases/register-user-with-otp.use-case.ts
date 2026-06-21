import { Inject, Injectable } from '@nestjs/common';
import { OtpCodeEntity } from '../../domain/entities/otp-code.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { EmailVerificationOtpResendLimitExceededError } from '../../domain/errors/email-verification-otp-resend-limit-exceeded.error';
import { EMAIL_OTP_DELIVERY_PORT } from '../ports/email-otp-delivery.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { EmailOtpDeliveryPort } from '../ports/email-otp-delivery.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { OtpResponsePolicyService } from '../../infrastructure/security/otp-response-policy.service';
import {
  CreateUserInput,
  CreateUserUseCase,
} from './create-user.use-case';
import { GenerateOtpCodeUseCase } from './generate-otp-code.use-case';

const EMAIL_VERIFICATION = 'EMAIL_VERIFICATION' as OtpPurpose;

export type RegisterUserWithOtpInput = CreateUserInput & {
  email: string;
  phoneNumber: string;
};

export type RegisterUserWithOtpResult = {
  user: UserEntity;
  otpCode: OtpCodeEntity;
  plainCode?: string;
};

@Injectable()
export class RegisterUserWithOtpUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly generateOtpCodeUseCase: GenerateOtpCodeUseCase,
    @Inject(EMAIL_OTP_DELIVERY_PORT)
    private readonly emailOtpDelivery: EmailOtpDeliveryPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly otpResponsePolicy: OtpResponsePolicyService,
  ) {}

  async execute(
    input: RegisterUserWithOtpInput,
  ): Promise<RegisterUserWithOtpResult> {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser?.status === UserStatus.ACTIVE) {
      throw new EmailAlreadyExistsError();
    }

    if (existingUser?.status === UserStatus.PENDING_VERIFICATION) {
      return this.resumePendingRegistration(existingUser, input.email);
    }

    const user = await this.createUserUseCase.execute({
      ...input,
      email: input.email,
      phoneNumber: input.phoneNumber,
    });
    const otpResult = await this.generateOtpCodeUseCase.execute({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      purpose: EMAIL_VERIFICATION,
    });

    if (input.email && otpResult.plainCode) {
      await this.emailOtpDelivery.sendEmailOtp({
        email: input.email,
        otpPlainCode: otpResult.plainCode,
        purpose: otpResult.otpCode.purpose,
        expiresAt: otpResult.otpCode.expiresAt,
      });
    }

    return {
      user,
      otpCode: otpResult.otpCode,
      plainCode: this.otpResponsePolicy.shouldReturnOtpPlainCode()
        ? otpResult.plainCode
        : undefined,
    };
  }

  private async resumePendingRegistration(
    user: UserEntity,
    email: string,
  ): Promise<RegisterUserWithOtpResult> {
    if (!user.canResendEmailVerificationOtp()) {
      throw new EmailVerificationOtpResendLimitExceededError();
    }

    const otpResult = await this.generateOtpCodeUseCase.execute({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email ?? email,
      purpose: EMAIL_VERIFICATION,
    });

    await this.emailOtpDelivery.sendEmailOtp({
      email: user.email ?? email,
      otpPlainCode: otpResult.plainCode,
      purpose: otpResult.otpCode.purpose,
      expiresAt: otpResult.otpCode.expiresAt,
    });

    user.incrementEmailVerificationResendCount();
    const savedUser = await this.userRepository.save(user);

    return {
      user: savedUser,
      otpCode: otpResult.otpCode,
      plainCode: this.otpResponsePolicy.shouldReturnOtpPlainCode()
        ? otpResult.plainCode
        : undefined,
    };
  }
}
