import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SessionEntity } from '../../domain/entities/session.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { SESSION_REPOSITORY } from '../ports/session.repository.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import type { SessionRepositoryPort } from '../ports/session.repository.port';
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
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
};

@Injectable()
export class CompleteAccountVerificationUseCase {
  constructor(
    private readonly verifyOtpCodeUseCase: VerifyOtpCodeUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly authTokenService: AuthTokenService,
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

      return this.createVerifiedSessionResult(
        await this.userRepository.save(user),
      );
    }

    const user = await this.activateUserUseCase.execute(input.userId);

    if (!user) {
      return { verified: true, user: null };
    }

    return this.createVerifiedSessionResult(user);
  }

  private async createVerifiedSessionResult(
    user: UserEntity,
  ): Promise<CompleteAccountVerificationResult> {
    const sessionId = randomUUID();
    const tokenPair = this.authTokenService.generateTokenPair(user, sessionId);
    const now = new Date();
    const session = new SessionEntity({
      id: sessionId,
      userId: user.id,
      jti: randomUUID(),
      refreshTokenHash: tokenPair.refreshTokenHash,
      expiresAt: tokenPair.refreshTokenExpiresAt,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.sessionRepository.create(session);

    return {
      verified: true,
      user,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
    };
  }
}
