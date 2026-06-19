import { UserEntity } from '../../domain/entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepositoryPort {
  findById(id: string): Promise<UserEntity | null>;
  findByPhoneNumber(phoneNumber: string): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<UserEntity>;
}
