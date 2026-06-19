export class PhoneNumberAlreadyExistsError extends Error {
  constructor(phoneNumber: string) {
    super(`Phone number already exists: ${phoneNumber}`);
    this.name = 'PhoneNumberAlreadyExistsError';
  }
}
