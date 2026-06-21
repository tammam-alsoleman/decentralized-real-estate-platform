type SessionEntityProps = {
  id: string;
  userId: string;
  jti: string;
  refreshTokenHash?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  revokedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt?: Date;
};

export class SessionEntity {
  id: string;
  userId: string;
  jti: string;
  refreshTokenHash?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  revokedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: SessionEntityProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.jti = props.jti;
    this.refreshTokenHash = props.refreshTokenHash;
    this.userAgent = props.userAgent;
    this.ipAddress = props.ipAddress;
    this.revokedAt = props.revokedAt;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt ?? props.createdAt;
  }

  isExpired(now = new Date()): boolean {
    return this.expiresAt <= now;
  }

  isRevoked(): boolean {
    return this.revokedAt != null;
  }

  revoke(now = new Date()): void {
    this.revokedAt = now;
    this.updatedAt = now;
  }
}
