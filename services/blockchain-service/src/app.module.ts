import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { ContractsModule } from './contracts/contracts.module';
import { FabricModule } from './fabric/fabric.module';
import { GrpcModule } from './grpc/grpc.module';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    FabricModule,
    MessagingModule,
    ContractsModule,
    GrpcModule,
  ],
})
export class AppModule {}
