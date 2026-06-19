import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

type UserEntityProps = {
  id: string;
  phoneNumber: string;
  passwordHash?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export class UserEntity {
  id: string;
  phoneNumber: string;
  passwordHash?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: UserEntityProps) {
    this.id = props.id;
    this.phoneNumber = props.phoneNumber;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  suspend(): void {
    this.status = UserStatus.SUSPENDED;
    this.updatedAt = new Date();
  }
}
