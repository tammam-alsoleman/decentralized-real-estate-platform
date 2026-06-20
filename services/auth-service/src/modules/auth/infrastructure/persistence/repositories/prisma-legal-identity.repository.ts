import { Injectable } from '@nestjs/common';
import { LegalIdentityRepositoryPort } from '../../../application/ports/legal-identity.repository.port';
import { LegalIdentityProfileEntity } from '../../../domain/entities/legal-identity-profile.entity';
import { LegalIdentityProfileMapper } from '../mappers/legal-identity-profile.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaLegalIdentityRepository
  implements LegalIdentityRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(
    userId: string,
  ): Promise<LegalIdentityProfileEntity | null> {
    const record = await this.prisma.legalIdentityProfile.findUnique({
      where: { userId },
    });

    if (!record) {
      return null;
    }

    return LegalIdentityProfileMapper.toDomain(record);
  }

  async findByNationalIdHash(
    nationalIdHash: string,
  ): Promise<LegalIdentityProfileEntity | null> {
    const record = await this.prisma.legalIdentityProfile.findFirst({
      where: { nationalIdHash },
    });

    if (!record) {
      return null;
    }

    return LegalIdentityProfileMapper.toDomain(record);
  }

  async save(
    profile: LegalIdentityProfileEntity,
  ): Promise<LegalIdentityProfileEntity> {
    const savedProfile = await this.prisma.legalIdentityProfile.upsert({
      where: { userId: profile.userId },
      create: {
        id: profile.id,
        userId: profile.userId,
        legalFullName: profile.legalFullName,
        nationalIdHash: profile.nationalIdHash,
        nationalIdEncrypted: profile.nationalIdEncrypted,
        legalAddress: profile.legalAddress,
        dateOfBirth: profile.dateOfBirth,
        status: profile.status,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      update: {
        legalFullName: profile.legalFullName,
        nationalIdHash: profile.nationalIdHash,
        nationalIdEncrypted: profile.nationalIdEncrypted,
        legalAddress: profile.legalAddress,
        dateOfBirth: profile.dateOfBirth,
        status: profile.status,
        updatedAt: profile.updatedAt,
      },
    });

    return LegalIdentityProfileMapper.toDomain(savedProfile);
  }
}
