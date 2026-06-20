import { Module } from '@nestjs/common';
import { LEGAL_IDENTITY_REPOSITORY } from './application/ports/legal-identity.repository.port';
import { OTP_CODE_REPOSITORY } from './application/ports/otp-code.repository.port';
import { SESSION_REPOSITORY } from './application/ports/session.repository.port';
import { USER_REPOSITORY } from './application/ports/user.repository.port';
import { ActivateUserUseCase } from './application/use-cases/activate-user.use-case';
import { CompletePhoneVerificationUseCase } from './application/use-cases/complete-phone-verification.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { FindUserByPhoneNumberUseCase } from './application/use-cases/find-user-by-phone-number.use-case';
import { GenerateOtpCodeUseCase } from './application/use-cases/generate-otp-code.use-case';
import { GetLegalIdentityProfileUseCase } from './application/use-cases/get-legal-identity-profile.use-case';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { RegisterUserWithOtpUseCase } from './application/use-cases/register-user-with-otp.use-case';
import { SubmitLegalIdentityProfileUseCase } from './application/use-cases/submit-legal-identity-profile.use-case';
import { VerifyOtpCodeUseCase } from './application/use-cases/verify-otp-code.use-case';
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
    FindUserByPhoneNumberUseCase,
    CreateUserUseCase,
    GenerateOtpCodeUseCase,
    VerifyOtpCodeUseCase,
    ActivateUserUseCase,
    SubmitLegalIdentityProfileUseCase,
    RegisterUserWithOtpUseCase,
    CompletePhoneVerificationUseCase,
    GetLegalIdentityProfileUseCase,
  ],
})
export class AuthModule {}
