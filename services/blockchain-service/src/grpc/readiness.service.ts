import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type HealthCheckResponse = {
  status: string;
  service: string;
  timestamp: string;
  details: Record<string, string>;
};

@Injectable()
export class ReadinessService {
  constructor(private readonly configService: ConfigService) {}

  checkLiveness(): HealthCheckResponse {
    return {
      status: 'SERVING',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      details: {
        process: 'alive',
      },
    };
  }

  checkReadiness(): HealthCheckResponse {
    const fabricMspId = this.configService.get<string>('fabric.mspId');
    const requiredConfig = {
      rabbitmqUrl: this.configService.get<string>('rabbitmq.url'),
      fabricChannelName: this.configService.get<string>('fabric.channelName'),
      fabricChaincodeName: this.configService.get<string>(
        'fabric.chaincodeName',
      ),
      fabricMspId,
      fabricPeerEndpoint: this.configService.get<string>('fabric.peerEndpoint'),
      fabricTlsCertPath: this.configService.get<string>('fabric.tlsCertPath'),
      fabricCertPath: this.configService.get<string>('fabric.certPath'),
      fabricPrivateKeyPath: this.configService.get<string>(
        'fabric.privateKeyPath',
      ),
    };

    const missing = Object.entries(requiredConfig)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    const platformMspValid = fabricMspId === 'PlatformMSP';
    const ready = missing.length === 0 && platformMspValid;

    return {
      status: ready ? 'READY' : 'NOT_READY',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      details: {
        configuration: missing.length === 0 ? 'present' : 'missing',
        missing: missing.join(','),
        platformMsp: platformMspValid ? 'valid' : 'invalid',
        rabbitmq: 'not_checked_in_skeleton',
        fabric: 'not_checked_in_skeleton',
      },
    };
  }

  private get serviceName(): string {
    return this.configService.get<string>('service.name') ?? 'blockchain-service';
  }
}
