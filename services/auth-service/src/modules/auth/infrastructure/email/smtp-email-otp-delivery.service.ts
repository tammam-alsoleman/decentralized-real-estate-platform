import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type {
  EmailOtpDeliveryInput,
  EmailOtpDeliveryPort,
} from '../../application/ports/email-otp-delivery.port';

const DEFAULT_SMTP_PORT = 465;

@Injectable()
export class SmtpEmailOtpDeliveryService implements EmailOtpDeliveryPort {
  private readonly logger = new Logger(SmtpEmailOtpDeliveryService.name);

  async sendEmailOtp(input: EmailOtpDeliveryInput): Promise<void> {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) {
      throw new Error('SMTP_HOST is required for SMTP email delivery.');
    }

    if (!user) {
      throw new Error('SMTP_USER is required for SMTP email delivery.');
    }

    if (!pass) {
      throw new Error('SMTP_PASS is required for SMTP email delivery.');
    }

    const port = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : DEFAULT_SMTP_PORT;
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE.toLowerCase() === 'true'
      : true;
    const from =
      process.env.SMTP_FROM_EMAIL || `Real Estate Platform <${user}>`;
    const expiresAt = input.expiresAt.toISOString();
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
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
      `Sent SMTP OTP email=${input.email} purpose=${input.purpose} expiresAt=${expiresAt}`,
    );
  }
}
