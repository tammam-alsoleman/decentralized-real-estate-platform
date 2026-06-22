export class LegalIdentityAlreadySubmittedError extends Error {
  constructor() {
    super('Legal identity has already been submitted and cannot be edited');
    this.name = 'LegalIdentityAlreadySubmittedError';
  }
}
