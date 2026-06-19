import { Inject, Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

@Injectable()
export class FindUserByPhoneNumberUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(phoneNumber: string): Promise<UserEntity | null> {
    return this.userRepository.findByPhoneNumber(phoneNumber);
  }
}
