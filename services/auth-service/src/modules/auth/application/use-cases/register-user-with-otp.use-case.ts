import { Inject, Injectable } from '@nestjs/common';
import { OtpCodeEntity } from '../../domain/entities/otp-code.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { EMAIL_OTP_DELIVERY_PORT } from '../ports/email-otp-delivery.port';
import type { EmailOtpDeliveryPort } from '../ports/email-otp-delivery.port';
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
  plainCode: string;
};

@Injectable()
export class RegisterUserWithOtpUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly generateOtpCodeUseCase: GenerateOtpCodeUseCase,
    @Inject(EMAIL_OTP_DELIVERY_PORT)
    private readonly emailOtpDelivery: EmailOtpDeliveryPort,
  ) {}

  async execute(
    input: RegisterUserWithOtpInput,
  ): Promise<RegisterUserWithOtpResult> {
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
      plainCode: otpResult.plainCode,
    };
  }
}
