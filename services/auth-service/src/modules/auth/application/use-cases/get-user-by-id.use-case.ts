import { Inject, Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findById(userId);
  }
}
