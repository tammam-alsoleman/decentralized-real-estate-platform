import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SessionEntity } from '../../domain/entities/session.entity';
import { AccountNotVerifiedError } from '../../domain/errors/account-not-verified.error';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { SESSION_REPOSITORY } from '../ports/session.repository.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import type { SessionRepositoryPort } from '../ports/session.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { VerifyOtpCodeUseCase } from './verify-otp-code.use-case';

export type CompleteEmailChangeOtpInput = {
  userId: string;
  newEmail: string;
  otpPlainCode: string;
};

export type CompleteEmailChangeOtpResult = {
  changed: boolean;
  userId: string;
  email: string;
  status: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
};

@Injectable()
export class CompleteEmailChangeOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly verifyOtpCodeUseCase: VerifyOtpCodeUseCase,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(
    input: CompleteEmailChangeOtpInput,
  ): Promise<CompleteEmailChangeOtpResult> {
    const newEmail = input.newEmail.trim();
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      return {
        changed: false,
        userId: input.userId,
        email: '',
        status: '',
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AccountNotVerifiedError();
    }

    const existingUser = await this.userRepository.findByEmail(newEmail);

    if (existingUser && existingUser.id !== user.id) {
      throw new EmailAlreadyExistsError();
    }

    const verificationResult = await this.verifyOtpCodeUseCase.execute({
      phoneNumber: user.phoneNumber,
      email: newEmail,
      purpose: OtpPurpose.EMAIL_CHANGE,
      plainCode: input.otpPlainCode,
    });

    if (!verificationResult.verified) {
      return {
        changed: false,
        userId: user.id,
        email: user.email ?? '',
        status: user.status,
      };
    }

    user.email = newEmail;
    user.markEmailVerified();
    const savedUser = await this.userRepository.save(user);

    await this.sessionRepository.revokeAllForUser(savedUser.id);

    const sessionId = randomUUID();
    const tokenPair = this.authTokenService.generateTokenPair(
      savedUser,
      sessionId,
    );
    const now = new Date();
    const session = new SessionEntity({
      id: sessionId,
      userId: savedUser.id,
      jti: randomUUID(),
      refreshTokenHash: tokenPair.refreshTokenHash,
      expiresAt: tokenPair.refreshTokenExpiresAt,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.sessionRepository.create(session);

    return {
      changed: true,
      userId: savedUser.id,
      email: savedUser.email ?? '',
      status: savedUser.status,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
    };
  }
}
