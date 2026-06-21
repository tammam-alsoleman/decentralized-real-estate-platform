import { Module } from '@nestjs/common';
import { EMAIL_OTP_DELIVERY_PORT } from './application/ports/email-otp-delivery.port';
import { LEGAL_IDENTITY_CRYPTO } from './application/ports/legal-identity-crypto.port';
import { LEGAL_IDENTITY_REPOSITORY } from './application/ports/legal-identity.repository.port';
import { OTP_CODE_REPOSITORY } from './application/ports/otp-code.repository.port';
import { SESSION_REPOSITORY } from './application/ports/session.repository.port';
import { USER_REPOSITORY } from './application/ports/user.repository.port';
import { ActivateUserUseCase } from './application/use-cases/activate-user.use-case';
import { CompleteAccountVerificationUseCase } from './application/use-cases/complete-account-verification.use-case';
import { CompleteLoginOtpUseCase } from './application/use-cases/complete-login-otp.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { FindUserByPhoneNumberUseCase } from './application/use-cases/find-user-by-phone-number.use-case';
import { GenerateOtpCodeUseCase } from './application/use-cases/generate-otp-code.use-case';
import { GetLegalIdentityForTransactionUseCase } from './application/use-cases/get-legal-identity-for-transaction.use-case';
import { GetLegalIdentityProfileUseCase } from './application/use-cases/get-legal-identity-profile.use-case';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { RegisterUserWithOtpUseCase } from './application/use-cases/register-user-with-otp.use-case';
import { ResendEmailVerificationOtpUseCase } from './application/use-cases/resend-email-verification-otp.use-case';
import { RequestLoginOtpUseCase } from './application/use-cases/request-login-otp.use-case';
import { SubmitLegalIdentityProfileUseCase } from './application/use-cases/submit-legal-identity-profile.use-case';
import { VerifyOtpCodeUseCase } from './application/use-cases/verify-otp-code.use-case';
import { DevelopmentEmailOtpDeliveryService } from './infrastructure/email/development-email-otp-delivery.service';
import { ResendEmailOtpDeliveryService } from './infrastructure/email/resend-email-otp-delivery.service';
import { SmtpEmailOtpDeliveryService } from './infrastructure/email/smtp-email-otp-delivery.service';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { PrismaLegalIdentityRepository } from './infrastructure/persistence/repositories/prisma-legal-identity.repository';
import { PrismaOtpCodeRepository } from './infrastructure/persistence/repositories/prisma-otp-code.repository';
import { PrismaSessionRepository } from './infrastructure/persistence/repositories/prisma-session.repository';
import { PrismaUserRepository } from './infrastructure/persistence/repositories/prisma-user.repository';
import { NodeLegalIdentityCryptoService } from './infrastructure/security/node-legal-identity-crypto.service';
import { AuthGrpcController } from './presentation/grpc/auth-grpc.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AuthGrpcController],
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
    {
      provide: LEGAL_IDENTITY_CRYPTO,
      useClass: NodeLegalIdentityCryptoService,
    },
    DevelopmentEmailOtpDeliveryService,
    ResendEmailOtpDeliveryService,
    SmtpEmailOtpDeliveryService,
    {
      provide: EMAIL_OTP_DELIVERY_PORT,
      useFactory: (
        developmentEmailOtpDeliveryService: DevelopmentEmailOtpDeliveryService,
        resendEmailOtpDeliveryService: ResendEmailOtpDeliveryService,
        smtpEmailOtpDeliveryService: SmtpEmailOtpDeliveryService,
      ) => {
        if (process.env.EMAIL_OTP_DELIVERY_PROVIDER === 'smtp') {
          return smtpEmailOtpDeliveryService;
        }

        if (process.env.EMAIL_OTP_DELIVERY_PROVIDER === 'resend') {
          return resendEmailOtpDeliveryService;
        }

        return developmentEmailOtpDeliveryService;
      },
      inject: [
        DevelopmentEmailOtpDeliveryService,
        ResendEmailOtpDeliveryService,
        SmtpEmailOtpDeliveryService,
      ],
    },
    GetUserByIdUseCase,
    FindUserByPhoneNumberUseCase,
    CreateUserUseCase,
    GenerateOtpCodeUseCase,
    VerifyOtpCodeUseCase,
    ActivateUserUseCase,
    SubmitLegalIdentityProfileUseCase,
    RegisterUserWithOtpUseCase,
    ResendEmailVerificationOtpUseCase,
    RequestLoginOtpUseCase,
    CompleteLoginOtpUseCase,
    CompleteAccountVerificationUseCase,
    GetLegalIdentityProfileUseCase,
    GetLegalIdentityForTransactionUseCase,
  ],
})
export class AuthModule {}
