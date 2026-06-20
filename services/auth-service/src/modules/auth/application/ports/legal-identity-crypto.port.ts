export const LEGAL_IDENTITY_CRYPTO = Symbol('LEGAL_IDENTITY_CRYPTO');

export interface LegalIdentityCryptoPort {
  hashNationalId(nationalId: string): string;
  encryptNationalId(nationalId: string): string;
  decryptNationalId(encryptedNationalId: string): string;
}
