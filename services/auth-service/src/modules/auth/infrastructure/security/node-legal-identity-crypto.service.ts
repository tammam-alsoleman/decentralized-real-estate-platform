import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { Injectable } from '@nestjs/common';
import type { LegalIdentityCryptoPort } from '../../application/ports/legal-identity-crypto.port';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_VERSION = 'v1';
const IV_LENGTH_BYTES = 12;
const KEY_LENGTH_BYTES = 32;

@Injectable()
export class NodeLegalIdentityCryptoService
  implements LegalIdentityCryptoPort
{
  hashNationalId(nationalId: string): string {
    return createHash('sha256').update(nationalId).digest('hex');
  }

  encryptNationalId(nationalId: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const cipherText = Buffer.concat([
      cipher.update(nationalId, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      ENCRYPTION_VERSION,
      iv.toString('base64'),
      tag.toString('base64'),
      cipherText.toString('base64'),
    ].join(':');
  }

  decryptNationalId(encryptedNationalId: string): string {
    const key = this.getEncryptionKey();
    const [version, ivBase64, tagBase64, cipherTextBase64] =
      encryptedNationalId.split(':');

    if (
      version !== ENCRYPTION_VERSION ||
      !ivBase64 ||
      !tagBase64 ||
      !cipherTextBase64
    ) {
      throw new Error('Invalid encrypted national ID format.');
    }

    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      Buffer.from(ivBase64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(cipherTextBase64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private getEncryptionKey(): Buffer {
    const encodedKey = process.env.LEGAL_IDENTITY_ENCRYPTION_KEY;

    if (!encodedKey) {
      throw new Error('LEGAL_IDENTITY_ENCRYPTION_KEY is required.');
    }

    const key = Buffer.from(encodedKey, 'base64');

    if (key.length !== KEY_LENGTH_BYTES) {
      throw new Error(
        'LEGAL_IDENTITY_ENCRYPTION_KEY must be base64 encoded and decode to 32 bytes.',
      );
    }

    return key;
  }
}
