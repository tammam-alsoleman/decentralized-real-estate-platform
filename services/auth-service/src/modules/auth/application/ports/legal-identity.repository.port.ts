import { LegalIdentityProfileEntity } from '../../domain/entities/legal-identity-profile.entity';

export const LEGAL_IDENTITY_REPOSITORY = Symbol('LEGAL_IDENTITY_REPOSITORY');

export interface LegalIdentityRepositoryPort {
  findByUserId(userId: string): Promise<LegalIdentityProfileEntity | null>;
  findByNationalIdHash(
    nationalIdHash: string,
  ): Promise<LegalIdentityProfileEntity | null>;
  save(
    profile: LegalIdentityProfileEntity,
  ): Promise<LegalIdentityProfileEntity>;
}
