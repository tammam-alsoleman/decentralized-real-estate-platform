import { Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../../application/ports/session.repository.port';
import { SessionEntity } from '../../../domain/entities/session.entity';
import { SessionMapper } from '../mappers/session.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByJti(jti: string): Promise<SessionEntity | null> {
    const record = await this.prisma.session.findUnique({ where: { jti } });

    if (!record) {
      return null;
    }

    return SessionMapper.toDomain(record);
  }

  async findById(id: string): Promise<SessionEntity | null> {
    const record = await this.prisma.session.findUnique({ where: { id } });

    if (!record) {
      return null;
    }

    return SessionMapper.toDomain(record);
  }

  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<SessionEntity | null> {
    const record = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
    });

    if (!record) {
      return null;
    }

    return SessionMapper.toDomain(record);
  }

  async create(session: SessionEntity): Promise<SessionEntity> {
    const savedSession = await this.prisma.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        jti: session.jti,
        refreshTokenHash: session.refreshTokenHash,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        revokedAt: session.revokedAt,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });

    return SessionMapper.toDomain(savedSession);
  }

  async save(session: SessionEntity): Promise<SessionEntity> {
    const savedSession = await this.prisma.session.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        userId: session.userId,
        jti: session.jti,
        refreshTokenHash: session.refreshTokenHash,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        revokedAt: session.revokedAt,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      update: {
        refreshTokenHash: session.refreshTokenHash,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        revokedAt: session.revokedAt,
        expiresAt: session.expiresAt,
        updatedAt: session.updatedAt,
      },
    });

    return SessionMapper.toDomain(savedSession);
  }

  async revokeById(id: string, revokedAt = new Date()): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt },
    });
  }

  async revokeByJti(jti: string, revokedAt = new Date()): Promise<void> {
    await this.prisma.session.update({
      where: { jti },
      data: { revokedAt },
    });
  }

  async revokeAllForUser(userId: string, revokedAt = new Date()): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async updateRefreshTokenHash(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<SessionEntity> {
    const savedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash,
        expiresAt,
      },
    });

    return SessionMapper.toDomain(savedSession);
  }
}
