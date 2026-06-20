import type { LegalIdentityProfile as PrismaLegalIdentityProfile } from '@prisma/client';
import { LegalIdentityProfileEntity } from '../../../domain/entities/legal-identity-profile.entity';
import { LegalIdentityStatus } from '../../../domain/enums/legal-identity-status.enum';

export class LegalIdentityProfileMapper {
  static toDomain(
    prismaProfile: PrismaLegalIdentityProfile,
  ): LegalIdentityProfileEntity {
    return new LegalIdentityProfileEntity({
      id: prismaProfile.id,
      userId: prismaProfile.userId,
      legalFullName: prismaProfile.legalFullName,
      nationalIdHash: prismaProfile.nationalIdHash,
      nationalIdEncrypted: prismaProfile.nationalIdEncrypted,
      legalAddress: prismaProfile.legalAddress,
      dateOfBirth: prismaProfile.dateOfBirth,
      status: prismaProfile.status as LegalIdentityStatus,
      createdAt: prismaProfile.createdAt,
      updatedAt: prismaProfile.updatedAt,
    });
  }
}
