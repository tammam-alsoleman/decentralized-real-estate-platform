import { createHmac, randomBytes, timingSafeEqual, createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: string;
  status: string;
  sessionId: string;
  iss: string;
  iat: number;
  exp: number;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  refreshTokenHash: string;
};

@Injectable()
export class AuthTokenService {
  generateTokenPair(user: UserEntity, sessionId: string): TokenPair {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiresAt = this.getRefreshTokenExpiresAt();

    return {
      accessToken: this.generateAccessToken(user, sessionId),
      refreshToken,
      accessTokenExpiresAt: this.getAccessTokenExpiresAt(),
      refreshTokenExpiresAt,
      refreshTokenHash: this.hashRefreshToken(refreshToken),
    };
  }

  generateAccessToken(user: UserEntity, sessionId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email ?? '',
      role: user.role,
      status: user.status,
      sessionId,
      iss: this.getIssuer(),
      iat: now,
      exp: now + this.getAccessTokenTtlSeconds(),
    };

    return this.signJwt(payload);
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  getAccessTokenExpiresAt(): Date {
    return new Date(Date.now() + this.getAccessTokenTtlSeconds() * 1000);
  }

  getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.getRefreshTokenTtlSeconds() * 1000);
  }

  verifyAccessToken(accessToken: string): AccessTokenPayload | null {
    const [header, payload, signature] = accessToken.split('.');

    if (!header || !payload || !signature) {
      return null;
    }

    const expectedSignature = this.createSignature(`${header}.${payload}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      return null;
    }

    let decodedPayload: AccessTokenPayload;

    try {
      decodedPayload = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as AccessTokenPayload;
    } catch {
      return null;
    }

    if (
      decodedPayload.iss !== this.getIssuer() ||
      decodedPayload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return decodedPayload;
  }

  private signJwt(payload: AccessTokenPayload): string {
    const encodedHeader = this.base64UrlEncode({
      alg: 'HS256',
      typ: 'JWT',
    });
    const encodedPayload = this.base64UrlEncode(payload);
    const signature = this.createSignature(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private createSignature(value: string): string {
    return createHmac('sha256', this.getAccessTokenSecret())
      .update(value)
      .digest('base64url');
  }

  private base64UrlEncode(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private getAccessTokenSecret(): string {
    const secret = process.env.AUTH_JWT_ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error('AUTH_JWT_ACCESS_TOKEN_SECRET is required.');
    }

    return secret;
  }

  private getAccessTokenTtlSeconds(): number {
    return Number(process.env.AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS ?? 3600);
  }

  private getRefreshTokenTtlSeconds(): number {
    return Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS ?? 2592000);
  }

  private getIssuer(): string {
    return (
      process.env.AUTH_JWT_ISSUER ?? 'decentralized-real-estate-auth'
    );
  }
}
