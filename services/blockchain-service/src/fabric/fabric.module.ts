import { Module } from '@nestjs/common';

import { FabricClientService } from './fabric-client.service';
import { FabricGatewayFactory } from './fabric-gateway.factory';
import { FabricIdentityService } from './fabric-identity.service';

@Module({
  providers: [FabricClientService, FabricGatewayFactory, FabricIdentityService],
  exports: [FabricClientService, FabricGatewayFactory, FabricIdentityService],
})
export class FabricModule {}
