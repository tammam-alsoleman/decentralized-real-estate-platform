import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

type UserEntityProps = {
  id: string;
  phoneNumber: string;
  email?: string | null;
  passwordHash?: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class UserEntity {
  id: string;
  phoneNumber: string;
  email?: string | null;
  passwordHash?: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: UserEntityProps) {
    this.id = props.id;
    this.phoneNumber = props.phoneNumber;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.status = props.status;
    this.emailVerifiedAt = props.emailVerifiedAt;
    this.phoneVerifiedAt = props.phoneVerifiedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  markEmailVerified(verifiedAt?: Date): UserEntity {
    this.emailVerifiedAt = verifiedAt ?? new Date();
    return this;
  }

  suspend(): void {
    this.status = UserStatus.SUSPENDED;
    this.updatedAt = new Date();
  }
}
