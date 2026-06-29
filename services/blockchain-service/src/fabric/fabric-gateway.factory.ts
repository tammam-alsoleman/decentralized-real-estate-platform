import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ErrorCode } from '../errors/error-codes';
import { ServiceError } from '../errors/service-error';
import { FabricIdentityService } from './fabric-identity.service';

export type FabricGatewayConfig = {
  channelName: string;
  chaincodeName: string;
  peerEndpoint: string;
  mspId: string;
  certPath: string;
  privateKeyPath: string;
  tlsCertPath: string;
};

@Injectable()
export class FabricGatewayFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly identityService: FabricIdentityService,
  ) {}

  getConfig(): FabricGatewayConfig {
    const identity = this.identityService.getPlatformIdentityConfig();

    return {
      channelName:
        this.configService.get<string>('fabric.channelName') ??
        'realestatechannel',
      chaincodeName:
        this.configService.get<string>('fabric.chaincodeName') ??
        'realestate-contract',
      peerEndpoint:
        this.configService.get<string>('fabric.peerEndpoint') ??
        'peer0.platform.realestate.local:9051',
      ...identity,
    };
  }

  createGateway(): never {
    throw new ServiceError(
      ErrorCode.NOT_IMPLEMENTED,
      'Fabric Gateway connection creation is not implemented in the skeleton',
    );
  }
}
