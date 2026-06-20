import { LegalIdentityStatus } from '../enums/legal-identity-status.enum';

type LegalIdentityProfileEntityProps = {
  id: string;
  userId: string;
  legalFullName: string;
  nationalIdHash: string;
  nationalIdEncrypted: string;
  legalAddress?: string | null;
  dateOfBirth?: Date | null;
  status: LegalIdentityStatus;
  createdAt: Date;
  updatedAt: Date;
};

export class LegalIdentityProfileEntity {
  id: string;
  userId: string;
  legalFullName: string;
  nationalIdHash: string;
  nationalIdEncrypted: string;
  legalAddress?: string | null;
  dateOfBirth?: Date | null;
  status: LegalIdentityStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: LegalIdentityProfileEntityProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.legalFullName = props.legalFullName;
    this.nationalIdHash = props.nationalIdHash;
    this.nationalIdEncrypted = props.nationalIdEncrypted;
    this.legalAddress = props.legalAddress;
    this.dateOfBirth = props.dateOfBirth;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isSubmitted(): boolean {
    return this.status === LegalIdentityStatus.SUBMITTED;
  }

  markSubmitted(now = new Date()): void {
    this.status = LegalIdentityStatus.SUBMITTED;
    this.updatedAt = now;
  }
}
