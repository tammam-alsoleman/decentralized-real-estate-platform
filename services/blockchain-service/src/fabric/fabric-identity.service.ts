import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ErrorCode } from '../errors/error-codes';
import { ServiceError } from '../errors/service-error';

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
      certPath: this.configService.get<string>('fabric.certPath') ?? '',
      privateKeyPath:
        this.configService.get<string>('fabric.privateKeyPath') ?? '',
      tlsCertPath: this.configService.get<string>('fabric.tlsCertPath') ?? '',
    };
  }
}
