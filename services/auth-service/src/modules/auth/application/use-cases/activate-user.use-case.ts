import { Inject, Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

@Injectable()
export class ActivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(userId: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    const activeUser = user;
    activeUser.activate();

    return this.userRepository.save(activeUser);
  }
}
