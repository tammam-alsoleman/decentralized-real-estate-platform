import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { signers } from '@hyperledger/fabric-gateway';

import { ErrorCode } from '../errors/error-codes';
import { ServiceError } from '../errors/service-error';
import type { Identity, Signer } from '@hyperledger/fabric-gateway';

export type PlatformIdentityConfig = {
  mspId: string;
  certPath: string;
  privateKeyPath: string;
  tlsCertPath: string;
};

@Injectable()
export class FabricIdentityService {
  constructor(private readonly configService: ConfigService) {}

  getPlatformIdentityConfig(): PlatformIdentityConfig {
    const mspId = this.configService.get<string>('fabric.mspId') ?? 'PlatformMSP';

    if (mspId !== 'PlatformMSP') {
      throw new ServiceError(
        ErrorCode.FABRIC_AUTHORIZATION_ERROR,
        'Blockchain Service may only use PlatformMSP identity',
      );
    }

    return {
      mspId,
      certPath: this.requireConfigValue('fabric.certPath', 'FABRIC_CERT_PATH'),
      privateKeyPath:
        this.requireConfigValue('fabric.privateKeyPath', 'FABRIC_PRIVATE_KEY_PATH'),
      tlsCertPath: this.requireConfigValue(
        'fabric.tlsCertPath',
        'FABRIC_TLS_CERT_PATH',
      ),
    };
  }

  loadPlatformIdentity(): Identity {
    const config = this.getPlatformIdentityConfig();
    const credentials = this.readRequiredFile(
      config.certPath,
      'PlatformMSP certificate',
    );

    return {
      mspId: config.mspId,
      credentials,
    };
  }

  loadPlatformSigner(): Signer {
    const config = this.getPlatformIdentityConfig();
    const privateKeyPem = this.readRequiredFile(
      config.privateKeyPath,
      'PlatformMSP private key',
    );

    try {
      return signers.newPrivateKeySigner(createPrivateKey(privateKeyPem));
    } catch (error) {
      throw new ServiceError(
        ErrorCode.FABRIC_PRECONDITION_ERROR,
        'Unable to create PlatformMSP signer from FABRIC_PRIVATE_KEY_PATH',
        false,
        error,
      );
    }
  }

  private requireConfigValue(configKey: string, envName: string): string {
    const value = this.configService.get<string>(configKey);

    if (!value) {
      throw new ServiceError(
        ErrorCode.FABRIC_PRECONDITION_ERROR,
        `${envName} is required for PlatformMSP Fabric access`,
      );
    }

    return value;
  }

  private readRequiredFile(path: string, label: string): Buffer {
    const resolvedPath = resolve(path);

    if (!existsSync(resolvedPath)) {
      throw new ServiceError(
        ErrorCode.FABRIC_PRECONDITION_ERROR,
        `${label} file was not found`,
      );
    }

    try {
      return readFileSync(resolvedPath);
    } catch (error) {
      throw new ServiceError(
        ErrorCode.FABRIC_PRECONDITION_ERROR,
        `${label} file could not be read`,
        false,
        error,
      );
    }
  }
}
