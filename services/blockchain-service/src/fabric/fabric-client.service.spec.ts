import { ErrorCode } from '../errors/error-codes';
import { ServiceError } from '../errors/service-error';
import {
  FabricClientService,
  fabricResponseToString,
  parseFabricJsonResponse,
} from './fabric-client.service';
import type { FabricGatewayFactory } from './fabric-gateway.factory';

jest.mock('@grpc/grpc-js', () => ({
  Client: jest.fn(),
  credentials: {
    createSsl: jest.fn(),
  },
}));

jest.mock('@hyperledger/fabric-gateway', () => ({
  connect: jest.fn(),
  hash: {
    sha256: jest.fn(),
  },
  signers: {
    newPrivateKeySigner: jest.fn(),
  },
}));

describe('FabricClientService', () => {
  it('does not expose registry or notary approval methods', () => {
    const service = new FabricClientService({} as FabricGatewayFactory);

    expect(
      (service as unknown as Record<string, unknown>).approveByRegistry,
    ).toBeUndefined();
    expect(
      (service as unknown as Record<string, unknown>).approveByNotary,
    ).toBeUndefined();
  });

  it('converts an empty Fabric response to an empty string and null JSON', () => {
    const response = new Uint8Array();

    expect(fabricResponseToString(response)).toBe('');
    expect(parseFabricJsonResponse(response)).toBeNull();
  });

  it('parses a JSON Fabric response', () => {
    const response = Buffer.from(
      JSON.stringify({
        transactionId: 'tx-1',
        status: 'PENDING_EXTERNAL_APPROVALS',
      }),
    );

    expect(parseFabricJsonResponse(response)).toEqual({
      transactionId: 'tx-1',
      status: 'PENDING_EXTERNAL_APPROVALS',
    });
  });

  it('throws a service error for invalid JSON Fabric responses', () => {
    const response = Buffer.from('not-json');

    expect(() => parseFabricJsonResponse(response)).toThrow(ServiceError);

    try {
      parseFabricJsonResponse(response);
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError);
      expect((error as ServiceError).code).toBe(
        ErrorCode.FABRIC_PRECONDITION_ERROR,
      );
    }
  });
});
