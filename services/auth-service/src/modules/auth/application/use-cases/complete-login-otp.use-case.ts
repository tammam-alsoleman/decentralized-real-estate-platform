import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SessionEntity } from '../../domain/entities/session.entity';
import { AccountNotVerifiedError } from '../../domain/errors/account-not-verified.error';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { LEGAL_IDENTITY_REPOSITORY } from '../ports/legal-identity.repository.port';
import { SESSION_REPOSITORY } from '../ports/session.repository.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import type { LegalIdentityRepositoryPort } from '../ports/legal-identity.repository.port';
import type { SessionRepositoryPort } from '../ports/session.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { VerifyOtpCodeUseCase } from './verify-otp-code.use-case';

export type CompleteLoginOtpInput = {
  email: string;
  otpPlainCode: string;
};

export type CompleteLoginOtpResult = {
  authenticated: boolean;
  userId: string;
  email: string;
  status: string;
  requiresLegalIdentity: boolean;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
};

@Injectable()
export class CompleteLoginOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly verifyOtpCodeUseCase: VerifyOtpCodeUseCase,
    @Inject(LEGAL_IDENTITY_REPOSITORY)
    private readonly legalIdentityRepository: LegalIdentityRepositoryPort,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(input: CompleteLoginOtpInput): Promise<CompleteLoginOtpResult> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      return {
        authenticated: false,
        userId: '',
        email: input.email,
        status: '',
        requiresLegalIdentity: true,
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AccountNotVerifiedError();
    }

    const verificationResult = await this.verifyOtpCodeUseCase.execute({
      phoneNumber: user.phoneNumber,
      email: user.email ?? input.email,
      purpose: OtpPurpose.LOGIN,
      plainCode: input.otpPlainCode,
    });

    if (!verificationResult.verified) {
      return {
        authenticated: false,
        userId: user.id,
        email: user.email ?? input.email,
        status: user.status,
        requiresLegalIdentity: true,
      };
    }

    const legalIdentityProfile =
      await this.legalIdentityRepository.findByUserId(user.id);
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
      authenticated: true,
      userId: user.id,
      email: user.email ?? input.email,
      status: user.status,
      requiresLegalIdentity: !legalIdentityProfile,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
    };
  }
}
