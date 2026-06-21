import { Inject, Injectable } from '@nestjs/common';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { SESSION_REPOSITORY } from '../ports/session.repository.port';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import type { SessionRepositoryPort } from '../ports/session.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

export type ValidateAccessTokenInput = {
  accessToken: string;
};

export type ValidateAccessTokenResult = {
  valid: boolean;
  userId: string;
  email: string;
  role: string;
  status: string;
  sessionId: string;
};

@Injectable()
export class ValidateAccessTokenUseCase {
  constructor(
    private readonly authTokenService: AuthTokenService,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(
    input: ValidateAccessTokenInput,
  ): Promise<ValidateAccessTokenResult> {
    const payload = this.authTokenService.verifyAccessToken(input.accessToken);

    if (!payload) {
      return this.invalidResult();
    }

    const session = await this.sessionRepository.findById(payload.sessionId);

    if (!session || session.isRevoked() || session.isExpired()) {
      return this.invalidResult();
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      return this.invalidResult();
    }

    return {
      valid: true,
      userId: user.id,
      email: user.email ?? '',
      role: user.role,
      status: user.status,
      sessionId: session.id,
    };
  }

  private invalidResult(): ValidateAccessTokenResult {
    return {
      valid: false,
      userId: '',
      email: '',
      role: '',
      status: '',
      sessionId: '',
    };
  }
}
