import { SessionEntity } from '../../domain/entities/session.entity';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface SessionRepositoryPort {
  findByJti(jti: string): Promise<SessionEntity | null>;
  findById(id: string): Promise<SessionEntity | null>;
  findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionEntity | null>;
  create(session: SessionEntity): Promise<SessionEntity>;
  save(session: SessionEntity): Promise<SessionEntity>;
  revokeById(id: string, revokedAt?: Date): Promise<void>;
  revokeByJti(jti: string, revokedAt?: Date): Promise<void>;
  revokeAllForUser(userId: string, revokedAt?: Date): Promise<void>;
  updateRefreshTokenHash(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<SessionEntity>;
}
