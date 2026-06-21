export class EmailVerificationOtpResendLimitExceededError extends Error {
  constructor() {
    super('Email verification OTP resend limit exceeded');
    this.name = 'EmailVerificationOtpResendLimitExceededError';
  }
}
