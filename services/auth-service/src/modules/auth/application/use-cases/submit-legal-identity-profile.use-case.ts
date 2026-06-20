import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { LegalIdentityProfileEntity } from '../../domain/entities/legal-identity-profile.entity';
import { LegalIdentityStatus } from '../../domain/enums/legal-identity-status.enum';
import { LEGAL_IDENTITY_REPOSITORY } from '../ports/legal-identity.repository.port';
import type { LegalIdentityRepositoryPort } from '../ports/legal-identity.repository.port';

export type SubmitLegalIdentityProfileInput = {
  userId: string;
  legalFullName: string;
  nationalIdHash: string;
  nationalIdEncrypted?: string | null;
  legalAddress?: string | null;
  dateOfBirth?: Date | null;
};

@Injectable()
export class SubmitLegalIdentityProfileUseCase {
  constructor(
    @Inject(LEGAL_IDENTITY_REPOSITORY)
    private readonly legalIdentityRepository: LegalIdentityRepositoryPort,
  ) {}

  async execute(
    input: SubmitLegalIdentityProfileInput,
  ): Promise<LegalIdentityProfileEntity> {
    const now = new Date();
    const existingProfile = await this.legalIdentityRepository.findByUserId(
      input.userId,
    );

    if (existingProfile) {
      const profile = new LegalIdentityProfileEntity({
        id: existingProfile.id,
        userId: existingProfile.userId,
        legalFullName: input.legalFullName,
        nationalIdHash: input.nationalIdHash,
        nationalIdEncrypted: input.nationalIdEncrypted ?? input.nationalIdHash,
        legalAddress: input.legalAddress ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        status: LegalIdentityStatus.SUBMITTED,
        createdAt: existingProfile.createdAt,
        updatedAt: now,
      });

      return this.legalIdentityRepository.save(profile);
    }

    const profile = new LegalIdentityProfileEntity({
      id: randomUUID(),
      userId: input.userId,
      legalFullName: input.legalFullName,
      nationalIdHash: input.nationalIdHash,
      nationalIdEncrypted: input.nationalIdEncrypted ?? input.nationalIdHash,
      legalAddress: input.legalAddress ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      status: LegalIdentityStatus.SUBMITTED,
      createdAt: now,
      updatedAt: now,
    });

    return this.legalIdentityRepository.save(profile);
  }
}
