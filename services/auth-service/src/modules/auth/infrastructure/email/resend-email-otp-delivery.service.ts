import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type {
  EmailOtpDeliveryInput,
  EmailOtpDeliveryPort,
} from '../../application/ports/email-otp-delivery.port';

const DEFAULT_FROM_EMAIL = 'Real Estate Platform <onboarding@resend.dev>';

@Injectable()
export class ResendEmailOtpDeliveryService implements EmailOtpDeliveryPort {
  private readonly logger = new Logger(ResendEmailOtpDeliveryService.name);

  async sendEmailOtp(input: EmailOtpDeliveryInput): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required for Resend email delivery.');
    }

    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL;
    const expiresAt = input.expiresAt.toISOString();

    await resend.emails.send({
      from,
      to: input.email,
      subject: 'Your Real Estate Platform verification code',
      text: [
        'Your Real Estate Platform verification code is:',
        input.otpPlainCode,
        '',
        `This code expires at ${expiresAt}.`,
        'Do not share this code with anyone.',
      ].join('\n'),
      html: [
        '<p>Your Real Estate Platform verification code is:</p>',
        `<p><strong>${input.otpPlainCode}</strong></p>`,
        `<p>This code expires at ${expiresAt}.</p>`,
        '<p>Do not share this code with anyone.</p>',
      ].join(''),
    });

    this.logger.log(
      `Sent email OTP email=${input.email} purpose=${input.purpose} expiresAt=${expiresAt}`,
    );
  }
}
