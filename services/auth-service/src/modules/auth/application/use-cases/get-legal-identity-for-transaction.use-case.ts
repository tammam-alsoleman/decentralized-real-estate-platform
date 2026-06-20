import { Inject, Injectable } from '@nestjs/common';
import { LegalIdentityStatus } from '../../domain/enums/legal-identity-status.enum';
import { LEGAL_IDENTITY_CRYPTO } from '../ports/legal-identity-crypto.port';
import { LEGAL_IDENTITY_REPOSITORY } from '../ports/legal-identity.repository.port';
import type { LegalIdentityCryptoPort } from '../ports/legal-identity-crypto.port';
import type { LegalIdentityRepositoryPort } from '../ports/legal-identity.repository.port';

export type GetLegalIdentityForTransactionResult = {
  exists: boolean;
  eligibleForTransaction: boolean;
  userId: string;
  legalFullName: string;
  nationalId: string;
  dateOfBirth: Date | null;
  legalAddress: string | null;
  status: string;
};

@Injectable()
export class GetLegalIdentityForTransactionUseCase {
  constructor(
    @Inject(LEGAL_IDENTITY_REPOSITORY)
    private readonly legalIdentityRepository: LegalIdentityRepositoryPort,
    @Inject(LEGAL_IDENTITY_CRYPTO)
    private readonly legalIdentityCrypto: LegalIdentityCryptoPort,
  ) {}

  async execute(
    userId: string,
  ): Promise<GetLegalIdentityForTransactionResult> {
    const profile = await this.legalIdentityRepository.findByUserId(userId);

    if (!profile) {
      return {
        exists: false,
        eligibleForTransaction: false,
        userId,
        legalFullName: '',
        nationalId: '',
        dateOfBirth: null,
        legalAddress: null,
        status: '',
      };
    }

    return {
      exists: true,
      eligibleForTransaction:
        profile.status === LegalIdentityStatus.SUBMITTED,
      userId: profile.userId,
      legalFullName: profile.legalFullName,
      nationalId: this.legalIdentityCrypto.decryptNationalId(
        profile.nationalIdEncrypted,
      ),
      dateOfBirth: profile.dateOfBirth ?? null,
      legalAddress: profile.legalAddress ?? null,
      status: profile.status,
    };
  }
}
