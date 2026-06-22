import { Injectable } from '@nestjs/common';

@Injectable()
export class OtpResponsePolicyService {
  shouldReturnOtpPlainCode(): boolean {
    return process.env.AUTH_RETURN_OTP_IN_RESPONSE === 'true';
  }
}
