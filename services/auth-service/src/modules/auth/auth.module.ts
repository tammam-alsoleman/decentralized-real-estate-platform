import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AuthModule {}
