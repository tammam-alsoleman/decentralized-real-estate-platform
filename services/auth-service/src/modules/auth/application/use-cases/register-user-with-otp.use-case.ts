import { Injectable } from '@nestjs/common';
import { OtpCodeEntity } from '../../domain/entities/otp-code.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
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

    return {
      user,
      otpCode: otpResult.otpCode,
      plainCode: otpResult.plainCode,
    };
  }
}
