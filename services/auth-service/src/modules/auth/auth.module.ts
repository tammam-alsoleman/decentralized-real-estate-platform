import { Module } from '@nestjs/common';
import { LEGAL_IDENTITY_REPOSITORY } from './application/ports/legal-identity.repository.port';
import { OTP_CODE_REPOSITORY } from './application/ports/otp-code.repository.port';
import { SESSION_REPOSITORY } from './application/ports/session.repository.port';
import { USER_REPOSITORY } from './application/ports/user.repository.port';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { PrismaLegalIdentityRepository } from './infrastructure/persistence/repositories/prisma-legal-identity.repository';
import { PrismaOtpCodeRepository } from './infrastructure/persistence/repositories/prisma-otp-code.repository';
import { PrismaSessionRepository } from './infrastructure/persistence/repositories/prisma-session.repository';
import { PrismaUserRepository } from './infrastructure/persistence/repositories/prisma-user.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: OTP_CODE_REPOSITORY,
      useClass: PrismaOtpCodeRepository,
    },
    {
      provide: SESSION_REPOSITORY,
      useClass: PrismaSessionRepository,
    },
    {
      provide: LEGAL_IDENTITY_REPOSITORY,
      useClass: PrismaLegalIdentityRepository,
    },
    GetUserByIdUseCase,
  ],
})
export class AuthModule {}
