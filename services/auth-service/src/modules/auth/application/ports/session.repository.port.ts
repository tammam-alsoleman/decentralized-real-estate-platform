import { SessionEntity } from '../../domain/entities/session.entity';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface SessionRepositoryPort {
  findByJti(jti: string): Promise<SessionEntity | null>;
  findById(id: string): Promise<SessionEntity | null>;
  save(session: SessionEntity): Promise<SessionEntity>;
  revokeByJti(jti: string, revokedAt?: Date): Promise<void>;
}
