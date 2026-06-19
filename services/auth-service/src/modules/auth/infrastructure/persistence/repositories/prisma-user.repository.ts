import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../../application/ports/user.repository.port';
import { UserEntity } from '../../../domain/entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });

    if (!record) {
      return null;
    }

    return UserMapper.toDomain(record);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({ where: { phoneNumber } });

    if (!record) {
      return null;
    }

    return UserMapper.toDomain(record);
  }

  async save(user: UserEntity): Promise<UserEntity> {
    const savedUser = await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        passwordHash: user.passwordHash,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      update: {
        phoneNumber: user.phoneNumber,
        passwordHash: user.passwordHash,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      },
    });

    return UserMapper.toDomain(savedUser);
  }
}
