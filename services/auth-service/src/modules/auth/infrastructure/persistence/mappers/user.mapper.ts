import type { User as PrismaUser } from '@prisma/client';
import { UserEntity } from '../../../domain/entities/user.entity';
import { UserRole } from '../../../domain/enums/user-role.enum';
import { UserStatus } from '../../../domain/enums/user-status.enum';

export class UserMapper {
  static toDomain(prismaUser: PrismaUser): UserEntity {
    return new UserEntity({
      id: prismaUser.id,
      phoneNumber: prismaUser.phoneNumber,
      email: prismaUser.email,
      passwordHash: prismaUser.passwordHash,
      role: prismaUser.role as UserRole,
      status: prismaUser.status as UserStatus,
      emailVerifiedAt: prismaUser.emailVerifiedAt,
      phoneVerifiedAt: prismaUser.phoneVerifiedAt,
      emailVerificationResendCount:
        prismaUser.emailVerificationResendCount,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    });
  }
}
