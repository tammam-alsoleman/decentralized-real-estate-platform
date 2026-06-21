import { Inject, Injectable } from '@nestjs/common';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { AccountNotVerifiedError } from '../../domain/errors/account-not-verified.error';
import { SESSION_REPOSITORY } from '../ports/session.repository.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import type { SessionRepositoryPort } from '../ports/session.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

export type RefreshAuthSessionInput = {
  refreshToken: string;
};

export type RefreshAuthSessionResult = {
  refreshed: boolean;
  userId: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
};

@Injectable()
export class RefreshAuthSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(
    input: RefreshAuthSessionInput,
  ): Promise<RefreshAuthSessionResult> {
    const refreshTokenHash = this.authTokenService.hashRefreshToken(
      input.refreshToken,
    );
    const session =
      await this.sessionRepository.findByRefreshTokenHash(refreshTokenHash);

    if (!session || session.isRevoked() || session.isExpired()) {
      return { refreshed: false, userId: '', email: '' };
    }

    const user = await this.userRepository.findById(session.userId);

    if (!user) {
      return { refreshed: false, userId: '', email: '' };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AccountNotVerifiedError();
    }

    const newRefreshToken = this.authTokenService.generateRefreshToken();
    const newRefreshTokenHash =
      this.authTokenService.hashRefreshToken(newRefreshToken);
    const refreshTokenExpiresAt =
      this.authTokenService.getRefreshTokenExpiresAt();

    await this.sessionRepository.updateRefreshTokenHash(
      session.id,
      newRefreshTokenHash,
      refreshTokenExpiresAt,
    );

    return {
      refreshed: true,
      userId: user.id,
      email: user.email ?? '',
      accessToken: this.authTokenService.generateAccessToken(user, session.id),
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: this.authTokenService.getAccessTokenExpiresAt(),
      refreshTokenExpiresAt,
    };
  }
}
