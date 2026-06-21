import { Inject, Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { ActivateUserUseCase } from './activate-user.use-case';
import { VerifyOtpCodeUseCase } from './verify-otp-code.use-case';

export type CompleteAccountVerificationInput = {
  userId: string;
  phoneNumber: string;
  email?: string | null;
  plainCode: string;
};

export type CompleteAccountVerificationResult = {
  verified: boolean;
  user: UserEntity | null;
};

@Injectable()
export class CompleteAccountVerificationUseCase {
  constructor(
    private readonly verifyOtpCodeUseCase: VerifyOtpCodeUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(
    input: CompleteAccountVerificationInput,
  ): Promise<CompleteAccountVerificationResult> {
    const purpose = input.email
      ? ('EMAIL_VERIFICATION' as OtpPurpose)
      : OtpPurpose.PHONE_VERIFICATION;
    const verificationResult = await this.verifyOtpCodeUseCase.execute({
      phoneNumber: input.phoneNumber,
      email: input.email ?? null,
      purpose,
      plainCode: input.plainCode,
    });

    if (!verificationResult.verified) {
      return { verified: false, user: null };
    }

    if (purpose === ('EMAIL_VERIFICATION' as OtpPurpose)) {
      const user = await this.userRepository.findById(input.userId);

      if (!user) {
        return { verified: true, user: null };
      }

      user.markEmailVerified();
      user.activate();

      return {
        verified: true,
        user: await this.userRepository.save(user),
      };
    }

    const user = await this.activateUserUseCase.execute(input.userId);

    return { verified: true, user };
  }
}
