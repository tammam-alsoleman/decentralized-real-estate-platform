import { ConfigService } from '@nestjs/config';

import { ErrorCode } from '../errors/error-codes';
import { ServiceError } from '../errors/service-error';
import { FabricIdentityService } from './fabric-identity.service';

jest.mock('@hyperledger/fabric-gateway', () => ({
  signers: {
    newPrivateKeySigner: jest.fn(),
  },
}));

describe('FabricIdentityService', () => {
  it('rejects non-PlatformMSP configuration', () => {
    const configService = {
      get: jest.fn((key: string) =>
        key === 'fabric.mspId' ? 'RegistryMSP' : undefined,
      ),
    } as unknown as ConfigService;
    const service = new FabricIdentityService(configService);

    expect(() => service.getPlatformIdentityConfig()).toThrow(ServiceError);

    try {
      service.getPlatformIdentityConfig();
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError);
      expect((error as ServiceError).code).toBe(
        ErrorCode.FABRIC_AUTHORIZATION_ERROR,
      );
    }
  });
});
