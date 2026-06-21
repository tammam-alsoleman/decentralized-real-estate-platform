import { Injectable, Logger } from '@nestjs/common';
import type {
  EmailOtpDeliveryInput,
  EmailOtpDeliveryPort,
} from '../../application/ports/email-otp-delivery.port';

@Injectable()
export class DevelopmentEmailOtpDeliveryService
  implements EmailOtpDeliveryPort
{
  private readonly logger = new Logger(DevelopmentEmailOtpDeliveryService.name);

  async sendEmailOtp(input: EmailOtpDeliveryInput): Promise<void> {
    this.logger.log(
      [
        'Development email OTP delivery',
        `email=${input.email}`,
        `purpose=${input.purpose}`,
        `expiresAt=${input.expiresAt.toISOString()}`,
        `otpPlainCode=${input.otpPlainCode}`,
      ].join(' '),
    );
  }
}
