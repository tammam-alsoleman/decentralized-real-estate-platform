import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserRole } from '../../domain/enums/user-role.enum';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

export type CreateUserInput = {
  phoneNumber: string;
  email?: string | null;
  passwordHash?: string | null;
  role?: UserRole;
};

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(input: CreateUserInput): Promise<UserEntity> {
    if (input.email) {
      const existingUser = await this.userRepository.findByEmail(input.email);

      if (existingUser) {
        throw new EmailAlreadyExistsError();
      }
    }

    const now = new Date();
    const user = new UserEntity({
      id: randomUUID(),
      phoneNumber: input.phoneNumber,
      email: input.email ?? null,
      passwordHash: input.passwordHash ?? null,
      role: input.role ?? UserRole.CITIZEN,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return this.userRepository.save(user);
  }
}
