import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { ActivateUserUseCase } from './activate-user.use-case';
import { VerifyOtpCodeUseCase } from './verify-otp-code.use-case';

export type CompletePhoneVerificationInput = {
  userId: string;
  phoneNumber: string;
  plainCode: string;
};

export type CompletePhoneVerificationResult = {
  verified: boolean;
  user: UserEntity | null;
};

@Injectable()
export class CompletePhoneVerificationUseCase {
  constructor(
    private readonly verifyOtpCodeUseCase: VerifyOtpCodeUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
  ) {}

  async execute(
    input: CompletePhoneVerificationInput,
  ): Promise<CompletePhoneVerificationResult> {
    const verificationResult = await this.verifyOtpCodeUseCase.execute({
      phoneNumber: input.phoneNumber,
      purpose: OtpPurpose.PHONE_VERIFICATION,
      plainCode: input.plainCode,
    });

    if (!verificationResult.verified) {
      return { verified: false, user: null };
    }

    const user = await this.activateUserUseCase.execute(input.userId);

    return { verified: true, user };
  }
}
