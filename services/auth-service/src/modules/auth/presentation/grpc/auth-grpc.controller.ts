import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CompletePhoneVerificationUseCase } from '../../application/use-cases/complete-phone-verification.use-case';
import { GetLegalIdentityProfileUseCase } from '../../application/use-cases/get-legal-identity-profile.use-case';
import { RegisterUserWithOtpUseCase } from '../../application/use-cases/register-user-with-otp.use-case';
import { SubmitLegalIdentityProfileUseCase } from '../../application/use-cases/submit-legal-identity-profile.use-case';

type RegisterUserRequest = {
  phoneNumber: string;
  passwordHash?: string;
};

type RegisterUserResponse = {
  userId: string;
  phoneNumber: string;
  status: string;
  otpPlainCode: string;
};

type CompletePhoneVerificationRequest = {
  userId: string;
  phoneNumber: string;
  otpPlainCode: string;
};

type CompletePhoneVerificationResponse = {
  verified: boolean;
  userId: string;
  status: string;
  requiresLegalIdentity: boolean;
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
};

type SubmitLegalIdentityProfileRequest = {
  userId: string;
  legalFullName: string;
  nationalIdHash: string;
  dateOfBirth?: string;
};

type SubmitLegalIdentityProfileResponse = {
  userId: string;
  legalFullName: string;
  status: string;
};

@Controller()
export class AuthGrpcController {
  constructor(
    private readonly registerUserWithOtpUseCase: RegisterUserWithOtpUseCase,
    private readonly completePhoneVerificationUseCase: CompletePhoneVerificationUseCase,
    private readonly getLegalIdentityProfileUseCase: GetLegalIdentityProfileUseCase,
    private readonly submitLegalIdentityProfileUseCase: SubmitLegalIdentityProfileUseCase,
  ) {}

  @GrpcMethod('AuthService', 'RegisterUser')
  async registerUser(
    request: RegisterUserRequest,
  ): Promise<RegisterUserResponse> {
    const result = await this.registerUserWithOtpUseCase.execute({
      phoneNumber: request.phoneNumber,
      passwordHash: request.passwordHash ?? null,
    });

    return {
      userId: result.user.id,
      phoneNumber: result.user.phoneNumber,
      status: result.user.status,
      otpPlainCode: result.plainCode,
    };
  }

  @GrpcMethod('AuthService', 'CompletePhoneVerification')
  async completePhoneVerification(
    request: CompletePhoneVerificationRequest,
  ): Promise<CompletePhoneVerificationResponse> {
    const verificationResult =
      await this.completePhoneVerificationUseCase.execute({
        userId: request.userId,
        phoneNumber: request.phoneNumber,
        plainCode: request.otpPlainCode,
      });

    const legalIdentityProfile = verificationResult.verified
      ? await this.getLegalIdentityProfileUseCase.execute(request.userId)
      : null;

    return {
      verified: verificationResult.verified,
      userId: verificationResult.user?.id ?? request.userId,
      status: verificationResult.user?.status ?? '',
      requiresLegalIdentity:
        verificationResult.verified && !legalIdentityProfile,
    };
  }

  @GrpcMethod('AuthService', 'GetLegalIdentityProfile')
  async getLegalIdentityProfile(
    request: GetLegalIdentityProfileRequest,
  ): Promise<GetLegalIdentityProfileResponse> {
    const profile = await this.getLegalIdentityProfileUseCase.execute(
      request.userId,
    );

    if (!profile) {
      return {
        exists: false,
        userId: request.userId,
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
    };
  }

  @GrpcMethod('AuthService', 'SubmitLegalIdentityProfile')
  async submitLegalIdentityProfile(
    request: SubmitLegalIdentityProfileRequest,
  ): Promise<SubmitLegalIdentityProfileResponse> {
    const profile = await this.submitLegalIdentityProfileUseCase.execute({
      userId: request.userId,
      legalFullName: request.legalFullName,
      nationalIdHash: request.nationalIdHash,
      dateOfBirth: request.dateOfBirth ? new Date(request.dateOfBirth) : null,
    });

    return {
      userId: profile.userId,
      legalFullName: profile.legalFullName,
      status: profile.status,
    };
  }
}
