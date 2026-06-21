import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';

export const EMAIL_OTP_DELIVERY_PORT = Symbol('EMAIL_OTP_DELIVERY_PORT');

export type EmailOtpDeliveryInput = {
  email: string;
  otpPlainCode: string;
  purpose: OtpPurpose;
  expiresAt: Date;
};

export interface EmailOtpDeliveryPort {
  sendEmailOtp(input: EmailOtpDeliveryInput): Promise<void>;
}
