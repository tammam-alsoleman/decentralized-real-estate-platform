import { OtpPurpose } from '../enums/otp-purpose.enum';

type OtpCodeEntityProps = {
  id: string;
  userId: string;
  phoneNumber: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  consumedAt?: Date | null;
  attempts: number;
  createdAt: Date;
};

export class OtpCodeEntity {
  id: string;
  userId: string;
  phoneNumber: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  consumedAt?: Date | null;
  attempts: number;
  createdAt: Date;

  constructor(props: OtpCodeEntityProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.phoneNumber = props.phoneNumber;
    this.codeHash = props.codeHash;
    this.purpose = props.purpose;
    this.expiresAt = props.expiresAt;
    this.consumedAt = props.consumedAt;
    this.attempts = props.attempts;
    this.createdAt = props.createdAt;
  }

  isExpired(now = new Date()): boolean {
    return this.expiresAt <= now;
  }

  isConsumed(): boolean {
    return this.consumedAt != null;
  }

  markConsumed(now = new Date()): void {
    this.consumedAt = now;
  }
}
