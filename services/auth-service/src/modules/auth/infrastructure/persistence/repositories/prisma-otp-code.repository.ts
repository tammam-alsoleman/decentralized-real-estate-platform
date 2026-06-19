import { Injectable } from '@nestjs/common';
import { OtpCodeRepositoryPort } from '../../../application/ports/otp-code.repository.port';
import { OtpCodeEntity } from '../../../domain/entities/otp-code.entity';
import { OtpPurpose } from '../../../domain/enums/otp-purpose.enum';
import { OtpCodeMapper } from '../mappers/otp-code.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaOtpCodeRepository implements OtpCodeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findLatestValidCode(
    phoneNumber: string,
    purpose: OtpPurpose,
    now = new Date(),
  ): Promise<OtpCodeEntity | null> {
    const record = await this.prisma.otpCode.findFirst({
      where: {
        phoneNumber,
        purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return null;
    }

    return OtpCodeMapper.toDomain(record);
  }

  async save(otpCode: OtpCodeEntity): Promise<OtpCodeEntity> {
    const savedOtpCode = await this.prisma.otpCode.upsert({
      where: { id: otpCode.id },
      create: {
        id: otpCode.id,
        userId: otpCode.userId,
        phoneNumber: otpCode.phoneNumber,
        codeHash: otpCode.codeHash,
        purpose: otpCode.purpose,
        expiresAt: otpCode.expiresAt,
        consumedAt: otpCode.consumedAt,
        attempts: otpCode.attempts,
        createdAt: otpCode.createdAt,
      },
      update: {
        codeHash: otpCode.codeHash,
        purpose: otpCode.purpose,
        expiresAt: otpCode.expiresAt,
        consumedAt: otpCode.consumedAt,
        attempts: otpCode.attempts,
      },
    });

    return OtpCodeMapper.toDomain(savedOtpCode);
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async markConsumed(id: string, consumedAt = new Date()): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id },
      data: { consumedAt },
    });
  }
}
