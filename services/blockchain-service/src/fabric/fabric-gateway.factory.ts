import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import { connect, hash } from '@hyperledger/fabric-gateway';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { ErrorCode } from '../errors/error-codes';
import { ServiceError } from '../errors/service-error';
import { FabricIdentityService } from './fabric-identity.service';
import type {
  Contract,
  Gateway,
  Network,
} from '@hyperledger/fabric-gateway';

export type FabricGatewayConfig = {
  channelName: string;
  chaincodeName: string;
  peerEndpoint: string;
  mspId: string;
  certPath: string;
  privateKeyPath: string;
  tlsCertPath: string;
  tlsServerNameOverride?: string;
};

export type FabricGatewayConnection = {
  gateway: Gateway;
  client: grpc.Client;
  network: Network;
  contract: Contract;
  close: () => void;
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
      tlsServerNameOverride: this.configService.get<string>(
        'fabric.tlsServerNameOverride',
      ),
      ...identity,
    };
  }

  createGateway(): FabricGatewayConnection {
    const config = this.getConfig();
    const tlsRootCert = this.readRequiredFile(
      config.tlsCertPath,
      'Fabric peer TLS root certificate',
    );
    const identity = this.identityService.loadPlatformIdentity();
    const signer = this.identityService.loadPlatformSigner();
    const client = this.createGrpcClient(config, tlsRootCert);
    const gateway = connect({
      client,
      identity,
      signer,
      hash: hash.sha256,
    });
    const network = gateway.getNetwork(config.channelName);
    const contract = network.getContract(config.chaincodeName);

    return {
      gateway,
      client,
      network,
      contract,
      close: () => {
        gateway.close();
        client.close();
      },
    };
  }

  private createGrpcClient(
    config: FabricGatewayConfig,
    tlsRootCert: Buffer,
  ): grpc.Client {
    const options: grpc.ChannelOptions = {};

    if (config.tlsServerNameOverride) {
      options['grpc.ssl_target_name_override'] = config.tlsServerNameOverride;
      options['grpc.default_authority'] = config.tlsServerNameOverride;
    }

    return new grpc.Client(
      config.peerEndpoint,
      grpc.credentials.createSsl(tlsRootCert),
      options,
    );
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
