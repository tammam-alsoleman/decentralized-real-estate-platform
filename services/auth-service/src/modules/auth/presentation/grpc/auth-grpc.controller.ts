import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CompleteAccountVerificationUseCase } from '../../application/use-cases/complete-account-verification.use-case';
import { CompleteLoginOtpUseCase } from '../../application/use-cases/complete-login-otp.use-case';
import { GetLegalIdentityForTransactionUseCase } from '../../application/use-cases/get-legal-identity-for-transaction.use-case';
import { GetLegalIdentityProfileUseCase } from '../../application/use-cases/get-legal-identity-profile.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RegisterUserWithOtpUseCase } from '../../application/use-cases/register-user-with-otp.use-case';
import { RefreshAuthSessionUseCase } from '../../application/use-cases/refresh-auth-session.use-case';
import { ResendEmailVerificationOtpUseCase } from '../../application/use-cases/resend-email-verification-otp.use-case';
import { RequestLoginOtpUseCase } from '../../application/use-cases/request-login-otp.use-case';
import { SubmitLegalIdentityProfileUseCase } from '../../application/use-cases/submit-legal-identity-profile.use-case';
import { ValidateAccessTokenUseCase } from '../../application/use-cases/validate-access-token.use-case';
import { throwGrpcError } from './auth-grpc-error.util';

type RegisterUserRequest = {
  phoneNumber: string;
  passwordHash?: string;
  email: string;
};

type RegisterUserResponse = {
  userId: string;
  phoneNumber: string;
  status: string;
  otpPlainCode: string;
  email: string;
};

type ResendEmailVerificationOtpRequest = {
  email: string;
};

type ResendEmailVerificationOtpResponse = {
  sent: boolean;
  userId: string;
  email: string;
  otpPlainCode: string;
  expiresAt: string;
};

type RequestLoginOtpRequest = {
  email: string;
};

type RequestLoginOtpResponse = {
  sent: boolean;
  userId: string;
  email: string;
  otpPlainCode: string;
  expiresAt: string;
};

type CompleteLoginOtpRequest = {
  email: string;
  otpPlainCode: string;
};

type CompleteLoginOtpResponse = {
  authenticated: boolean;
  userId: string;
  email: string;
  status: string;
  requiresLegalIdentity: boolean;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

type RefreshAuthSessionRequest = {
  refreshToken: string;
};

type RefreshAuthSessionResponse = {
  refreshed: boolean;
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

type LogoutRequest = {
  refreshToken: string;
};

type LogoutResponse = {
  loggedOut: boolean;
};

type ValidateAccessTokenRequest = {
  accessToken: string;
};

type ValidateAccessTokenResponse = {
  valid: boolean;
  userId: string;
  email: string;
  role: string;
  status: string;
  sessionId: string;
};

type CompletePhoneVerificationRequest = {
  userId: string;
  phoneNumber: string;
  otpPlainCode: string;
};

type CompleteEmailVerificationRequest = {
  userId: string;
  email: string;
  otpPlainCode: string;
};

type CompletePhoneVerificationResponse = {
  verified: boolean;
  userId: string;
  status: string;
  requiresLegalIdentity: boolean;
};

type CompleteEmailVerificationResponse = CompletePhoneVerificationResponse & {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

type GetLegalIdentityProfileRequest = {
  userId: string;
};

type GetLegalIdentityProfileResponse = {
  exists: boolean;
  userId: string;
  legalFullName: string;
  status: string;
  dateOfBirth?: string;
  legalAddress?: string;
};

type SubmitLegalIdentityProfileRequest = {
  userId: string;
  legalFullName: string;
  nationalId: string;
  dateOfBirth?: string;
  legalAddress?: string;
};

type SubmitLegalIdentityProfileResponse = {
  userId: string;
  legalFullName: string;
  status: string;
  legalAddress?: string;
};

type GetLegalIdentityForTransactionRequest = {
  userId: string;
};

type GetLegalIdentityForTransactionResponse = {
  exists: boolean;
  eligibleForTransaction: boolean;
  userId: string;
  legalFullName: string;
  nationalId: string;
  dateOfBirth?: string;
  legalAddress?: string;
  status: string;
};

@Controller()
export class AuthGrpcController {
  constructor(
    private readonly registerUserWithOtpUseCase: RegisterUserWithOtpUseCase,
    private readonly resendEmailVerificationOtpUseCase: ResendEmailVerificationOtpUseCase,
    private readonly requestLoginOtpUseCase: RequestLoginOtpUseCase,
    private readonly completeLoginOtpUseCase: CompleteLoginOtpUseCase,
    private readonly refreshAuthSessionUseCase: RefreshAuthSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly validateAccessTokenUseCase: ValidateAccessTokenUseCase,
    private readonly completeAccountVerificationUseCase: CompleteAccountVerificationUseCase,
    private readonly getLegalIdentityProfileUseCase: GetLegalIdentityProfileUseCase,
    private readonly submitLegalIdentityProfileUseCase: SubmitLegalIdentityProfileUseCase,
    private readonly getLegalIdentityForTransactionUseCase: GetLegalIdentityForTransactionUseCase,
  ) {}

  @GrpcMethod('AuthService', 'RegisterUser')
  async registerUser(
    request: RegisterUserRequest,
  ): Promise<RegisterUserResponse> {
    try {
      const phoneNumber = this.requireString(request.phoneNumber, 'phoneNumber');
      const email = this.requireString(request.email, 'email');
      const passwordHash = this.optionalString(request.passwordHash);
      const result = await this.registerUserWithOtpUseCase.execute({
        phoneNumber,
        email,
        passwordHash: passwordHash ?? null,
      });

      return {
        userId: result.user.id,
        phoneNumber: result.user.phoneNumber,
        status: result.user.status,
        otpPlainCode: result.plainCode,
        email: result.user.email ?? email,
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'ResendEmailVerificationOtp')
  async resendEmailVerificationOtp(
    request: ResendEmailVerificationOtpRequest,
  ): Promise<ResendEmailVerificationOtpResponse> {
    try {
      const email = this.requireString(request.email, 'email');
      const result = await this.resendEmailVerificationOtpUseCase.execute({
        email,
      });

      return {
        sent: result.sent,
        userId: result.userId,
        email: result.email,
        otpPlainCode: result.otpPlainCode ?? '',
        expiresAt: result.expiresAt?.toISOString() ?? '',
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'RequestLoginOtp')
  async requestLoginOtp(
    request: RequestLoginOtpRequest,
  ): Promise<RequestLoginOtpResponse> {
    try {
      const email = this.requireString(request.email, 'email');
      const result = await this.requestLoginOtpUseCase.execute({ email });

      return {
        sent: result.sent,
        userId: result.userId,
        email: result.email,
        otpPlainCode: result.otpPlainCode ?? '',
        expiresAt: result.expiresAt?.toISOString() ?? '',
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'CompleteLoginOtp')
  async completeLoginOtp(
    request: CompleteLoginOtpRequest,
  ): Promise<CompleteLoginOtpResponse> {
    try {
      const email = this.requireString(request.email, 'email');
      const otpPlainCode = this.requireString(
        request.otpPlainCode,
        'otpPlainCode',
      );
      const result = await this.completeLoginOtpUseCase.execute({
        email,
        otpPlainCode,
      });

      return {
        authenticated: result.authenticated,
        userId: result.userId,
        email: result.email,
        status: result.status,
        requiresLegalIdentity: result.requiresLegalIdentity,
        accessToken: result.accessToken ?? '',
        refreshToken: result.refreshToken ?? '',
        accessTokenExpiresAt: result.accessTokenExpiresAt?.toISOString() ?? '',
        refreshTokenExpiresAt:
          result.refreshTokenExpiresAt?.toISOString() ?? '',
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'RefreshAuthSession')
  async refreshAuthSession(
    request: RefreshAuthSessionRequest,
  ): Promise<RefreshAuthSessionResponse> {
    try {
      const refreshToken = this.requireString(
        request.refreshToken,
        'refreshToken',
      );
      const result = await this.refreshAuthSessionUseCase.execute({
        refreshToken,
      });

      return {
        refreshed: result.refreshed,
        userId: result.userId,
        email: result.email,
        accessToken: result.accessToken ?? '',
        refreshToken: result.refreshToken ?? '',
        accessTokenExpiresAt: result.accessTokenExpiresAt?.toISOString() ?? '',
        refreshTokenExpiresAt:
          result.refreshTokenExpiresAt?.toISOString() ?? '',
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'Logout')
  async logout(request: LogoutRequest): Promise<LogoutResponse> {
    try {
      const refreshToken = this.requireString(
        request.refreshToken,
        'refreshToken',
      );
      const result = await this.logoutUseCase.execute({ refreshToken });

      return {
        loggedOut: result.loggedOut,
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'ValidateAccessToken')
  async validateAccessToken(
    request: ValidateAccessTokenRequest,
  ): Promise<ValidateAccessTokenResponse> {
    try {
      const accessToken = this.requireString(
        request.accessToken,
        'accessToken',
      );
      const result = await this.validateAccessTokenUseCase.execute({
        accessToken,
      });

      return {
        valid: result.valid,
        userId: result.userId,
        email: result.email,
        role: result.role,
        status: result.status,
        sessionId: result.sessionId,
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'CompletePhoneVerification')
  async completePhoneVerification(
    request: CompletePhoneVerificationRequest,
  ): Promise<CompletePhoneVerificationResponse> {
    try {
      const userId = this.requireString(request.userId, 'userId');
      const phoneNumber = this.requireString(request.phoneNumber, 'phoneNumber');
      const otpPlainCode = this.requireString(
        request.otpPlainCode,
        'otpPlainCode',
      );
      const verificationResult =
        await this.completeAccountVerificationUseCase.execute({
          userId,
          phoneNumber,
          plainCode: otpPlainCode,
        });

      const legalIdentityProfile = verificationResult.verified
        ? await this.getLegalIdentityProfileUseCase.execute(userId)
        : null;

      return {
        verified: verificationResult.verified,
        userId: verificationResult.user?.id ?? userId,
        status: verificationResult.user?.status ?? '',
        requiresLegalIdentity:
          verificationResult.verified && !legalIdentityProfile,
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'CompleteEmailVerification')
  async completeEmailVerification(
    request: CompleteEmailVerificationRequest,
  ): Promise<CompleteEmailVerificationResponse> {
    try {
      const userId = this.requireString(request.userId, 'userId');
      const email = this.requireString(request.email, 'email');
      const otpPlainCode = this.requireString(
        request.otpPlainCode,
        'otpPlainCode',
      );
      const verificationResult =
        await this.completeAccountVerificationUseCase.execute({
          userId,
          email,
          phoneNumber: '',
          plainCode: otpPlainCode,
        });

      const legalIdentityProfile = verificationResult.verified
        ? await this.getLegalIdentityProfileUseCase.execute(userId)
        : null;

      return {
        verified: verificationResult.verified,
        userId: verificationResult.user?.id ?? userId,
        status: verificationResult.user?.status ?? '',
        requiresLegalIdentity:
          verificationResult.verified && !legalIdentityProfile,
        accessToken: verificationResult.accessToken ?? '',
        refreshToken: verificationResult.refreshToken ?? '',
        accessTokenExpiresAt:
          verificationResult.accessTokenExpiresAt?.toISOString() ?? '',
        refreshTokenExpiresAt:
          verificationResult.refreshTokenExpiresAt?.toISOString() ?? '',
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'GetLegalIdentityProfile')
  async getLegalIdentityProfile(
    request: GetLegalIdentityProfileRequest,
  ): Promise<GetLegalIdentityProfileResponse> {
    try {
      const userId = this.requireString(request.userId, 'userId');
      const profile = await this.getLegalIdentityProfileUseCase.execute(userId);

      if (!profile) {
        return {
          exists: false,
          userId,
          legalFullName: '',
          status: '',
        };
      }

      return {
        exists: true,
        userId: profile.userId,
        legalFullName: profile.legalFullName,
        status: profile.status,
        dateOfBirth: profile.dateOfBirth?.toISOString(),
        legalAddress: profile.legalAddress ?? undefined,
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'SubmitLegalIdentityProfile')
  async submitLegalIdentityProfile(
    request: SubmitLegalIdentityProfileRequest,
  ): Promise<SubmitLegalIdentityProfileResponse> {
    try {
      const userId = this.requireString(request.userId, 'userId');
      const legalFullName = this.requireString(
        request.legalFullName,
        'legalFullName',
      );
      const nationalId = this.requireString(request.nationalId, 'nationalId');
      const dateOfBirth = this.optionalString(request.dateOfBirth);
      const legalAddress = this.optionalString(request.legalAddress);
      const profile = await this.submitLegalIdentityProfileUseCase.execute({
        userId,
        legalFullName,
        nationalId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        legalAddress: legalAddress ?? null,
      });

      return {
        userId: profile.userId,
        legalFullName: profile.legalFullName,
        status: profile.status,
        legalAddress: profile.legalAddress ?? undefined,
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  @GrpcMethod('AuthService', 'GetLegalIdentityForTransaction')
  async getLegalIdentityForTransaction(
    request: GetLegalIdentityForTransactionRequest,
  ): Promise<GetLegalIdentityForTransactionResponse> {
    try {
      const userId = this.requireString(request.userId, 'userId');
      const result =
        await this.getLegalIdentityForTransactionUseCase.execute(userId);

      return {
        exists: result.exists,
        eligibleForTransaction: result.eligibleForTransaction,
        userId: result.userId,
        legalFullName: result.legalFullName,
        nationalId: result.nationalId,
        dateOfBirth: result.dateOfBirth?.toISOString(),
        legalAddress: result.legalAddress ?? undefined,
        status: result.status,
      };
    } catch (error) {
      throwGrpcError(error);
    }
  }

  private requireString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${fieldName} is required.`);
    }

    return value;
  }

  private optionalString(value: unknown): string | undefined {
    if (value == null) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new Error('Optional string input is required to be a string.');
    }

    return value;
  }
}
