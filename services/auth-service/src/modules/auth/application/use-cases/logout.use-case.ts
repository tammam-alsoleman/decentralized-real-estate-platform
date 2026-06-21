import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY } from '../ports/session.repository.port';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import type { SessionRepositoryPort } from '../ports/session.repository.port';

export type LogoutInput = {
  refreshToken: string;
};

export type LogoutResult = {
  loggedOut: boolean;
};

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(input: LogoutInput): Promise<LogoutResult> {
    const refreshTokenHash = this.authTokenService.hashRefreshToken(
      input.refreshToken,
    );
    const session =
      await this.sessionRepository.findByRefreshTokenHash(refreshTokenHash);

    if (session) {
      await this.sessionRepository.revokeById(session.id);
    }

    return { loggedOut: true };
  }
}
