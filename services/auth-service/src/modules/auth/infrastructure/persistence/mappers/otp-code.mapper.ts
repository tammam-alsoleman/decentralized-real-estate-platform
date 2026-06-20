import type { OtpCode as PrismaOtpCode } from '@prisma/client';
import { OtpCodeEntity } from '../../../domain/entities/otp-code.entity';
import { OtpPurpose } from '../../../domain/enums/otp-purpose.enum';

export class OtpCodeMapper {
  static toDomain(prismaOtpCode: PrismaOtpCode): OtpCodeEntity {
    return new OtpCodeEntity({
      id: prismaOtpCode.id,
      userId: prismaOtpCode.userId,
      phoneNumber: prismaOtpCode.phoneNumber,
      email: prismaOtpCode.email,
      codeHash: prismaOtpCode.codeHash,
      purpose: prismaOtpCode.purpose as OtpPurpose,
      expiresAt: prismaOtpCode.expiresAt,
      consumedAt: prismaOtpCode.consumedAt,
      attempts: prismaOtpCode.attempts,
      createdAt: prismaOtpCode.createdAt,
    });
  }
}
