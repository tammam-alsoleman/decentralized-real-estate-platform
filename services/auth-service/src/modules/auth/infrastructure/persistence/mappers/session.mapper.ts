import type { Session as PrismaSession } from '@prisma/client';
import { SessionEntity } from '../../../domain/entities/session.entity';

export class SessionMapper {
  static toDomain(prismaSession: PrismaSession): SessionEntity {
    return new SessionEntity({
      id: prismaSession.id,
      userId: prismaSession.userId,
      jti: prismaSession.jti,
      refreshTokenHash: prismaSession.refreshTokenHash,
      userAgent: prismaSession.userAgent,
      ipAddress: prismaSession.ipAddress,
      revokedAt: prismaSession.revokedAt,
      expiresAt: prismaSession.expiresAt,
      createdAt: prismaSession.createdAt,
    });
  }
}
