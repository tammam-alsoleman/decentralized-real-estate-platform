export class InvalidAccessTokenError extends Error {
  constructor() {
    super('Invalid access token');
    this.name = 'InvalidAccessTokenError';
  }
}
