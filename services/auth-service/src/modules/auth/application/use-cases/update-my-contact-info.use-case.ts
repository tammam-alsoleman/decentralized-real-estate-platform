import { Inject, Injectable } from '@nestjs/common';
import { AccountNotVerifiedError } from '../../domain/errors/account-not-verified.error';
import { UserStatus } from '../../domain/enums/user-status.enum';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

export type UpdateMyContactInfoInput = {
  userId: string;
  phoneNumber: string;
};

export type UpdateMyContactInfoResult = {
  updated: boolean;
  userId: string;
  phoneNumber: string;
  email: string;
  status: string;
};

@Injectable()
export class UpdateMyContactInfoUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(
    input: UpdateMyContactInfoInput,
  ): Promise<UpdateMyContactInfoResult> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      return {
        updated: false,
        userId: input.userId,
        phoneNumber: '',
        email: '',
        status: '',
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AccountNotVerifiedError();
    }

    user.phoneNumber = input.phoneNumber;
    const savedUser = await this.userRepository.save(user);

    return {
      updated: true,
      userId: savedUser.id,
      phoneNumber: savedUser.phoneNumber,
      email: savedUser.email ?? '',
      status: savedUser.status,
    };
  }
}
