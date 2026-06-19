import { Injectable } from '@nestjs/common';
import { OtpCodeEntity } from '../../domain/entities/otp-code.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import {
  CreateUserInput,
  CreateUserUseCase,
} from './create-user.use-case';
import { GenerateOtpCodeUseCase } from './generate-otp-code.use-case';

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

  async execute(input: CreateUserInput): Promise<RegisterUserWithOtpResult> {
    const user = await this.createUserUseCase.execute(input);
    const otpResult = await this.generateOtpCodeUseCase.execute({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      purpose: OtpPurpose.PHONE_VERIFICATION,
    });

    return {
      user,
      otpCode: otpResult.otpCode,
      plainCode: otpResult.plainCode,
    };
  }
}
