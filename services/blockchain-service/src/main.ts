import { join } from 'path';

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap() {
  const host = process.env.GRPC_HOST ?? '0.0.0.0';
  const port = process.env.GRPC_PORT ?? '50055';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'blockchain.v1',
        protoPath: join(
          process.cwd(),
          'proto/blockchain/v1/blockchain_health.proto',
        ),
        url: `${host}:${port}`,
      },
    },
  );

  await app.listen();
}

void bootstrap();
