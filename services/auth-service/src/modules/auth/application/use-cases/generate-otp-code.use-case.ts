import { createHash, randomInt, randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { OtpCodeEntity } from '../../domain/entities/otp-code.entity';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { OTP_CODE_REPOSITORY } from '../ports/otp-code.repository.port';
import type { OtpCodeRepositoryPort } from '../ports/otp-code.repository.port';

export type GenerateOtpCodeInput = {
  userId: string;
  phoneNumber: string;
  email?: string | null;
  purpose: OtpPurpose;
  expiresInMinutes?: number;
};

export type GenerateOtpCodeResult = {
  otpCode: OtpCodeEntity;
  plainCode: string;
};

@Injectable()
export class GenerateOtpCodeUseCase {
  constructor(
    @Inject(OTP_CODE_REPOSITORY)
    private readonly otpCodeRepository: OtpCodeRepositoryPort,
  ) {}

  async execute(input: GenerateOtpCodeInput): Promise<GenerateOtpCodeResult> {
    const now = new Date();
    const plainCode = randomInt(100000, 1000000).toString();
    const codeHash = createHash('sha256').update(plainCode).digest('hex');
    const expiresInMinutes = input.expiresInMinutes ?? 5;
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);
    const otpCode = new OtpCodeEntity({
      id: randomUUID(),
      userId: input.userId,
      phoneNumber: input.phoneNumber,
      email: input.email ?? null,
      codeHash,
      purpose: input.purpose,
      expiresAt,
      consumedAt: null,
      attempts: 0,
      createdAt: now,
    });
    const savedOtpCode = await this.otpCodeRepository.save(otpCode);

    return {
      otpCode: savedOtpCode,
      plainCode,
    };
  }
}
