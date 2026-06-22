import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { LegalIdentityProfileEntity } from '../../domain/entities/legal-identity-profile.entity';
import { LegalIdentityStatus } from '../../domain/enums/legal-identity-status.enum';
import { LegalIdentityAlreadySubmittedError } from '../../domain/errors/legal-identity-already-submitted.error';
import { LEGAL_IDENTITY_CRYPTO } from '../ports/legal-identity-crypto.port';
import { LEGAL_IDENTITY_REPOSITORY } from '../ports/legal-identity.repository.port';
import type { LegalIdentityCryptoPort } from '../ports/legal-identity-crypto.port';
import type { LegalIdentityRepositoryPort } from '../ports/legal-identity.repository.port';

export type SubmitLegalIdentityProfileInput = {
  userId: string;
  legalFullName: string;
  nationalId?: string | null;
  nationalIdHash?: string | null;
  nationalIdEncrypted?: string | null;
  legalAddress?: string | null;
  dateOfBirth?: Date | null;
};

@Injectable()
export class SubmitLegalIdentityProfileUseCase {
  constructor(
    @Inject(LEGAL_IDENTITY_REPOSITORY)
    private readonly legalIdentityRepository: LegalIdentityRepositoryPort,
    @Inject(LEGAL_IDENTITY_CRYPTO)
    private readonly legalIdentityCrypto: LegalIdentityCryptoPort,
  ) {}

  async execute(
    input: SubmitLegalIdentityProfileInput,
  ): Promise<LegalIdentityProfileEntity> {
    const now = new Date();
    const existingProfile = await this.legalIdentityRepository.findByUserId(
      input.userId,
    );

    if (existingProfile) {
      throw new LegalIdentityAlreadySubmittedError();
    }

    const nationalIdHash = input.nationalId
      ? this.legalIdentityCrypto.hashNationalId(input.nationalId)
      : input.nationalIdHash;
    const nationalIdEncrypted = input.nationalId
      ? this.legalIdentityCrypto.encryptNationalId(input.nationalId)
      : input.nationalIdEncrypted ?? input.nationalIdHash;

    if (!nationalIdHash || !nationalIdEncrypted) {
      throw new Error('Either nationalId or nationalIdHash is required.');
    }

    const profile = new LegalIdentityProfileEntity({
      id: randomUUID(),
      userId: input.userId,
      legalFullName: input.legalFullName,
      nationalIdHash,
      nationalIdEncrypted,
      legalAddress: input.legalAddress ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      status: LegalIdentityStatus.SUBMITTED,
      createdAt: now,
      updatedAt: now,
    });

    return this.legalIdentityRepository.save(profile);
  }
}
