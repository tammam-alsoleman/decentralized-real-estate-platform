export class AccountNotVerifiedError extends Error {
  constructor() {
    super('Account is not verified');
    this.name = 'AccountNotVerifiedError';
  }
}
