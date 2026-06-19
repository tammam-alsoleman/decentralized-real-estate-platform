import { Inject, Injectable } from '@nestjs/common';
import { LegalIdentityProfileEntity } from '../../domain/entities/legal-identity-profile.entity';
import { LEGAL_IDENTITY_REPOSITORY } from '../ports/legal-identity.repository.port';
import type { LegalIdentityRepositoryPort } from '../ports/legal-identity.repository.port';

@Injectable()
export class GetLegalIdentityProfileUseCase {
  constructor(
    @Inject(LEGAL_IDENTITY_REPOSITORY)
    private readonly legalIdentityRepository: LegalIdentityRepositoryPort,
  ) {}

  async execute(userId: string): Promise<LegalIdentityProfileEntity | null> {
    return this.legalIdentityRepository.findByUserId(userId);
  }
}
